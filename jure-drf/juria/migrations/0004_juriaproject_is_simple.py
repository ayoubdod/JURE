from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("juria", "0003_migrate_conversations_to_projects"),
    ]

    operations = [
        migrations.AddField(
            model_name="juriaproject",
            name="is_simple",
            field=models.BooleanField(
                default=False,
                help_text="Standalone AI chat without JURE matter / library / team context.",
            ),
        ),
    ]
