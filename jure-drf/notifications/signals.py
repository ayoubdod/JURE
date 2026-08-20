import copy
import logging

from django.core.cache import cache
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from cases.models import Case
from finance.models import Payment
from notifications.constants import NotificationPriority, NotificationType
from notifications.services.notification_service import (
    create_bulk_notifications,
    create_notification,
)
from notifications.utils.cases import case_assigned_user_ids, co_counsel_id_set
from notifications.utils.team import owner_admin_user_ids_for_cabinet
from notifications.utils.urls import (
    appointment_action_url,
    case_action_url,
    finance_action_url,
    profile_action_url,
    task_action_url,
    team_action_url,
)
from tasks.models import Appointment, Task
from users.models import PasswordSetupToken, User

logger = logging.getLogger(__name__)


# ── Task ───────────────────────────────────────────────────────────────


@receiver(pre_save, sender=Task)
def _task_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._notify_prev = None
        return
    try:
        old = Task.objects.get(pk=instance.pk)
        instance._notify_prev = {
            "title": old.title,
            "description": old.description,
            "priority": old.priority,
            "status": old.status,
            "due_date": old.due_date,
            "assigned_to_id": old.assigned_to_id,
            "case_id": old.case_id,
        }
    except Task.DoesNotExist:
        instance._notify_prev = None


@receiver(post_save, sender=Task)
def on_task_saved(sender, instance: Task, created, **kwargs):
    try:
        if created and instance.assigned_to_id:
            create_notification(
                recipient_id=instance.assigned_to_id,
                notification_type=NotificationType.TASK_ASSIGNED,
                title="Nouvelle tâche assignée",
                message=f'La tâche "{instance.title}" vous a été assignée.',
                related_task_id=instance.id,
                related_case_id=instance.case_id,
                action_url=task_action_url(instance.id),
                priority=NotificationPriority.MEDIUM,
            )
            return

        prev = getattr(instance, "_notify_prev", None)
        if not prev:
            return

        if prev.get("assigned_to_id") != instance.assigned_to_id and instance.assigned_to_id:
            create_notification(
                recipient_id=instance.assigned_to_id,
                notification_type=NotificationType.TASK_ASSIGNED,
                title="Nouvelle tâche assignée",
                message=f'La tâche "{instance.title}" vous a été assignée.',
                related_task_id=instance.id,
                related_case_id=instance.case_id,
                action_url=task_action_url(instance.id),
                priority=NotificationPriority.MEDIUM,
            )

        if (
            instance.assigned_to_id
            and prev.get("status") != instance.status
            and instance.status == Task.TaskStatus.DONE
        ):
            # Task model has no created_by; skip TASK_COMPLETED per data model.
            pass
        elif instance.assigned_to_id:
            assignment_changed = prev.get("assigned_to_id") != instance.assigned_to_id
            status_changed = prev.get("status") != instance.status
            other_changed = any(
                (
                    prev.get("title") != instance.title,
                    prev.get("description") != instance.description,
                    prev.get("priority") != instance.priority,
                    prev.get("due_date") != instance.due_date,
                    prev.get("case_id") != instance.case_id,
                )
            )
            if not assignment_changed and (other_changed or (status_changed and instance.status != Task.TaskStatus.DONE)):
                create_notification(
                    recipient_id=instance.assigned_to_id,
                    notification_type=NotificationType.TASK_UPDATED,
                    title="Tâche mise à jour",
                    message=f'La tâche "{instance.title}" a été modifiée.',
                    related_task_id=instance.id,
                    related_case_id=instance.case_id,
                    action_url=task_action_url(instance.id),
                    priority=NotificationPriority.MEDIUM,
                )
    except Exception:
        logger.exception("on_task_saved notification failed")


# ── Case ───────────────────────────────────────────────────────────────


@receiver(pre_save, sender=Case)
def _case_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._notify_prev = None
        return
    try:
        old = Case.objects.get(pk=instance.pk)
        instance._notify_prev = {
            "assigned_to_id": old.assigned_to_id,
            "status": old.status,
            "case_specific_data": copy.deepcopy(old.case_specific_data or {}),
            "title": old.title,
            "reference": old.reference,
        }
    except Case.DoesNotExist:
        instance._notify_prev = None


@receiver(post_save, sender=Case)
def on_case_saved(sender, instance: Case, created, **kwargs):
    try:
        if created:
            return
        prev = getattr(instance, "_notify_prev", None)
        if not prev:
            return

        old_co = co_counsel_id_set(prev.get("case_specific_data"))
        new_co = co_counsel_id_set(instance.case_specific_data)
        old_a = prev.get("assigned_to_id")
        new_a = instance.assigned_to_id

        added: set[int] = set()
        if new_a and new_a != old_a:
            added.add(new_a)
        added |= new_co - old_co

        for uid in added:
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.CASE_ASSIGNED,
                title="Dossier assigné",
                message=f'Vous avez été assigné au dossier #{instance.reference} — {instance.title}.',
                priority=NotificationPriority.MEDIUM,
                related_case_id=instance.id,
                action_url=case_action_url(instance),
            )

        recipients = case_assigned_user_ids(instance)
        if not recipients:
            return

        if prev.get("status") != instance.status:
            create_bulk_notifications(
                recipients,
                notification_type=NotificationType.CASE_STATUS_UPDATED,
                title=f"Statut du dossier #{instance.reference} modifié",
                message=(
                    f'Le dossier "{instance.title}" est passé au statut '
                    f"{instance.get_status_display()}."
                ),
                priority=NotificationPriority.HIGH,
                related_case_id=instance.id,
                action_url=case_action_url(instance),
            )
            return

        assignment_only = (
            prev.get("title") == instance.title
            and prev.get("case_specific_data") == (instance.case_specific_data or {})
            and ((old_a != new_a) or (old_co != new_co))
        )
        if assignment_only:
            return

        meaningful = any(
            (
                prev.get("title") != instance.title,
                prev.get("case_specific_data") != (instance.case_specific_data or {}),
            )
        )
        if not meaningful:
            return

        cache_key = f"notif:case_updated:{instance.id}"
        if cache.get(cache_key):
            return
        cache.set(cache_key, 1, 3600)

        create_bulk_notifications(
            recipients,
            notification_type=NotificationType.CASE_UPDATED,
            title="Dossier mis à jour",
            message=f'Le dossier #{instance.reference} "{instance.title}" a été modifié.',
            priority=NotificationPriority.MEDIUM,
            related_case_id=instance.id,
            action_url=case_action_url(instance),
        )
    except Exception:
        logger.exception("on_case_saved notification failed")


# ── Appointment ────────────────────────────────────────────────────────


@receiver(post_save, sender=Appointment)
def on_appointment_saved(sender, instance: Appointment, created, **kwargs):
    try:
        uid = instance.created_by_id
        if not uid:
            return
        if created:
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.APPOINTMENT_CREATED,
                title="Nouveau rendez-vous",
                message=f'Le rendez-vous "{instance.title}" a été créé.',
                related_appointment_id=instance.id,
                related_case_id=instance.case_id,
                action_url=appointment_action_url(instance.id),
                priority=NotificationPriority.MEDIUM,
            )
        else:
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.APPOINTMENT_UPDATED,
                title="Rendez-vous modifié",
                message=f'Le rendez-vous "{instance.title}" a été mis à jour.',
                related_appointment_id=instance.id,
                related_case_id=instance.case_id,
                action_url=appointment_action_url(instance.id),
                priority=NotificationPriority.MEDIUM,
            )
    except Exception:
        logger.exception("on_appointment_saved notification failed")


# ── User / team ────────────────────────────────────────────────────────


@receiver(pre_save, sender=User)
def _user_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._notify_prev = None
        return
    try:
        old = User.objects.get(pk=instance.pk)
        instance._notify_prev = {
            "role": old.role,
            "first_name": old.first_name,
            "last_name": old.last_name,
            "email": old.email,
            "phone": str(old.phone) if old.phone else "",
            "address": old.address or "",
        }
    except User.DoesNotExist:
        instance._notify_prev = None


@receiver(post_save, sender=User)
def on_user_saved(sender, instance: User, created, **kwargs):
    try:
        if created and instance.is_cabinet_member and instance.cabinet_id:
            cab = instance.cabinet
            ids = owner_admin_user_ids_for_cabinet(cab)
            ids = [i for i in ids if i != instance.id]
            if ids:
                create_bulk_notifications(
                    ids,
                    notification_type=NotificationType.MEMBER_ADDED,
                    title="Nouveau membre ajouté",
                    message=(
                        f"{instance.first_name} {instance.last_name} a rejoint le cabinet "
                        f"en tant que {instance.get_role_display() if instance.role else 'membre'}."
                    ),
                    priority=NotificationPriority.MEDIUM,
                    related_user_id=instance.id,
                    action_url=profile_action_url(instance.id),
                    send_email=True,
                )
            return

        prev = getattr(instance, "_notify_prev", None)
        if not prev:
            return

        if prev.get("role") != instance.role and instance.role is not None:
            old_r = prev.get("role") or "—"
            create_notification(
                recipient_id=instance.id,
                notification_type=NotificationType.ROLE_CHANGED,
                title="Votre rôle a été modifié",
                message=f"Votre rôle a été changé de {old_r} à {instance.role}.",
                priority=NotificationPriority.URGENT,
                related_user_id=None,
                action_url=profile_action_url(),
            )

        profile_changed = any(
            (
                prev.get("first_name") != instance.first_name,
                prev.get("last_name") != instance.last_name,
                prev.get("email") != instance.email,
                prev.get("phone") != (str(instance.phone) if instance.phone else ""),
                prev.get("address") != (instance.address or ""),
            )
        )
        if profile_changed:
            create_notification(
                recipient_id=instance.id,
                notification_type=NotificationType.PROFILE_UPDATED,
                title="Votre profil a été mis à jour",
                message="Les informations de votre profil ont été modifiées.",
                priority=NotificationPriority.LOW,
                action_url=profile_action_url(),
            )
    except Exception:
        logger.exception("on_user_saved notification failed")


@receiver(pre_save, sender=PasswordSetupToken)
def _token_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._used_prev = None
        return
    try:
        old = PasswordSetupToken.objects.get(pk=instance.pk)
        instance._used_prev = old.used_at
    except PasswordSetupToken.DoesNotExist:
        instance._used_prev = None


@receiver(post_save, sender=PasswordSetupToken)
def on_invitation_token_saved(sender, instance: PasswordSetupToken, created, **kwargs):
    try:
        prev = getattr(instance, "_used_prev", None)
        if prev is None and instance.used_at is not None:
            user = instance.user
            cab = user.cabinet or getattr(user, "cabinet_creator", None)
            if not cab:
                return
            ids = owner_admin_user_ids_for_cabinet(cab)
            ids = [i for i in ids if i != user.id]
            if ids:
                create_bulk_notifications(
                    ids,
                    notification_type=NotificationType.INVITATION_ACCEPTED,
                    title="Invitation acceptée",
                    message=f"{user.first_name} {user.last_name} a accepté son invitation.",
                    priority=NotificationPriority.MEDIUM,
                    related_user_id=user.id,
                    action_url=team_action_url(),
                )
    except Exception:
        logger.exception("on_invitation_token_saved notification failed")


# ── Payment ──────────────────────────────────────────────────────────────


@receiver(post_save, sender=Payment)
def on_payment_created(sender, instance: Payment, created, **kwargs):
    try:
        if not created:
            return
        case = instance.case
        cab = case.cabinet if case else None
        if not cab:
            return
        ids = owner_admin_user_ids_for_cabinet(cab)
        if not ids:
            return
        create_bulk_notifications(
            ids,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Paiement reçu",
            message=(
                f"Un paiement de {instance.amount} MAD a été enregistré pour le dossier #{case.reference}."
            ),
            priority=NotificationPriority.HIGH,
            related_case_id=case.id,
            action_url=finance_action_url(),
        )
    except Exception:
        logger.exception("on_payment_created notification failed")
