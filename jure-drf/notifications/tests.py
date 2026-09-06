"""In-app notifications are recipient-scoped, not cabinet-wide."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import api_client_for, create_cabinet_owner
from notifications.constants import NotificationType
from notifications.models import Notification


class NotificationRecipientIsolationTests(APITestCase):
    def setUp(self):
        self.owner_a, _ = create_cabinet_owner(
            email="notif-a@test.com", trade_name="Cabinet A"
        )
        self.owner_b, _ = create_cabinet_owner(
            email="notif-b@test.com", trade_name="Cabinet B"
        )
        self.api_a = api_client_for(self.owner_a)
        self.mine = Notification.objects.create(
            recipient=self.owner_a,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="Your task",
            message="Assigned to you",
        )
        self.theirs = Notification.objects.create(
            recipient=self.owner_b,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="Their task",
            message="Assigned to them",
        )
        self.list_url = reverse("notification-list")

    def test_list_excludes_other_users_notifications(self):
        response = self.api_a.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        titles = {row["title"] for row in rows}
        self.assertIn("Your task", titles)
        self.assertNotIn("Their task", titles)

    def test_unread_count_ignores_other_users(self):
        url = reverse("notification-unread-count")
        before = self.api_a.get(url)
        self.assertEqual(before.status_code, status.HTTP_200_OK, before.data)
        Notification.objects.create(
            recipient=self.owner_b,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="Another of theirs",
            message="Still not yours",
        )
        after = self.api_a.get(url)
        self.assertEqual(after.status_code, status.HTTP_200_OK, after.data)
        self.assertEqual(after.data["count"], before.data["count"])

    def test_cannot_mark_foreign_notification_read(self):
        url = reverse("notification-mark-read", kwargs={"pk": self.theirs.pk})
        response = self.api_a.patch(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.theirs.refresh_from_db()
        self.assertFalse(self.theirs.is_read)

    def test_cannot_delete_foreign_notification(self):
        url = reverse("notification-delete", kwargs={"pk": self.theirs.pk})
        response = self.api_a.delete(url)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.assertTrue(Notification.objects.filter(pk=self.theirs.pk).exists())
