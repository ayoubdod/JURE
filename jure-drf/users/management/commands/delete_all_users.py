"""
Management command to delete all users from the database.
Usage: 
    python manage.py delete_all_users  # Delete all users (with confirmation)
    python manage.py delete_all_users --force  # Skip confirmation
    python manage.py delete_all_users --exclude-superusers  # Keep superusers
    python manage.py delete_all_users --exclude-staff  # Keep staff users
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Delete all users from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt',
        )
        parser.add_argument(
            '--exclude-superusers',
            action='store_true',
            help='Keep superuser accounts',
        )
        parser.add_argument(
            '--exclude-staff',
            action='store_true',
            help='Keep staff accounts',
        )
        parser.add_argument(
            '--exclude-active',
            action='store_true',
            help='Keep active users (delete only inactive)',
        )

    def handle(self, *args, **options):
        # Build queryset based on options
        queryset = User.objects.all()
        
        exclude_info = []
        
        if options['exclude_superusers']:
            queryset = queryset.filter(is_superuser=False)
            exclude_info.append('superusers')
        
        if options['exclude_staff']:
            queryset = queryset.filter(is_staff=False)
            exclude_info.append('staff users')
        
        if options['exclude_active']:
            queryset = queryset.filter(is_active=False)
            exclude_info.append('active users')
        
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING('No users found to delete.')
            )
            return
        
        # Show what will be deleted
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('WARNING: This will delete users from the database!'))
        self.stdout.write('='*60)
        self.stdout.write(f'\nUsers to be deleted: {count}')
        
        if exclude_info:
            self.stdout.write(f'Excluding: {", ".join(exclude_info)}')
        
        # Show some examples
        sample_users = queryset[:5]
        if sample_users.exists():
            self.stdout.write('\nSample users to be deleted:')
            for user in sample_users:
                self.stdout.write(f'  - ID: {user.id}, Email: {user.email}, Name: {user.first_name} {user.last_name}')
            if count > 5:
                self.stdout.write(f'  ... and {count - 5} more')
        
        # Confirmation
        if not options['force']:
            self.stdout.write('\n' + self.style.ERROR('This action cannot be undone!'))
            confirm = input('\nType "DELETE" to confirm: ')
            
            if confirm != 'DELETE':
                self.stdout.write(
                    self.style.WARNING('Operation cancelled.')
                )
                return
        
        # Delete users
        try:
            with transaction.atomic():
                deleted_count = queryset.count()
                queryset.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✓ Successfully deleted {deleted_count} user(s) from the database.'
                    )
                )
        except Exception as e:
            raise CommandError(f'Error deleting users: {str(e)}')




