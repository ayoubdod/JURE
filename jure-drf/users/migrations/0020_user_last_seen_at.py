from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0019_user_session_version"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="last_seen_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Last time the user was connected to chat.",
                null=True,
                verbose_name="last seen at",
            ),
        ),
    ]
