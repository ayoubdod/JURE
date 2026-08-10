from django.core.management.base import BaseCommand

from legal_deadlines.seed import seed_all


class Command(BaseCommand):
    help = "Seed Morocco Civil Procedure legal sources, deadline rules, and holidays."

    def handle(self, *args, **options):
        result = seed_all()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(result['sources'])} sources, "
                f"{len(result['rules'])} rules, "
                f"{len(result['holidays'])} holidays."
            )
        )
