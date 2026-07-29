"""
Management command to fix cabinet owners who appear as clients.
This marks all cabinet owners as cabinet members.
Usage: python manage.py fix_cabinet_owners
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from cabinets.models import Cabinet

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix cabinet owners to mark them as cabinet members'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all cabinets
        cabinets = Cabinet.objects.all()
        
        if not cabinets.exists():
            self.stdout.write(
                self.style.WARNING('No cabinets found.')
            )
            return
        
        fixed_count = 0
        
        for cabinet in cabinets:
            owner = cabinet.owner
            
            if not owner:
                continue
            
            # Check if owner needs fixing
            needs_fix = (
                owner.cabinet == cabinet and 
                not owner.is_cabinet_member
            )
            
            if needs_fix:
                if dry_run:
                    self.stdout.write(
                        f'Would fix: Cabinet "{cabinet.trade_name}" - Owner: {owner.email} '
                        f'(ID: {owner.id})'
                    )
                else:
                    owner.is_cabinet_member = True
                    owner.save(update_fields=['is_cabinet_member'])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Fixed: Cabinet "{cabinet.trade_name}" - Owner: {owner.email} '
                            f'(ID: {owner.id})'
                        )
                    )
                fixed_count += 1
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\nWould fix {fixed_count} cabinet owner(s). Run without --dry-run to apply changes.'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Fixed {fixed_count} cabinet owner(s).'
                )
            )




