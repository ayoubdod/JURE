# Generated migration to fix cabinet owners' role
from django.db import migrations


def set_owner_role_for_cabinet_owners(apps, schema_editor):
    """Set role=OWNER for users who own a cabinet but don't have OWNER/ADMIN role."""
    User = apps.get_model('users', 'User')
    Cabinet = apps.get_model('cabinets', 'Cabinet')
    owner_role = 'OWNER'
    for cabinet in Cabinet.objects.select_related('owner').all():
        owner = cabinet.owner
        if owner and owner.role not in ('OWNER', 'ADMIN'):
            owner.role = owner_role
            owner.save(update_fields=['role'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_add_password_setup_token'),
        ('cabinets', '0010_delete_cabinetmember'),
    ]

    operations = [
        migrations.RunPython(set_owner_role_for_cabinet_owners, noop),
    ]
