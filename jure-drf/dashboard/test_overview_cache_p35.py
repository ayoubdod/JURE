"""P3.5 overview cache: hit/miss, fresh bypass, write invalidation."""
from __future__ import annotations

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from django.contrib.auth import get_user_model

from cabinets.models import Cabinet
from core.testing import api_client_for
from dashboard.services.overview_cache import reset_overview_cache_client_for_tests
from lawyers.models import LawyerProfile
from tasks.models import Task
from users.models import User

UserModel = get_user_model()


def _owner(email: str, phone: str):
    user = UserModel.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Owner",
        last_name="User",
        phone=phone,
        country="MA",
    )
    cabinet = Cabinet.objects.create(
        owner=user, trade_name="Cache Cab", business_address="1 St"
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name="Owner User")
    return user, cabinet


@override_settings(DASHBOARD_OVERVIEW_CACHE_TTL=60)
class OverviewCacheAPITest(APITestCase):
    def setUp(self):
        reset_overview_cache_client_for_tests()
        self.owner, self.cabinet = _owner("cache-o@test.com", "+212666000001")
        self.url = reverse("dashboard-overview")

    def tearDown(self):
        reset_overview_cache_client_for_tests()

    def test_second_request_is_cache_hit(self):
        client = api_client_for(self.owner)
        first = client.get(self.url).json()
        self.assertNotEqual((first.get("meta") or {}).get("cache"), "hit")
        second = client.get(self.url).json()
        self.assertEqual((second.get("meta") or {}).get("cache"), "hit")
        self.assertEqual(first["kpis"]["active_cases"]["value"], second["kpis"]["active_cases"]["value"])

    def test_fresh_bypasses_cache(self):
        client = api_client_for(self.owner)
        client.get(self.url)
        fresh = client.get(self.url, {"fresh": "1"}).json()
        self.assertNotEqual((fresh.get("meta") or {}).get("cache"), "hit")

    def test_write_invalidates_cache(self):
        from django.utils import timezone

        client = api_client_for(self.owner)
        before = client.get(self.url).json()
        self.assertEqual(before["kpis"]["tasks_due_today"]["value"], 0)
        # Warm cache
        client.get(self.url)
        Task.objects.create(
            title="New Due",
            cabinet=self.cabinet,
            due_date=timezone.localdate(),
            status=Task.TaskStatus.TODO,
            assigned_to=self.owner,
        )
        after = client.get(self.url).json()
        self.assertNotEqual((after.get("meta") or {}).get("cache"), "hit")
        self.assertEqual(after["kpis"]["tasks_due_today"]["value"], 1)


@override_settings(DASHBOARD_OVERVIEW_CACHE_TTL=0)
class OverviewCacheDisabledTest(APITestCase):
    def setUp(self):
        reset_overview_cache_client_for_tests()
        self.owner, _ = _owner("cache-off@test.com", "+212666000002")
        self.url = reverse("dashboard-overview")

    def test_disabled_never_hits(self):
        client = api_client_for(self.owner)
        a = client.get(self.url).json()
        b = client.get(self.url).json()
        self.assertNotEqual((a.get("meta") or {}).get("cache"), "hit")
        self.assertNotEqual((b.get("meta") or {}).get("cache"), "hit")
