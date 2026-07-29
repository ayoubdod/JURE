from datetime import datetime, time

from django.contrib.auth.hashers import make_password
from django.db.models import F, Q
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cases.models import Case, CaseSession
from cases.validators import _parse_datetime
from core.utils import get_user_cabinet
from tasks.models import Appointment, Task

from .models import PasswordSetupToken, User


@api_view(["POST"])
@permission_classes([AllowAny])
def setup_password_by_token(request):
    """
    Set password for a team member using their one-time invitation token.
    Body: { "token": "<token>", "password": "<new_password>" }
    Used by the frontend at /setup-password?token=...
    """
    token_value = (request.data.get("token") or "").strip()
    password = request.data.get("password")

    if not token_value:
        return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not password:
        return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PasswordSetupToken.objects.get(token=token_value)
    except PasswordSetupToken.DoesNotExist:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    if not record.is_valid:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    user = record.user

    # Save password directly via QuerySet.update to avoid custom save() side effects
    User.objects.filter(pk=user.pk).update(password=make_password(password))

    # Ensure email is verified so login works (ACCOUNT_EMAIL_VERIFICATION = mandatory)
    from allauth.account.models import EmailAddress
    email_address, _ = EmailAddress.objects.get_or_create(
        user=user,
        email=user.email,
        defaults={"verified": True, "primary": True},
    )
    if not email_address.verified:
        email_address.verified = True
        email_address.primary = True
        email_address.save(update_fields=["verified", "primary"])

    record.used_at = timezone.now()
    record.save(update_fields=["used_at"])

    return Response({"detail": "Password set successfully. You can now sign in."}, status=status.HTTP_200_OK)


def _user_shares_cabinet(request_user: User, target: User) -> bool:
    cab = get_user_cabinet(request_user)
    if not cab:
        return False
    if target.cabinet_id == cab.id:
        return True
    owned = getattr(target, "owned_cabinet", None)
    return bool(owned and owned.id == cab.id)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_workspace(request, pk):
    """Tasks and availability summary for the direct-chat contact panel."""
    target = get_object_or_404(User, pk=pk)
    if not _user_shares_cabinet(request.user, target):
        return Response({"detail": "Not found."}, status=404)

    cab = get_user_cabinet(request.user)
    if not cab:
        return Response({"detail": "Not found."}, status=404)

    now = timezone.now()

    tasks_qs = (
        Task.objects.filter(assigned_to=target, cabinet=cab)
        .exclude(status=Task.TaskStatus.DONE)
        .select_related("case")
        .order_by(F("due_date").asc(nulls_last=True), "id")[:10]
    )

    tasks_out = []
    for t in tasks_qs:
        rc = None
        if t.case_id:
            k = t.case
            rc = {"id": str(k.id), "reference": k.reference, "title": k.title}
        due = t.due_date.isoformat() if t.due_date else None
        est = float(t.estimated_hours) if t.estimated_hours is not None else None
        tasks_out.append(
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": str(t.priority).upper() if t.priority else None,
                "dueDate": due,
                "relatedCase": rc,
                "estimatedHours": est,
            }
        )

    assigned_cases = Case.objects.filter(assigned_to=target, cabinet=cab)
    total_assigned = assigned_cases.count()
    in_progress = assigned_cases.filter(status=Case.CaseStatus.IN_PROGRESS).count()

    urgent = 0
    for c in assigned_cases:
        data = c.case_specific_data or {}
        if c.case_type in (Case.CaseType.LITIGATION, Case.CaseType.ADMINISTRATIVE):
            if str(data.get("priority") or "").upper() == "URGENT":
                urgent += 1
        elif c.case_type == Case.CaseType.CONSULTATION:
            if str(data.get("consultationType") or "").upper() == "URGENT":
                urgent += 1

    if total_assigned <= 3:
        workload = "LOW"
    elif total_assigned <= 6:
        workload = "MEDIUM"
    else:
        workload = "HIGH"

    events: list[tuple] = []

    for t in Task.objects.filter(assigned_to=target, cabinet=cab).exclude(
        status=Task.TaskStatus.DONE
    ):
        if not t.due_date:
            continue
        dt = timezone.make_aware(
            datetime.combine(t.due_date, time.min), timezone.get_current_timezone()
        )
        if dt < now:
            continue
        ref = t.case.reference if t.case_id else None
        events.append((dt, "TASK_DUE", t.title, "Task Due", ref))

    for a in Appointment.objects.filter(cabinet=cab).filter(
        Q(attendees=target) | Q(created_by=target)
    ):
        if not a.start_at or a.start_at < now:
            continue
        ref = a.case.reference if a.case_id else None
        events.append((a.start_at, "APPOINTMENT", a.title, "Appointment", ref))

    for c in assigned_cases:
        data = c.case_specific_data or {}
        ref = c.reference
        if c.case_type == Case.CaseType.CONSULTATION:
            dt = _parse_datetime(data.get("consultationDate"))
            if dt:
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                if dt >= now:
                    events.append((dt, "CONSULTATION", c.title, "Consultation", ref))
        elif c.case_type == Case.CaseType.ADMINISTRATIVE:
            dt = _parse_datetime(data.get("dueDate"))
            if dt:
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                if dt >= now:
                    events.append((dt, "DEADLINE", c.title, "Due Date", ref))
        elif c.case_type == Case.CaseType.LITIGATION:
            field_labels = [
                ("nextHearingDate", "HEARING", "Next Hearing"),
                ("firstHearingDate", "HEARING", "First Hearing"),
                ("statuteOfLimitationsDate", "DEADLINE", "Statute of Limitations"),
            ]
            for field, etype, lbl in field_labels:
                dt = _parse_datetime(data.get(field))
                if not dt:
                    continue
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                if dt < now:
                    continue
                events.append((dt, etype, c.title, lbl, ref))
            kds = data.get("keyDeadlines")
            if isinstance(kds, list):
                for kd in kds:
                    if not isinstance(kd, dict):
                        continue
                    kl = kd.get("label")
                    if not kl or not str(kl).strip():
                        continue
                    dt = _parse_datetime(kd.get("date"))
                    if not dt:
                        continue
                    if timezone.is_naive(dt):
                        dt = timezone.make_aware(dt, timezone.get_current_timezone())
                    if dt < now:
                        continue
                    events.append((dt, "DEADLINE", c.title, str(kl).strip(), ref))

    for sess in CaseSession.objects.filter(case__assigned_to=target, case__cabinet=cab):
        if sess.type != CaseSession.CaseSessionType.HEARING:
            continue
        dt = sess.date
        if not dt:
            continue
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        if dt < now:
            continue
        events.append((dt, "HEARING", sess.case.title, "Next Hearing", sess.case.reference))

    events.sort(key=lambda x: x[0])
    upcoming = [
        {
            "type": typ,
            "title": title,
            "date": dt.isoformat(),
            "label": label,
            "caseReference": cref,
        }
        for dt, typ, title, label, cref in events[:5]
    ]

    return Response(
        {
            "tasks": tasks_out,
            "availability": {
                "totalAssigned": total_assigned,
                "inProgress": in_progress,
                "urgent": urgent,
                "upcomingEvents": upcoming,
                "workloadLevel": workload,
            },
        }
    )
