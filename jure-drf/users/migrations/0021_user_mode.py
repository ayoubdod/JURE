from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0020_user_last_seen_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="mode",
            field=models.CharField(
                choices=[
                    ("AVAILABLE", "Available"),
                    ("DND", "Do not disturb"),
                    ("AWAY", "Away"),
                    ("INVISIBLE", "Invisible"),
                ],
                default="AVAILABLE",
                help_text="Workplace availability mode (notifications + presence).",
                max_length=20,
                verbose_name="mode",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="mode_until",
            field=models.DateTimeField(
                blank=True,
                help_text="When set, mode automatically returns to Available after this time.",
                null=True,
                verbose_name="mode until",
            ),
        ),
    ]
