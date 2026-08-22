from django.db import migrations


def backfill_announcement_scope(apps, schema_editor):
    """
    Existing announcements are cabinet-targeted (empty target set = nobody).
    Preserve that behavior as CABINET. Do not silently reclassify them as
    GLOBAL or a jurisdiction.
    """
    Announcement = apps.get_model("dashboard", "Announcement")
    Announcement.objects.filter(visibility_scope__isnull=True).update(
        visibility_scope="CABINET"
    )
    Announcement.objects.filter(visibility_scope="").update(visibility_scope="CABINET")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0007_announcement_jurisdiction_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_announcement_scope, noop),
    ]
