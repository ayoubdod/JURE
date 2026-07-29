"""
Diagnose forgot-password flow.
Usage: python manage.py test_password_reset user@example.com

Runs the password reset flow and prints:
- Whether a user was found
- The exact email content (using console backend, so it prints to terminal)
- The reset link that would be sent

Use this to verify the backend sends the correct link.
"""
from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.conf import settings


class Command(BaseCommand):
    help = "Test password reset flow and show the email that would be sent"

    def add_arguments(self, parser):
        parser.add_argument( "email", type=str, help="Email to test with" )
        parser.add_argument(
            "--no-email",
            action="store_true",
            help="Only show URL, don't actually send",
        )
        parser.add_argument(
            "--console",
            action="store_true",
            help="Use console backend so email content prints to terminal",
        )

    def handle(self, *args, **options):
        email = options["email"].strip()
        no_email = options["no_email"]
        use_console = options["console"]

        if use_console:
            self.stdout.write("Using console backend (email will print below)")
            self.stdout.write("")

        from allauth.account.utils import filter_users_by_email
        from users.models import User

        users = list(filter_users_by_email(email, is_active=True))
        if not users:
            self.stdout.write(
                self.style.WARNING(
                    f"No active user found with email: {email}"
                )
            )
            self.stdout.write(
                "The API will still return 200 (security), but no email is sent."
            )
            return

        user = users[0]
        self.stdout.write(f"User found: {user.email} (pk={user.pk})")

        from allauth.account.forms import default_token_generator
        from allauth.account.utils import user_pk_to_url_str
        from users.serializers import default_url_generator

        temp_key = default_token_generator.make_token(user)
        rf = RequestFactory()
        request = rf.post("/api/v1/dj-rest-auth/password/reset/", {"email": email})
        request.META["HTTP_HOST"] = "localhost:8000"

        url = default_url_generator(request, user, temp_key)
        uid = user_pk_to_url_str(user)

        self.stdout.write("")
        self.stdout.write("Reset link that would be sent:")
        self.stdout.write(self.style.SUCCESS(url))
        self.stdout.write("")
        self.stdout.write("To confirm reset, POST to /api/v1/dj-rest-auth/password/reset/confirm/")
        self.stdout.write(f"  uid: {uid}")
        self.stdout.write(f"  token: {temp_key[:20]}...")
        self.stdout.write("")

        if no_email:
            self.stdout.write("Skipping send (--no-email)")
            return

        # Actually run the flow
        from users.serializers import PasswordResetSerializer

        if use_console:
            from django.test.utils import override_settings
            with override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend"):
                serializer = PasswordResetSerializer(
                    data={"email": email},
                    context={"request": request},
                )
                if serializer.is_valid():
                    serializer.save()
                    self.stdout.write(self.style.SUCCESS("Password reset email sent (see above)."))
                else:
                    self.stdout.write(self.style.ERROR(f"Errors: {serializer.errors}"))
            return

        serializer = PasswordResetSerializer(
            data={"email": email},
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            self.stdout.write(self.style.SUCCESS("Password reset email sent."))
        else:
            self.stdout.write(self.style.ERROR(f"Errors: {serializer.errors}"))
