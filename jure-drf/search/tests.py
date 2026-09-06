"""Shareable search stays inside the caller's cabinet."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from core.testing import api_client_for, create_cabinet_owner
from tasks.models import Appointment, Task


class ShareableSearchCabinetIsolationTests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = create_cabinet_owner(
            email="search-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, self.cab_b = create_cabinet_owner(
            email="search-b@test.com", trade_name="Cabinet B"
        )
        self.api_a = api_client_for(self.owner_a)
        start = timezone.now() + timedelta(days=1)
        Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=self.cab_a,
            assigned_to=self.owner_a,
            created_by=self.owner_a,
            title="AlphaIsolation matter",
            description="A",
            court="N/A",
            reference="SRCH-A-001",
            status=Case.CaseStatus.OPEN,
        )
        Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=self.cab_b,
            assigned_to=self.owner_b,
            created_by=self.owner_b,
            title="BetaIsolation matter",
            description="B",
            court="N/A",
            reference="SRCH-B-001",
            status=Case.CaseStatus.OPEN,
        )
        Task.objects.create(
            title="AlphaIsolation task",
            cabinet=self.cab_a,
            created_by=self.owner_a,
        )
        Task.objects.create(
            title="BetaIsolation task",
            cabinet=self.cab_b,
            created_by=self.owner_b,
        )
        Appointment.objects.create(
            title="AlphaIsolation meeting",
            start_at=start,
            end_at=start + timedelta(hours=1),
            cabinet=self.cab_a,
            created_by=self.owner_a,
        )
        Appointment.objects.create(
            title="BetaIsolation meeting",
            start_at=start,
            end_at=start + timedelta(hours=1),
            cabinet=self.cab_b,
            created_by=self.owner_b,
        )
        self.url = reverse("search-shareable")

    def test_short_query_is_rejected(self):
        response = self.api_a.get(self.url, {"q": "A"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_results_exclude_other_cabinet(self):
        response = self.api_a.get(self.url, {"q": "Isolation"})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        case_titles = {row["title"] for row in response.data["cases"]}
        task_titles = {row["title"] for row in response.data["tasks"]}
        appt_titles = {row["title"] for row in response.data["appointments"]}
        self.assertIn("AlphaIsolation matter", case_titles)
        self.assertIn("AlphaIsolation task", task_titles)
        self.assertIn("AlphaIsolation meeting", appt_titles)
        self.assertNotIn("BetaIsolation matter", case_titles)
        self.assertNotIn("BetaIsolation task", task_titles)
        self.assertNotIn("BetaIsolation meeting", appt_titles)
