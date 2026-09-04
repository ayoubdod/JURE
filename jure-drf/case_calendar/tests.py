"""Unified calendar feed is cabinet-scoped (tasks, appointments, consultation dates)."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from core.testing import api_client_for, create_cabinet_owner
from tasks.models import Appointment, Task


class UnifiedCalendarCabinetIsolationTests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = create_cabinet_owner(
            email="cal-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, self.cab_b = create_cabinet_owner(
            email="cal-b@test.com", trade_name="Cabinet B"
        )
        self.api_a = api_client_for(self.owner_a)
        due = timezone.now().date()
        start = timezone.now() + timedelta(days=2)
        end = start + timedelta(hours=1)
        consult_at = (timezone.now() + timedelta(days=3)).isoformat()

        Task.objects.create(
            title="Ours cal task",
            cabinet=self.cab_a,
            created_by=self.owner_a,
            due_date=due,
        )
        Task.objects.create(
            title="Theirs cal task",
            cabinet=self.cab_b,
            created_by=self.owner_b,
            due_date=due,
        )
        Appointment.objects.create(
            title="Ours cal meeting",
            start_at=start,
            end_at=end,
            cabinet=self.cab_a,
            created_by=self.owner_a,
        )
        Appointment.objects.create(
            title="Theirs cal meeting",
            start_at=start,
            end_at=end,
            cabinet=self.cab_b,
            created_by=self.owner_b,
        )
        Case.objects.create(
            case_type=Case.CaseType.CONSULTATION,
            cabinet=self.cab_a,
            assigned_to=self.owner_a,
            created_by=self.owner_a,
            title="Ours consult",
            description="A",
            court="N/A",
            reference="CAL-A-001",
            status=Case.CaseStatus.OPEN,
            case_specific_data={"consultationDate": consult_at},
        )
        Case.objects.create(
            case_type=Case.CaseType.CONSULTATION,
            cabinet=self.cab_b,
            assigned_to=self.owner_b,
            created_by=self.owner_b,
            title="Theirs consult",
            description="B",
            court="N/A",
            reference="CAL-B-001",
            status=Case.CaseStatus.OPEN,
            case_specific_data={"consultationDate": consult_at},
        )

        today = timezone.now().date()
        self.query = {
            "dateFrom": today.isoformat(),
            "dateTo": (today + timedelta(days=14)).isoformat(),
            "types": "task,appointment,consultation_date",
        }
        self.url = reverse("unified-calendar-events")

    def test_feed_excludes_other_cabinet_events(self):
        response = self.api_a.get(self.url, self.query)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        titles = {row["title"] for row in response.data}
        self.assertIn("Ours cal task", titles)
        self.assertIn("Ours cal meeting", titles)
        self.assertIn("Ours consult", titles)
        self.assertNotIn("Theirs cal task", titles)
        self.assertNotIn("Theirs cal meeting", titles)
        self.assertNotIn("Theirs consult", titles)
