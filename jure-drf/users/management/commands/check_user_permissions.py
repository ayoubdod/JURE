"""
Management command to check user permissions and cabinet status.
Usage: python manage.py check_user_permissions <email>
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Check user permissions and cabinet status'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address of the user to check'
        )

    def handle(self, *args, **options):
        email = options['email'].lower().strip()
        
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" does not exist.')
        
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(f'User Information: {user.email}')
        self.stdout.write(f'{"="*60}\n')
        
        # Basic info
        self.stdout.write(f'ID: {user.id}')
        self.stdout.write(f'Name: {user.first_name} {user.last_name}')
        self.stdout.write(f'Email: {user.email}')
        self.stdout.write(f'Phone: {user.phone}')
        self.stdout.write(f'Active: {user.is_active}')
        self.stdout.write(f'Staff: {user.is_staff}')
        self.stdout.write(f'Superuser: {user.is_superuser}')
        
        # Cabinet info
        self.stdout.write(f'\n--- Cabinet Information ---')
        self.stdout.write(f'is_cabinet_member: {user.is_cabinet_member}')
        
        # Check owned cabinet
        owned_cabinet = user.get_owned_cabinet_or_none()
        if owned_cabinet:
            self.stdout.write(
                self.style.SUCCESS(f'[OK] Owns cabinet: {owned_cabinet.trade_name} (ID: {owned_cabinet.id})')
            )
        else:
            self.stdout.write(self.style.WARNING('[NO] Does not own a cabinet'))
        
        # Check cabinet membership
        if user.cabinet:
            self.stdout.write(
                self.style.SUCCESS(f'[OK] Belongs to cabinet: {user.cabinet.trade_name} (ID: {user.cabinet.id})')
            )
        else:
            self.stdout.write(self.style.WARNING('[NO] Does not belong to a cabinet'))
        
        # Check is_cabinet_owner method
        is_owner = user.is_cabinet_owner()
        self.stdout.write(f'\nis_cabinet_owner(): {is_owner}')
        
        # Check permission logic
        self.stdout.write(f'\n--- Permission Checks ---')
        has_cabinet_member = user.is_cabinet_member
        has_cabinet_owner = user.is_cabinet_owner()
        has_cabinet = bool(user.cabinet)
        has_owned_cabinet = bool(owned_cabinet)
        
        self.stdout.write(f'is_cabinet_member: {has_cabinet_member}')
        self.stdout.write(f'is_cabinet_owner(): {has_cabinet_owner}')
        self.stdout.write(f'user.cabinet exists: {has_cabinet}')
        self.stdout.write(f'owned_cabinet exists: {has_owned_cabinet}')
        
        # Final permission result
        can_access = has_cabinet_member or has_cabinet_owner or has_cabinet or has_owned_cabinet
        if can_access:
            self.stdout.write(
                self.style.SUCCESS(f'\n[OK] User CAN access client resources')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f'\n[NO] User CANNOT access client resources')
            )
            self.stdout.write('\nTo fix:')
            if not has_cabinet_member and owned_cabinet:
                self.stdout.write('  Run: python manage.py fix_cabinet_owners')

