from django.db import migrations


STRUCTURE_TO_PRACTICE = {
    "Cabinet d'avocat": "LAW_OFFICE",
    "Société d'avocat": "LAW_FIRM",
}


def assign_existing_cabinets(apps, schema_editor):
    """
    JURE has only operated in Morocco to date (legal deadlines, JURIA, jure.ma).
    Existing cabinets are therefore assigned to MA. practice_type is mapped only
    when the stored structure_type is an unambiguous Law Office / Law Firm label.
    """
    Cabinet = apps.get_model("cabinets", "Cabinet")
    Jurisdiction = apps.get_model("jurisdictions", "Jurisdiction")
    morocco = Jurisdiction.objects.filter(code="MA").first()
    if morocco is None:
        return
    Cabinet.objects.filter(jurisdiction__isnull=True).update(jurisdiction=morocco)
    for structure, practice in STRUCTURE_TO_PRACTICE.items():
        Cabinet.objects.filter(practice_type__isnull=True, structure_type=structure).update(
            practice_type=practice
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cabinets", "0012_cabinet_jurisdiction_cabinet_practice_type"),
        ("jurisdictions", "0002_seed_ma_qa"),
    ]

    operations = [
        migrations.RunPython(assign_existing_cabinets, noop),
    ]
