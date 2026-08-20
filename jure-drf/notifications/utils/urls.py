"""Canonical frontend paths stored on Notification.action_url."""

from __future__ import annotations

CASE_TYPE_SEGMENT = {
    "CONSULTATION": "consultations",
    "LITIGATION": "litigation",
    "ADMINISTRATIVE": "administrative",
}


def case_action_url(case) -> str:
    segment = CASE_TYPE_SEGMENT.get(getattr(case, "case_type", None), "litigation")
    return f"/dashboard/cases/{segment}/case-{case.id}"


def task_action_url(task_id: int) -> str:
    return f"/dashboard/tasks?task={int(task_id)}"


def appointment_action_url(appointment_id: int) -> str:
    return f"/dashboard/appointments?appointment={int(appointment_id)}"


def conversation_action_url(conversation_id: int | None = None) -> str:
    if conversation_id:
        return f"/dashboard/conversations?selected={int(conversation_id)}"
    return "/dashboard/conversations"


def team_action_url() -> str:
    return "/dashboard/team"


def profile_action_url(user_id: int | None = None) -> str:
    if user_id:
        return f"/dashboard/profile/{int(user_id)}"
    return "/dashboard/profile"


def finance_action_url() -> str:
    return "/dashboard/finance"
