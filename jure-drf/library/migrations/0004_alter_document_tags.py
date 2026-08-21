from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('commons', '0009_remove_tag_name_alter_tag_slug'),
        ('library', '0003_document_is_shared'),
    ]

    operations = [
        migrations.AlterField(
            model_name='document',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='documents', to='commons.tag'),
        ),
    ]
