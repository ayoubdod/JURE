"""
Scheduled reminder logic (tasks, appointments, cases, invoices).
Run daily at 07:00 Africa/Casablanca via management command or cron.
"""

from __future__ import annotations

import logging
from datetime import date

from django.utils import timezone

from cases.models import Case
from finance.models import Invoice
from notifications.constants import NotificationPriority, NotificationType
from notifications.models import Notification
from notifications.services.notification_service import create_notification
from notifications.utils.cases import case_assigned_user_ids
from notifications.utils.dates import MOROCCO_TZ, parse_iso_date, today_in_morocco
from notifications.utils.team import owner_admin_user_ids_for_cabinet
from tasks.models import Appointment, Task

logger = logging.getLogger(__name__)


def _dedupe_today(
    recipient_id: int,
    ntype: str,
    *,
    task=None,
    case=None,
    appointment=None,
) -> bool:
    """Return True if a matching notification already exists for today (skip creating)."""
    today = timezone.now().date()
    q = Notification.objects.filter(
        recipient_id=recipient_id,
        notification_type=ntype,
        created_at__date=today,
    )
    if task is not None:
        q = q.filter(related_task=task)
    elif case is not None:
        q = q.filter(related_case=case)
    elif appointment is not None:
        q = q.filter(related_appointment=appointment)
    return q.exists()


def send_daily_deadline_reminders() -> None:
    today = today_in_morocco()
    in_3 = _add_days(today, 3)

    _remind_tasks_3d(today, in_3)
    _remind_tasks_overdue(today)
    _remind_appointments_3d(today, in_3)
    _remind_appointments_today(today)
    _remind_litigation_hearings(today, in_3)
    _remind_litigation_key_deadlines(today, in_3)
    _remind_administrative_due_dates(today, in_3)
    _remind_calculated_legal_deadlines(today)
    _remind_invoices_overdue(today)


def _add_days(d, n):
    from datetime import timedelta

    return d + timedelta(days=n)


def _remind_tasks_3d(today, in_3) -> None:
    qs = Task.objects.filter(
        due_date=in_3,
        assigned_to__isnull=False,
    ).exclude(status__in=[Task.TaskStatus.DONE, Task.TaskStatus.CANCELLED])
    for task in qs.select_related("assigned_to", "case"):
        uid = task.assigned_to_id
        if _dedupe_today(uid, NotificationType.TASK_DUE_REMINDER_3DAYS, task=task):
            continue
        create_notification(
            recipient_id=uid,
            notification_type=NotificationType.TASK_DUE_REMINDER_3DAYS,
            title="Tâche à échéance dans 3 jours",
            message=f'La tâche "{task.title}" est due le {task.due_date}.',
            priority=NotificationPriority.MEDIUM,
            related_task_id=task.id,
            related_case_id=task.case_id,
            action_url="/dashboard/tasks",
            send_email=True,
        )


def _remind_tasks_overdue(today) -> None:
    qs = Task.objects.filter(
        due_date__lt=today,
        assigned_to__isnull=False,
    ).exclude(status__in=[Task.TaskStatus.DONE, Task.TaskStatus.CANCELLED])
    for task in qs.select_related("assigned_to"):
        uid = task.assigned_to_id
        if _dedupe_today(uid, NotificationType.TASK_OVERDUE, task=task):
            continue
        create_notification(
            recipient_id=uid,
            notification_type=NotificationType.TASK_OVERDUE,
            title="Tâche en retard",
            message=f'La tâche "{task.title}" est en retard (échéance {task.due_date}).',
            priority=NotificationPriority.URGENT,
            related_task_id=task.id,
            related_case_id=task.case_id,
            action_url="/dashboard/tasks",
            send_email=True,
        )


def _appointment_recipient_ids(appt: Appointment) -> list[int]:
    ids: list[int] = []
    if appt.created_by_id:
        ids.append(appt.created_by_id)
    if appt.client_id:
        from cases.models import Case as CaseModel

        c = (
            CaseModel.objects.filter(client_id=appt.client_id, cabinet_id=appt.cabinet_id)
            .exclude(status=CaseModel.CaseStatus.CANCELLED)
            .first()
        )
        if c and c.assigned_to_id:
            ids.append(c.assigned_to_id)
    out: list[int] = []
    seen = set()
    for i in ids:
        if i and i not in seen:
            seen.add(i)
            out.append(i)
    return out


def _morocco_date(dt) -> date:
    if dt is None:
        return date.min
    return dt.astimezone(MOROCCO_TZ).date()


def _remind_appointments_3d(today, in_3) -> None:
    for appt in Appointment.objects.filter(status=Appointment.Status.SCHEDULED):
        if _morocco_date(appt.start_at) != in_3:
            continue
        for uid in _appointment_recipient_ids(appt):
            if _dedupe_today(uid, NotificationType.APPOINTMENT_REMINDER_3DAYS, appointment=appt):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.APPOINTMENT_REMINDER_3DAYS,
                title="Rendez-vous dans 3 jours",
                message=f'Le rendez-vous "{appt.title}" a lieu dans 3 jours.',
                priority=NotificationPriority.MEDIUM,
                related_appointment_id=appt.id,
                related_case_id=appt.case_id,
                action_url="/dashboard/calendar",
                send_email=True,
            )


def _remind_appointments_today(today) -> None:
    for appt in Appointment.objects.filter(status=Appointment.Status.SCHEDULED):
        if _morocco_date(appt.start_at) != today:
            continue
        for uid in _appointment_recipient_ids(appt):
            if _dedupe_today(uid, NotificationType.APPOINTMENT_DUE_TODAY, appointment=appt):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.APPOINTMENT_DUE_TODAY,
                title="Rendez-vous aujourd'hui",
                message=f'Le rendez-vous "{appt.title}" est prévu aujourd\'hui.',
                priority=NotificationPriority.HIGH,
                related_appointment_id=appt.id,
                related_case_id=appt.case_id,
                action_url="/dashboard/calendar",
                send_email=True,
            )


def _litigation_next_hearing_date(case) -> date | None:
    data = case.case_specific_data or {}
    return parse_iso_date(data.get("nextHearingDate") or data.get("next_hearing_date"))


def _remind_litigation_hearings(today, in_3) -> None:
    qs = Case.objects.filter(case_type=Case.CaseType.LITIGATION).exclude(
        status__in=[Case.CaseStatus.CANCELLED, Case.CaseStatus.ARCHIVED]
    )
    for case in qs:
        nh = _litigation_next_hearing_date(case)
        if not nh:
            continue
        lead_id = case.assigned_to_id
        if not lead_id:
            continue
        if nh == in_3:
            if _dedupe_today(lead_id, NotificationType.CASE_HEARING_3DAYS, case=case):
                continue
            create_notification(
                recipient_id=lead_id,
                notification_type=NotificationType.CASE_HEARING_3DAYS,
                title="Audience dans 3 jours",
                message=f'L\'audience pour le dossier #{case.reference} est dans 3 jours.',
                priority=NotificationPriority.HIGH,
                related_case_id=case.id,
                action_url=f"/dashboard/cases?case={case.reference}",
                send_email=True,
            )
        if nh == today:
            if _dedupe_today(lead_id, NotificationType.CASE_HEARING_TODAY, case=case):
                continue
            create_notification(
                recipient_id=lead_id,
                notification_type=NotificationType.CASE_HEARING_TODAY,
                title="Audience aujourd'hui",
                message=f'L\'audience pour le dossier #{case.reference} est aujourd\'hui.',
                priority=NotificationPriority.URGENT,
                related_case_id=case.id,
                action_url=f"/dashboard/cases?case={case.reference}",
                send_email=True,
            )


def _remind_litigation_key_deadlines(today, in_3) -> None:
    from notifications.utils.cases import key_deadline_dates

    qs = Case.objects.filter(case_type=Case.CaseType.LITIGATION).exclude(
        status__in=[Case.CaseStatus.CANCELLED, Case.CaseStatus.ARCHIVED]
    )
    for case in qs:
        for _entry, d in key_deadline_dates(case):
            if d not in (in_3, today):
                continue
            ntype = (
                NotificationType.CASE_DEADLINE_3DAYS
                if d == in_3
                else NotificationType.CASE_DEADLINE_TODAY
            )
            title = (
                "Échéance clé dans 3 jours"
                if d == in_3
                else "Échéance clé aujourd'hui"
            )
            pri = NotificationPriority.HIGH if d == in_3 else NotificationPriority.URGENT
            for uid in case_assigned_user_ids(case):
                if _dedupe_today(uid, ntype, case=case):
                    continue
                create_notification(
                    recipient_id=uid,
                    notification_type=ntype,
                    title=title,
                    message=f"Échéance pour le dossier #{case.reference} — {case.title}.",
                    priority=pri,
                    related_case_id=case.id,
                    action_url=f"/dashboard/cases?case={case.reference}",
                    send_email=True,
                )


def _administrative_due_date(case) -> date | None:
    data = case.case_specific_data or {}
    return parse_iso_date(data.get("dueDate") or data.get("due_date"))


def _remind_administrative_due_dates(today, in_3) -> None:
    qs = Case.objects.filter(case_type=Case.CaseType.ADMINISTRATIVE).exclude(
        status__in=[Case.CaseStatus.CANCELLED, Case.CaseStatus.ARCHIVED]
    )
    for case in qs:
        dd = _administrative_due_date(case)
        if not dd or not case.assigned_to_id:
            continue
        uid = case.assigned_to_id
        if dd == in_3:
            if _dedupe_today(uid, NotificationType.CASE_DEADLINE_3DAYS, case=case):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.CASE_DEADLINE_3DAYS,
                title="Échéance administrative dans 3 jours",
                message=f'Le dossier administratif #{case.reference} a une échéance dans 3 jours.',
                priority=NotificationPriority.HIGH,
                related_case_id=case.id,
                action_url=f"/dashboard/cases?case={case.reference}",
                send_email=True,
            )
        if dd == today:
            if _dedupe_today(uid, NotificationType.CASE_DEADLINE_TODAY, case=case):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.CASE_DEADLINE_TODAY,
                title="Échéance administrative aujourd'hui",
                message=f'Le dossier administratif #{case.reference} a une échéance aujourd\'hui.',
                priority=NotificationPriority.URGENT,
                related_case_id=case.id,
                action_url=f"/dashboard/cases?case={case.reference}",
                send_email=True,
            )


def _remind_calculated_legal_deadlines(today: date) -> None:
    """Fire user-configured reminders for persisted CalculatedDeadline rows."""
    try:
        from legal_deadlines.models import CalculatedDeadline, DeadlineReminder
    except Exception:
        return

    qs = (
        DeadlineReminder.objects.filter(
            deadline__status__in=[
                CalculatedDeadline.Status.UPCOMING,
                CalculatedDeadline.Status.DUE_SOON,
                CalculatedDeadline.Status.DUE_TODAY,
                CalculatedDeadline.Status.OVERDUE,
            ],
            notified_at__isnull=True,
        )
        .select_related("deadline", "deadline__case", "deadline__rule", "deadline__created_by")
    )
    for reminder in qs:
        deadline = reminder.deadline
        target = _add_days(deadline.final_deadline, -int(reminder.days_before))
        if target != today:
            continue
        case = deadline.case
        recipients = set(case_assigned_user_ids(case))
        if deadline.created_by_id:
            recipients.add(deadline.created_by_id)
        ntype = (
            NotificationType.CASE_DEADLINE_TODAY
            if reminder.days_before == 0
            else NotificationType.CASE_DEADLINE_3DAYS
        )
        label = deadline.rule.name if deadline.rule_id else "Legal deadline"
        for uid in recipients:
            if not uid:
                continue
            if _dedupe_today(uid, ntype, case=case):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=ntype,
                title="Legal deadline reminder" if reminder.days_before else "Legal deadline today",
                message=(
                    f"{label} for matter #{case.reference} "
                    f"{'is due today' if reminder.days_before == 0 else f'is due in {reminder.days_before} day(s)'} "
                    f"({deadline.final_deadline.isoformat()})."
                ),
                priority=NotificationPriority.URGENT if reminder.days_before == 0 else NotificationPriority.HIGH,
                related_case_id=case.id,
                action_url=f"/dashboard/cases?case={case.reference}",
                send_email=True,
            )
        reminder.notified_at = timezone.now()
        reminder.save(update_fields=["notified_at"])


def _remind_invoices_overdue(today) -> None:
    qs = Invoice.objects.filter(due_date__lt=today).exclude(
        status__in=[Invoice.Status.PAID, Invoice.Status.CANCELLED]
    )
    for inv in qs.select_related("cabinet", "case"):
        cab = inv.cabinet
        for uid in owner_admin_user_ids_for_cabinet(cab):
            if _dedupe_today(uid, NotificationType.INVOICE_OVERDUE, case=inv.case):
                continue
            create_notification(
                recipient_id=uid,
                notification_type=NotificationType.INVOICE_OVERDUE,
                title="Facture en retard",
                message=f"La facture {inv.invoice_number} pour le dossier #{inv.case.reference} est en retard.",
                priority=NotificationPriority.HIGH,
                related_case_id=inv.case_id,
                action_url="/dashboard/finance",
                send_email=True,
            )
