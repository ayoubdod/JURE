"""Cabinet profile, team list tenancy, and role updates."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import api_client_for, create_cabinet_member, create_cabinet_owner
from users.models import User


class CabinetProfileTests(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = create_cabinet_owner(
            email="cab-owner@test.com", trade_name="Hammoud"
        )
        self.api = api_client_for(self.owner)
        self.me_url = reverse("my-cabinet")

    def test_owner_can_read_and_rename_cabinet(self):
        got = self.api.get(self.me_url)
        self.assertEqual(got.status_code, status.HTTP_200_OK, got.data)
        self.assertEqual(got.data["trade_name"], "Hammoud")

        patched = self.api.patch(self.me_url, {"trade_name": "Hammoud Law"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK, patched.data)
        self.cabinet.refresh_from_db()
        self.assertEqual(self.cabinet.trade_name, "Hammoud Law")

    def test_member_cannot_patch_cabinet(self):
        member = create_cabinet_member(self.cabinet, email="cab-lawyer@test.com", role="LAWYER")
        api = api_client_for(member)
        response = api.patch(self.me_url, {"trade_name": "Hijack"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.cabinet.refresh_from_db()
        self.assertEqual(self.cabinet.trade_name, "Hammoud")


class CabinetMemberTenancyTests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = create_cabinet_owner(
            email="team-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, self.cab_b = create_cabinet_owner(
            email="team-b@test.com", trade_name="Cabinet B"
        )
        self.member_a = create_cabinet_member(
            self.cab_a, email="assoc-a@test.com", role="LAWYER"
        )
        self.member_b = create_cabinet_member(
            self.cab_b, email="assoc-b@test.com", role="LAWYER"
        )
        self.api_a = api_client_for(self.owner_a)
        self.list_url = reverse("cabinet-members-list")

    def test_list_is_limited_to_own_cabinet(self):
        response = self.api_a.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        ids = {row["id"] for row in rows}
        self.assertIn(self.owner_a.id, ids)
        self.assertIn(self.member_a.id, ids)
        self.assertNotIn(self.owner_b.id, ids)
        self.assertNotIn(self.member_b.id, ids)

    def test_cannot_retrieve_foreign_member(self):
        url = reverse("cabinet-members-detail", kwargs={"pk": self.member_b.id})
        response = self.api_a.get(url)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )

    def test_cannot_patch_or_delete_foreign_member(self):
        url = reverse("cabinet-members-detail", kwargs={"pk": self.member_b.id})
        patched = self.api_a.patch(url, {"first_name": "Hijacked"}, format="json")
        self.assertIn(
            patched.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        deleted = self.api_a.delete(url)
        self.assertIn(
            deleted.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.member_b.refresh_from_db()
        self.assertEqual(self.member_b.first_name, "Team")
        self.assertTrue(self.member_b.is_cabinet_member)

    def test_cannot_change_foreign_member_role(self):
        url = reverse("update-member-role", kwargs={"member_id": self.member_b.id})
        response = self.api_a.patch(url, {"role": User.Role.ADMIN}, format="json")
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.member_b.refresh_from_db()
        self.assertEqual(self.member_b.role, User.Role.LAWYER)

    def test_cannot_resend_invitation_for_foreign_member(self):
        from users.models import PasswordSetupToken

        url = reverse(
            "cabinet-members-resend-invitation", kwargs={"pk": self.member_b.id}
        )
        before = PasswordSetupToken.objects.filter(user=self.member_b).count()
        response = self.api_a.post(url)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.assertEqual(
            PasswordSetupToken.objects.filter(user=self.member_b).count(), before
        )


class CabinetRoleUpdateTests(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = create_cabinet_owner(email="role-owner@test.com")
        self.member = create_cabinet_member(
            self.cabinet, email="role-target@test.com", role="LAWYER"
        )
        self.api = api_client_for(self.owner)
        self.url = reverse("update-member-role", kwargs={"member_id": self.member.id})

    def test_owner_can_promote_member_and_response_includes_role(self):
        response = self.api.patch(self.url, {"role": User.Role.ADMIN}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["role"], User.Role.ADMIN)
        self.member.refresh_from_db()
        self.assertEqual(self.member.role, User.Role.ADMIN)

    def test_cannot_change_own_role(self):
        url = reverse("update-member-role", kwargs={"member_id": self.owner.id})
        response = self.api.patch(url, {"role": User.Role.VIEWER}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lawyer_cannot_manage_roles(self):
        lawyer = create_cabinet_member(
            self.cabinet, email="role-lawyer@test.com", role="LAWYER"
        )
        api = api_client_for(lawyer)
        response = api.patch(self.url, {"role": User.Role.ADMIN}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.member.refresh_from_db()
        self.assertEqual(self.member.role, User.Role.LAWYER)
