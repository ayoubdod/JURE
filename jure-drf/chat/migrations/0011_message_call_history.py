# Generated manually for call history messages

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0010_message_sharing_conversation_linked_case"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="message_type",
            field=models.CharField(
                choices=[
                    ("TEXT", "TEXT"),
                    ("SHARED_CASE", "SHARED_CASE"),
                    ("SHARED_TASK", "SHARED_TASK"),
                    ("SHARED_APPOINTMENT", "SHARED_APPOINTMENT"),
                    ("CALL_VOICE", "CALL_VOICE"),
                    ("CALL_VIDEO", "CALL_VIDEO"),
                    ("CALL_MISSED_VOICE", "CALL_MISSED_VOICE"),
                    ("CALL_MISSED_VIDEO", "CALL_MISSED_VIDEO"),
                ],
                default="TEXT",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="shared_call",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="history_messages",
                to="chat.call",
            ),
        ),
    ]
