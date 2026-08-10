# Generated manually for expandable announcement system

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_cabinet_fk_to_m2m(apps, schema_editor):
    Announcement = apps.get_model("dashboard", "Announcement")
    for ann in Announcement.objects.all():
        cabinet_id = getattr(ann, "cabinet_id", None)
        if cabinet_id:
            ann.target_cabinets.add(cabinet_id)


class Migration(migrations.Migration):

    dependencies = [
        ("cabinets", "0011_finance_module"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("dashboard", "0002_alter_activitylog_options_alter_announcement_options_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="announcement",
            old_name="body",
            new_name="message",
        ),
        migrations.AddField(
            model_name="announcement",
            name="announcement_type",
            field=models.CharField(
                choices=[
                    ("INFO", "Info"),
                    ("SUCCESS", "Success"),
                    ("WARNING", "Warning"),
                    ("IMPORTANT", "Important"),
                ],
                db_index=True,
                default="INFO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="start_date",
            field=models.DateTimeField(
                blank=True,
                help_text="If empty, eligible immediately once active.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="end_date",
            field=models.DateTimeField(
                blank=True,
                help_text="If empty, never expires while active.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_announcements",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="target_cabinets",
            field=models.ManyToManyField(
                blank=True,
                related_name="announcements",
                to="cabinets.cabinet",
            ),
        ),
        migrations.AlterField(
            model_name="announcement",
            name="is_active",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.RunPython(copy_cabinet_fk_to_m2m, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="announcement",
            name="cabinet",
        ),
    ]
