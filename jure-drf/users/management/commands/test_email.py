"""
Test email (SMTP) configuration.
Usage: python manage.py test_email recipient@example.com
Prints the exact error if sending fails (e.g. Gmail 535 auth).
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = "Send a test email to check SMTP configuration"

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            help="Recipient email address",
        )

    def handle(self, *args, **options):
        to = options["email"].strip()
        self.stdout.write(f"Backend: {getattr(settings, 'EMAIL_BACKEND', '?')}")
        self.stdout.write(f"Host: {getattr(settings, 'EMAIL_HOST', '?')}:{getattr(settings, 'EMAIL_PORT', '?')}")
        self.stdout.write(f"User: {getattr(settings, 'EMAIL_HOST_USER', '?')}")
        self.stdout.write("Sending test email...")
        try:
            send_mail(
                subject="Jure test email",
                message="If you receive this, SMTP is working.",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost"),
                recipient_list=[to],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS("Email sent successfully."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed: {e}"))
            self.stdout.write(
                "For Gmail: use an App Password (no spaces), port 587, and ensure 2-Step Verification is on."
            )
