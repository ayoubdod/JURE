# Generated manually for announcement media support

from django.db import migrations, models

import dashboard.models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0003_expand_announcement_system"),
    ]

    operations = [
        migrations.AddField(
            model_name="announcement",
            name="media",
            field=models.FileField(
                blank=True,
                help_text="Optional image or video shown with the announcement.",
                null=True,
                upload_to=dashboard.models.announcement_media_upload_to,
                validators=[dashboard.models.validate_announcement_media],
            ),
        ),
        migrations.AddField(
            model_name="announcement",
            name="media_kind",
            field=models.CharField(
                blank=True,
                choices=[("IMAGE", "Image"), ("VIDEO", "Video")],
                default="",
                help_text="Auto-detected from the uploaded file.",
                max_length=10,
            ),
        ),
    ]
