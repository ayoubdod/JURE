# Generated manually for announcement CMS fields

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone


def backfill_announcement_status(apps, schema_editor):
    Announcement = apps.get_model("dashboard", "Announcement")
    now = timezone.now()
    for ann in Announcement.objects.all():
        if not ann.is_active:
            ann.status = "DRAFT"
        elif ann.start_date and ann.start_date > now:
            ann.status = "SCHEDULED"
        else:
            ann.status = "PUBLISHED"
        if not getattr(ann, "priority", None):
            ann.priority = 1
        ann.save(update_fields=["status", "priority"])


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0005_phase1_finance_completion"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="announcement",
            name="announcement_type",
            field=models.CharField(
                choices=[
                    ("INFO", "Information"),
                    ("PRODUCT_UPDATE", "Product Update"),
                    ("FEATURE", "Feature"),
                    ("MAINTENANCE", "Maintenance"),
                    ("WARNING", "Warning"),
                    ("IMPORTANT", "Important"),
                    ("SUCCESS", "Success"),
                ],
                db_index=True,
                default="INFO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="status",
            field=models.CharField(
                choices=[
                    ("DRAFT", "Draft"),
                    ("PUBLISHED", "Published"),
                    ("SCHEDULED", "Scheduled"),
                    ("ARCHIVED", "Archived"),
                ],
                db_index=True,
                default="DRAFT",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="priority",
            field=models.PositiveSmallIntegerField(
                choices=[(0, "Low"), (1, "Normal"), (2, "High"), (3, "Urgent")],
                db_index=True,
                default=1,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="link_url",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Optional CTA. Internal path (/dashboard/...) or HTTPS URL.",
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="link_label",
            field=models.CharField(
                blank=True,
                default="",
                help_text='Optional CTA label, e.g. "Learn more".',
                max_length=80,
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="updated_announcements",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_announcement_status, migrations.RunPython.noop),
    ]
