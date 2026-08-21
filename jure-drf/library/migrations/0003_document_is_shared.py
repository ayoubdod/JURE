from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0002_document_cabinet_document_created_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='is_shared',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='If enabled, this document is visible to every cabinet. Upload these from Django admin.',
            ),
        ),
    ]
