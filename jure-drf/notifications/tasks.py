"""
Periodic tasks. Celery can wrap these; otherwise use management commands or cron.

Schedule `send_daily_deadline_reminders` daily at 07:00 Africa/Casablanca, e.g.:

  python manage.py send_daily_deadline_reminders
"""

from notifications.daily_reminders import send_daily_deadline_reminders

__all__ = ["send_daily_deadline_reminders"]
