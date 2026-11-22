import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cabinets", "0014_cabinet_owner_set_null"),
        ("users", "0022_alter_user_bar_attestation_alter_user_image_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="cabinet",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="cabinets.cabinet",
            ),
        ),
    ]
