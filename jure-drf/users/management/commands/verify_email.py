"""
Management command to verify a user's email address.
Usage: python manage.py verify_email <email>
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress

User = get_user_model()


class Command(BaseCommand):
    help = 'Verify a user\'s email address manually'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address to verify'
        )

    def handle(self, *args, **options):
        email = options['email'].lower().strip()
        
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" does not exist.')
        
        # Get or create EmailAddress for this user
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )
        
        if not email_address.verified:
            email_address.verified = True
            email_address.primary = True
            email_address.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully verified email "{email}" for user "{user.email}"'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Email "{email}" is already verified for user "{user.email}"'
                )
            )




