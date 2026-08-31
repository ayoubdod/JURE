from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("juria", "0004_juriaproject_is_simple"),
    ]

    operations = [
        migrations.AddField(
            model_name="juriaproject",
            name="name_is_custom",
            field=models.BooleanField(
                default=False,
                help_text="True after the user sets the name; AI auto-titles are skipped.",
            ),
        ),
        migrations.AddField(
            model_name="juriathread",
            name="title_is_custom",
            field=models.BooleanField(
                default=False,
                help_text="True after the user sets the title; AI auto-titles are skipped.",
            ),
        ),
    ]
