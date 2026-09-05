"""GET /api/v1/users/:id/workspace/ is cabinet-scoped (chat contact panel)."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import api_client_for, create_cabinet_member, create_cabinet_owner
from tasks.models import Task


class UserWorkspaceIsolationTests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = create_cabinet_owner(
            email="ws-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, self.cab_b = create_cabinet_owner(
            email="ws-b@test.com", trade_name="Cabinet B"
        )
        self.teammate = create_cabinet_member(
            self.cab_a, email="ws-teammate@test.com", role="LAWYER"
        )
        self.api_a = api_client_for(self.owner_a)
        self.api_b = api_client_for(self.owner_b)

        self.ours = Task.objects.create(
            title="Teammate task",
            cabinet=self.cab_a,
            assigned_to=self.teammate,
            created_by=self.owner_a,
            status=Task.TaskStatus.TODO,
        )
        self.theirs = Task.objects.create(
            title="Foreign owner task",
            cabinet=self.cab_b,
            assigned_to=self.owner_b,
            created_by=self.owner_b,
            status=Task.TaskStatus.TODO,
        )

    def test_same_cabinet_workspace_includes_assigned_tasks(self):
        response = self.api_a.get(
            reverse("user-workspace", kwargs={"pk": self.teammate.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        titles = {row["title"] for row in response.data["tasks"]}
        self.assertIn("Teammate task", titles)
        self.assertNotIn("Foreign owner task", titles)
        availability = response.data["availability"]
        self.assertIn(availability["workloadLevel"], ("LOW", "MEDIUM", "HIGH"))
        self.assertIsInstance(availability["upcomingEvents"], list)

    def test_cannot_read_foreign_cabinet_workspace(self):
        response = self.api_a.get(
            reverse("user-workspace", kwargs={"pk": self.owner_b.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn("tasks", response.data)
