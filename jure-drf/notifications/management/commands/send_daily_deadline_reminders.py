from django.core.management.base import BaseCommand

from notifications.daily_reminders import send_daily_deadline_reminders


class Command(BaseCommand):
    help = (
        "Send daily task, appointment, case, invoice, and unread-message reminder "
        "notifications (run at 07:00 Africa/Casablanca)."
    )

    def handle(self, *args, **options):
        send_daily_deadline_reminders()
        self.stdout.write(self.style.SUCCESS("Daily deadline reminders sent."))
