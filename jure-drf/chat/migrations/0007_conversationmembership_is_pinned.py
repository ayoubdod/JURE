# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0006_message_read_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversationmembership",
            name="is_pinned",
            field=models.BooleanField(default=False),
        ),
    ]
