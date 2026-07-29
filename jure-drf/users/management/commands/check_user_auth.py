"""
Management command to check user authentication details.
Usage: python manage.py check_user_auth <email_or_phone>
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

User = get_user_model()


class Command(BaseCommand):
    help = 'Check user authentication details and test login'

    def add_arguments(self, parser):
        parser.add_argument(
            'identifier',
            type=str,
            help='Email address or phone number to check'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password to test authentication (optional)'
        )

    def handle(self, *args, **options):
        identifier = options['identifier'].strip()
        password = options.get('password')
        
        self.stdout.write(f'Checking user: {identifier}\n')
        
        # Find user by email
        users_by_email = User.objects.filter(email__iexact=identifier.lower())
        if users_by_email.exists():
            self.stdout.write(f'Found {users_by_email.count()} user(s) by email:')
            for user in users_by_email:
                self.stdout.write(f'  - ID: {user.id}')
                self.stdout.write(f'    Email: {user.email}')
                self.stdout.write(f'    Phone: {user.phone}')
                self.stdout.write(f'    Active: {user.is_active}')
                self.stdout.write(f'    Staff: {user.is_staff}')
                self.stdout.write(f'    Superuser: {user.is_superuser}')
                self.stdout.write(f'    Has password: {bool(user.password)}')
                
                # Check email verification
                email_verified = user.emailaddress_set.filter(
                    email=user.email, 
                    verified=True
                ).exists()
                self.stdout.write(f'    Email verified: {email_verified}')
                
                # Test password if provided
                if password:
                    if user.check_password(password):
                        self.stdout.write(
                            self.style.SUCCESS('    ✓ Password is correct')
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR('    ✗ Password is incorrect')
                        )
                self.stdout.write('')
        
        # Find user by phone
        users_by_phone = User.objects.filter(phone=identifier)
        if users_by_phone.exists():
            self.stdout.write(f'Found {users_by_phone.count()} user(s) by phone:')
            for user in users_by_phone:
                self.stdout.write(f'  - ID: {user.id}')
                self.stdout.write(f'    Email: {user.email}')
                self.stdout.write(f'    Phone: {user.phone}')
                self.stdout.write(f'    Active: {user.is_active}')
                self.stdout.write(f'    Phone verified: {user.phone_verified}')
                
                # Test password if provided
                if password:
                    if user.check_password(password):
                        self.stdout.write(
                            self.style.SUCCESS('    ✓ Password is correct')
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR('    ✗ Password is incorrect')
                        )
                self.stdout.write('')
        
        if not users_by_email.exists() and not users_by_phone.exists():
            self.stdout.write(
                self.style.WARNING('No user found with this identifier.')
            )
            return
        
        # Test authentication if password provided
        if password:
            self.stdout.write('Testing authentication...')
            user = authenticate(
                request=None,
                email=identifier if '@' in identifier else None,
                username=identifier if '@' not in identifier else None,
                password=password
            )
            
            if user:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Authentication successful! User ID: {user.id}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('✗ Authentication failed!')
                )
                self.stdout.write('\nPossible reasons:')
                self.stdout.write('  - Password is incorrect')
                self.stdout.write('  - User is inactive')
                self.stdout.write('  - Email is not verified (if mandatory)')
                self.stdout.write('  - Phone is not verified (if required)')




