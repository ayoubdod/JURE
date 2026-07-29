from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0013_user_cabinet_role"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="legal_status",
        ),
        migrations.AddField(
            model_name="user",
            name="business_address",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="business address"),
        ),
        migrations.AddField(
            model_name="user",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="cabinet_logos/", verbose_name="logo"),
        ),
        migrations.AddField(
            model_name="user",
            name="structure_type",
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name="structure type"),
        ),
        migrations.AddField(
            model_name="user",
            name="team_size",
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name="team size"),
        ),
        migrations.AddField(
            model_name="user",
            name="trade_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="trade name"),
        ),
        migrations.AddField(
            model_name="user",
            name="website",
            field=models.URLField(blank=True, null=True, verbose_name="website"),
        ),
    ]






