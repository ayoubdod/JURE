# Generated manually for single concurrent session support.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0018_finance_module"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="session_version",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Bumped on login to invalidate older access/refresh tokens.",
                verbose_name="session version",
            ),
        ),
    ]
