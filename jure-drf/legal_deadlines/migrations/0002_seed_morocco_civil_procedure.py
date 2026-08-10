# Generated manually — seeds Morocco civil procedure rules after schema migration.
from django.db import migrations


def seed_forward(apps, schema_editor):
    from legal_deadlines.seed import seed_all

    seed_all()


def seed_reverse(apps, schema_editor):
    DeadlineRule = apps.get_model("legal_deadlines", "DeadlineRule")
    LegalSource = apps.get_model("legal_deadlines", "LegalSource")
    LegalHoliday = apps.get_model("legal_deadlines", "LegalHoliday")
    DeadlineRule.objects.filter(jurisdiction="MA", legal_domain="civil_procedure").delete()
    LegalHoliday.objects.filter(jurisdiction="MA").delete()
    LegalSource.objects.filter(jurisdiction="MA", law_number__in=["1-74-447", "58.25"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("legal_deadlines", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
