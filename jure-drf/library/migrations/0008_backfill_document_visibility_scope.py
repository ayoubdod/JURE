from django.db import migrations


def backfill_document_scope(apps, schema_editor):
    """
    Public library (is_shared=True) is currently visible to every cabinet.
    That matches GLOBAL. Cabinet-owned files stay CABINET. Uncertain
    jurisdiction-specific public content is not invented.
    """
    Document = apps.get_model("library", "Document")
    Document.objects.filter(is_shared=True).update(
        visibility_scope="GLOBAL",
        jurisdiction=None,
        cabinet=None,
    )
    Document.objects.filter(is_shared=False).update(visibility_scope="CABINET")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0007_alter_document_options_document_jurisdiction_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_document_scope, noop),
    ]
