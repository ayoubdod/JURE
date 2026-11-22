from django.contrib.auth import get_user_model
from django.test import TestCase

from cabinets.models import Cabinet
from core.testing import create_cabinet_member, create_cabinet_owner, unique_test_phone

User = get_user_model()


class CabinetUserDeletionTests(TestCase):
    def test_deleting_cabinet_deletes_owner_members_and_clients(self):
        owner, cabinet = create_cabinet_owner(email="owner-del@test.com")
        member = create_cabinet_member(cabinet, email="member-del@test.com")
        client = User.objects.create_user(
            email="client-del@test.com",
            password="testpass123",
            first_name="Client",
            last_name="Person",
            phone=unique_test_phone(),
            country="FR",
        )
        client.cabinet = cabinet
        client.is_cabinet_member = False
        client.save(update_fields=["cabinet", "is_cabinet_member"])

        cabinet_id = cabinet.pk
        user_ids = [owner.pk, member.pk, client.pk]
        cabinet.delete()

        self.assertFalse(Cabinet.objects.filter(pk=cabinet_id).exists())
        self.assertFalse(User.objects.filter(pk__in=user_ids).exists())

    def test_deleting_a_user_keeps_the_cabinet(self):
        owner, cabinet = create_cabinet_owner(email="owner-keep@test.com")
        member = create_cabinet_member(cabinet, email="member-keep@test.com")

        member.delete()
        cabinet.refresh_from_db()
        self.assertEqual(cabinet.owner_id, owner.pk)
        self.assertTrue(Cabinet.objects.filter(pk=cabinet.pk).exists())

        owner.delete()
        cabinet.refresh_from_db()
        self.assertIsNone(cabinet.owner_id)
        self.assertTrue(Cabinet.objects.filter(pk=cabinet.pk).exists())
