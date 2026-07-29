# Generated manually for shared messages and conversation–case link.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cases", "0008_add_updated_by"),
        ("tasks", "0005_delete_case_alter_appointment_client_and_more"),
        ("chat", "0009_add_conversation_icon"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="linked_case",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="linked_conversations",
                to="cases.case",
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="linked_case_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="message",
            name="message_type",
            field=models.CharField(
                choices=[
                    ("TEXT", "TEXT"),
                    ("SHARED_CASE", "SHARED_CASE"),
                    ("SHARED_TASK", "SHARED_TASK"),
                    ("SHARED_APPOINTMENT", "SHARED_APPOINTMENT"),
                ],
                default="TEXT",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="shared_appointment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="shared_in_messages",
                to="tasks.appointment",
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="shared_case",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="shared_in_messages",
                to="cases.case",
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="shared_task",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="shared_in_messages",
                to="tasks.task",
            ),
        ),
    ]
