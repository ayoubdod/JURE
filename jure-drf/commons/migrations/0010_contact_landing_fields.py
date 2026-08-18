import phonenumber_field.modelfields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commons", "0009_remove_tag_name_alter_tag_slug"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="company",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="contact",
            name="source",
            field=models.CharField(blank=True, default="contact", max_length=64),
        ),
        migrations.AddField(
            model_name="contact",
            name="subject",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="contact",
            name="phone",
            field=phonenumber_field.modelfields.PhoneNumberField(
                blank=True, max_length=128, null=True, region=None
            ),
        ),
    ]
