"""
Management command to find and optionally clean duplicate users by email.
Usage: 
    python manage.py find_duplicate_users  # List duplicates
    python manage.py find_duplicate_users --clean  # Remove inactive duplicates
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()


class Command(BaseCommand):
    help = 'Find and optionally clean duplicate users by email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Remove inactive duplicate users (keeps the first active user)',
        )

    def handle(self, *args, **options):
        # Find emails that appear more than once
        duplicate_emails = (
            User.objects.values('email')
            .annotate(count=Count('email'))
            .filter(count__gt=1)
            .values_list('email', flat=True)
        )
        
        if not duplicate_emails:
            self.stdout.write(
                self.style.SUCCESS('No duplicate emails found.')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(
                f'Found {len(duplicate_emails)} email(s) with duplicates:'
            )
        )
        
        total_removed = 0
        
        for email in duplicate_emails:
            users = User.objects.filter(email__iexact=email).order_by('id')
            self.stdout.write(f'\nEmail: {email}')
            self.stdout.write(f'  Found {users.count()} user(s):')
            
            for user in users:
                status = 'ACTIVE' if user.is_active else 'INACTIVE'
                self.stdout.write(
                    f'    - ID: {user.id}, Name: {user.first_name} {user.last_name}, '
                    f'Status: {status}, Created: {user.date_joined}'
                )
            
            if options['clean']:
                # Keep the first active user, or the first user if none are active
                users_list = list(users)
                keep_user = next((u for u in users_list if u.is_active), users_list[0])
                users_to_remove = [u for u in users_list if u.id != keep_user.id]
                
                if users_to_remove:
                    removed_count = len(users_to_remove)
                    for user in users_to_remove:
                        self.stdout.write(
                            self.style.WARNING(f'  Removing user ID {user.id}...')
                        )
                        user.delete()
                    total_removed += removed_count
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  Kept user ID {keep_user.id}, removed {removed_count} duplicate(s)'
                        )
                    )
        
        if options['clean']:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nTotal duplicates removed: {total_removed}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    '\nRun with --clean to remove inactive duplicates (keeps first active user)'
                )
            )




