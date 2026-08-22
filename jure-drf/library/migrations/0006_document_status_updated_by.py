# Generated manually for library document status / audit fields

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0005_canonical_document_categories"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="status",
            field=models.CharField(
                blank=True,
                choices=[("published", "Published"), ("archived", "Archived")],
                db_index=True,
                default="published",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="updated_documents",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
