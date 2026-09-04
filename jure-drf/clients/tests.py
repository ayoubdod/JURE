"""Client list/create is cabinet-scoped."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import api_client_for, create_cabinet_owner, unique_test_phone
from users.models import User


class ClientCabinetIsolationTests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = create_cabinet_owner(
            email="clients-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, self.cab_b = create_cabinet_owner(
            email="clients-b@test.com", trade_name="Cabinet B"
        )
        self.api_a = api_client_for(self.owner_a)
        self.api_b = api_client_for(self.owner_b)
        self.list_url = reverse("client-list")

    def _create_via_api(self, api, *, email: str, first_name: str = "Ada"):
        payload = {
            "first_name": first_name,
            "last_name": "Client",
            "email": email,
            "phone": unique_test_phone(),
        }
        response = api.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def test_list_excludes_other_cabinet_clients(self):
        created = self._create_via_api(self.api_a, email="ada@cab-a.test.com")
        other = self._create_via_api(self.api_b, email="ben@cab-b.test.com", first_name="Ben")

        listed = self.api_a.get(self.list_url)
        self.assertEqual(listed.status_code, status.HTTP_200_OK, listed.data)
        rows = listed.data["results"] if isinstance(listed.data, dict) else listed.data
        emails = {row["email"] for row in rows}
        self.assertIn(created["email"], emails)
        self.assertNotIn(other["email"], emails)

    def test_created_client_belongs_to_actor_cabinet(self):
        data = self._create_via_api(self.api_a, email="owned@cab-a.test.com")
        client = User.objects.get(pk=data["id"])
        self.assertEqual(client.cabinet_id, self.cab_a.id)
        self.assertFalse(client.is_cabinet_member)
        self.assertNotEqual(client.cabinet_id, self.cab_b.id)

    def test_cannot_retrieve_foreign_client(self):
        foreign = self._create_via_api(self.api_b, email="secret@cab-b.test.com")
        response = self.api_a.get(reverse("client-detail", kwargs={"pk": foreign["id"]}))
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
