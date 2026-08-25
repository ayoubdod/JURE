import uuid

import django_extensions.db.fields
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def fill_resource_uids(apps, schema_editor):
    Document = apps.get_model("library", "Document")
    for doc in Document.objects.filter(resource_uid__isnull=True).iterator():
        doc.resource_uid = uuid.uuid4()
        doc.save(update_fields=["resource_uid"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cabinets", "0012_cabinet_jurisdiction_cabinet_practice_type"),
        ("commons", "0010_contact_landing_fields"),
        ("library", "0008_backfill_document_visibility_scope"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="author",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="document",
            name="country",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="document",
            name="effective_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="document",
            name="external_url",
            field=models.URLField(blank=True, default="", max_length=2000),
        ),
        migrations.AddField(
            model_name="document",
            name="issuing_authority",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="document",
            name="keywords",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="document",
            name="language",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="document",
            name="legal_area",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="document",
            name="publication_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="document",
            name="reference_number",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="document",
            name="resource_type",
            field=models.CharField(
                choices=[
                    ("law", "Law"),
                    ("code", "Code"),
                    ("regulation", "Regulation"),
                    ("decree", "Decree"),
                    ("circular", "Circular"),
                    ("case_law", "Case Law"),
                    ("court_decision", "Court Decision"),
                    ("administrative_decision", "Administrative Decision"),
                    ("treaty", "Treaty"),
                    ("convention", "Convention"),
                    ("directive", "Directive"),
                    ("legal_commentary", "Legal Commentary"),
                    ("legal_article", "Legal Article"),
                    ("legal_guide", "Legal Guide"),
                    ("template", "Template"),
                    ("legal_form", "Legal Form"),
                    ("report", "Report"),
                    ("research_paper", "Research Paper"),
                    ("regulatory_update", "Regulatory Update"),
                    ("other", "Other"),
                ],
                db_index=True,
                default="other",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="resource_uid",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="document",
            name="source",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="document",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to="documents/"),
        ),
        migrations.RunPython(fill_resource_uids, noop),
        migrations.AlterField(
            model_name="document",
            name="resource_uid",
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddIndex(
            model_name="document",
            index=models.Index(fields=["visibility_scope", "created"], name="library_doc_scope_created_idx"),
        ),
        migrations.CreateModel(
            name="LibraryFavorite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", django_extensions.db.fields.CreationDateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", django_extensions.db.fields.ModificationDateTimeField(auto_now=True, verbose_name="modified")),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="favorites",
                        to="library.document",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="library_favorites",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="LibrarySave",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", django_extensions.db.fields.CreationDateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", django_extensions.db.fields.ModificationDateTimeField(auto_now=True, verbose_name="modified")),
                (
                    "added_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="library_saves",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "cabinet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="library_saves",
                        to="cabinets.cabinet",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cabinet_saves",
                        to="library.document",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="libraryfavorite",
            constraint=models.UniqueConstraint(fields=("user", "document"), name="library_favorite_user_doc_uniq"),
        ),
        migrations.AddIndex(
            model_name="libraryfavorite",
            index=models.Index(fields=["user", "-created"], name="library_fav_user_created_idx"),
        ),
        migrations.AddConstraint(
            model_name="librarysave",
            constraint=models.UniqueConstraint(fields=("cabinet", "document"), name="library_save_cabinet_doc_uniq"),
        ),
        migrations.AddIndex(
            model_name="librarysave",
            index=models.Index(fields=["cabinet", "-created"], name="library_save_cab_created_idx"),
        ),
    ]
