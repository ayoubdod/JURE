from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cabinets", "0007_cabinetmember"),
    ]

    operations = [
        migrations.RenameField(
            model_name="cabinet",
            old_name="name",
            new_name="trade_name",
        ),
        migrations.RenameField(
            model_name="cabinet",
            old_name="address",
            new_name="business_address",
        ),
        migrations.RenameField(
            model_name="cabinet",
            old_name="legal_status",
            new_name="structure_type",
        ),
        migrations.RenameField(
            model_name="cabinet",
            old_name="max_employee_count",
            new_name="team_size",
        ),
        migrations.RemoveField(
            model_name="cabinet",
            name="ice",
        ),
        migrations.RemoveField(
            model_name="cabinet",
            name="commercial_register",
        ),
        migrations.AlterField(
            model_name="cabinet",
            name="description",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="cabinet",
            name="business_address",
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name="cabinet",
            name="structure_type",
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name="structure type"),
        ),
        migrations.AlterField(
            model_name="cabinet",
            name="team_size",
            field=models.PositiveIntegerField(default=1, verbose_name="team size"),
        ),
        migrations.AddField(
            model_name="cabinet",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="cabinet_logos/", verbose_name="logo"),
        ),
    ]
