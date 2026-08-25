# Generated manually — backfill TaskAssignee from assigned_to

from django.db import migrations


def forwards(apps, schema_editor):
    Task = apps.get_model("tasks", "Task")
    TaskAssignee = apps.get_model("tasks", "TaskAssignee")
    for task in Task.objects.exclude(assigned_to_id__isnull=True).iterator():
        TaskAssignee.objects.get_or_create(task_id=task.id, user_id=task.assigned_to_id)


def backwards(apps, schema_editor):
    TaskAssignee = apps.get_model("tasks", "TaskAssignee")
    TaskAssignee.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0006_calendar_assignees_attachments_meeting_type"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
