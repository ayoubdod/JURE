# case_calendar/constants.py
"""Calendar feed source type identifiers and query-param mapping."""

ST_TASK = "TASK"
ST_APPOINTMENT = "APPOINTMENT"
ST_CASE_DEADLINE = "CASE_DEADLINE"
ST_CASE_DUE_DATE = "CASE_DUE_DATE"
ST_CONSULTATION_DATE = "CONSULTATION_DATE"

TYPE_MAP = {
    "task": ST_TASK,
    "appointment": ST_APPOINTMENT,
    "case_deadline": ST_CASE_DEADLINE,
    "case_due": ST_CASE_DUE_DATE,
    "consultation_date": ST_CONSULTATION_DATE,
}
