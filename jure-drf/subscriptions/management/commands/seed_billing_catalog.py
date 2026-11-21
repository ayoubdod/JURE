from django.core.management.base import BaseCommand

from subscriptions.services.catalog import seed_catalog


class Command(BaseCommand):
    help = "Create or update the JURE plan catalogue and JURIA credit weights."

    def handle(self, *args, **options):
        seed_catalog()
        self.stdout.write(self.style.SUCCESS("Billing catalogue is up to date."))
