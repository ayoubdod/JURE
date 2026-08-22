from django.db import migrations


def seed_jurisdictions(apps, schema_editor):
    Jurisdiction = apps.get_model("jurisdictions", "Jurisdiction")
    rows = [
        {
            "code": "MA",
            "name": "Morocco",
            "name_en": "Morocco",
            "name_fr": "Maroc",
            "name_ar": "المغرب",
            "country_code": "MA",
            "legal_system": "civil_law",
            "default_language": "fr",
            "status": "ACTIVE",
        },
        {
            "code": "QA",
            "name": "Qatar",
            "name_en": "Qatar",
            "name_fr": "Qatar",
            "name_ar": "قطر",
            "country_code": "QA",
            "legal_system": "mixed",
            "default_language": "ar",
            "status": "ACTIVE",
        },
    ]
    for row in rows:
        Jurisdiction.objects.update_or_create(code=row["code"], defaults=row)


def unseed_jurisdictions(apps, schema_editor):
    Jurisdiction = apps.get_model("jurisdictions", "Jurisdiction")
    Jurisdiction.objects.filter(code__in=["MA", "QA"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("jurisdictions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_jurisdictions, unseed_jurisdictions),
    ]
