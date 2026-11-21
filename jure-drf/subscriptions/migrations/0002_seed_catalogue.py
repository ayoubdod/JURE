from decimal import Decimal

from django.db import migrations


def seed_catalogue(apps, schema_editor):
    from subscriptions.catalog import PLANS, TARIFFS

    Plan = apps.get_model("subscriptions", "Plan")
    CreditTariff = apps.get_model("subscriptions", "CreditTariff")
    for row in PLANS:
        defaults = dict(row)
        code = defaults.pop("code")
        if defaults["monthly_price"] is not None:
            defaults["monthly_price"] = Decimal(defaults["monthly_price"])
        if defaults["annual_price"] is not None:
            defaults["annual_price"] = Decimal(defaults["annual_price"])
        Plan.objects.update_or_create(code=code, defaults=defaults)
    for row in TARIFFS:
        CreditTariff.objects.update_or_create(
            operation=row["operation"],
            defaults={"credits": row["credits"], "is_active": True},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_organisation_subscriptions"),
    ]

    operations = [
        migrations.RunPython(seed_catalogue, migrations.RunPython.noop),
    ]
