from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_phase1_finance_completion'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='currency',
            field=models.CharField(default='MAD', max_length=3),
        ),
    ]
