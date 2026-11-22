"""P2 dashboard overview: portfolio, CRM heuristics, team overdue, notifications, conflict queue."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from conflict_checks.models import ConflictCheck
from core.testing import api_client_for
from dashboard.services.overview_p2 import (
    AGING_GT_60_DAYS,
    CLIENT_FOLLOW_UP_DAYS,
    STALE_MATTER_DAYS,
)
from lawyers.models import LawyerProfile
from notifications.models import Notification
from tasks.models import Task
from users.models import User

UserModel = get_user_model()


def _aware(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _create_owner(email: str, phone: str, trade_name: str = "P2 Cabinet"):
    user = UserModel.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Owner",
        last_name="User",
        phone=phone,
        country="MA",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name,
        business_address="1 Test St",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name=f"{user.first_name} {user.last_name}")
    return user, cabinet


def _create_member(cabinet, *, email: str, phone: str, role: str, first_name: str = "Member"):
    user = UserModel.objects.create_user(
        email=email,
        password="testpass123",
        first_name=first_name,
        last_name="Member",
        phone=phone,
        country="MA",
        cabinet=cabinet,
        is_cabinet_member=True,
        role=role,
    )
    LawyerProfile.objects.create(user=user, name=f"{user.first_name} {user.last_name}")
    return user


def _create_client(cabinet, *, email: str, phone: str, first_name: str = "Client"):
    return UserModel.objects.create_user(
        email=email,
        password="clientpass123",
        first_name=first_name,
        last_name="Person",
        phone=phone,
        country="MA",
        cabinet=cabinet,
        is_cabinet_member=False,
    )


def _create_case(cabinet, assignee, *, title="Matter", status_value=Case.CaseStatus.OPEN, client=None):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=assignee,
        client=client,
        title=title,
        description="Desc",
        court="Court",
        reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status=status_value,
    )


def _create_task(cabinet, *, title, due_date, status_value=Task.TaskStatus.TODO, assigned_to=None):
    return Task.objects.create(
        title=title,
        cabinet=cabinet,
        due_date=due_date,
        status=status_value,
        assigned_to=assigned_to,
    )


class OverviewP2APITest(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = _create_owner("p2-owner@test.com", "+212633000001")
        self.lawyer = _create_member(
            self.cabinet,
            email="p2-lawyer@test.com",
            phone="+212633000002",
            role=User.Role.LAWYER,
            first_name="Lawyer",
        )
        self.viewer = _create_member(
            self.cabinet,
            email="p2-viewer@test.com",
            phone="+212633000003",
            role=User.Role.VIEWER,
            first_name="Viewer",
        )
        self.url = reverse("dashboard-overview")
        self.today = timezone.localdate()
        self.now = timezone.now()

        self.client_user = _create_client(
            self.cabinet, email="p2-cli@test.com", phone="+212633000010", first_name="Ada"
        )
        self.lawyer_case = _create_case(
            self.cabinet, self.lawyer, title="Lawyer Matter", client=self.client_user
        )
        self.owner_case = _create_case(self.cabinet, self.owner, title="Owner Matter")

        # Stale + aging on owner case
        Case.objects.filter(pk=self.owner_case.pk).update(
            modified=_aware(self.now - timedelta(days=STALE_MATTER_DAYS + 5))
        )
        # Aging > 60 on a second owner case
        aged = _create_case(self.cabinet, self.owner, title="Aged Matter")
        Case.objects.filter(pk=aged.pk).update(
            modified=_aware(self.now - timedelta(days=AGING_GT_60_DAYS + 2))
        )
        self.aged_case = aged

        # Client follow-up: stale client join / no recent case activity for a second client
        self.stale_client = _create_client(
            self.cabinet, email="p2-stale-cli@test.com", phone="+212633000011", first_name="Stale"
        )
        UserModel.objects.filter(pk=self.stale_client.pk).update(
            date_joined=_aware(self.now - timedelta(days=CLIENT_FOLLOW_UP_DAYS + 10))
        )

        self.overdue_lawyer = _create_task(
            self.cabinet,
            title="Lawyer Overdue P2",
            due_date=self.today - timedelta(days=3),
            assigned_to=self.lawyer,
        )
        self.overdue_lawyer.assignees.add(self.lawyer)
        self.overdue_owner = _create_task(
            self.cabinet,
            title="Owner Overdue P2",
            due_date=self.today - timedelta(days=1),
            assigned_to=self.owner,
        )
        self.overdue_owner.assignees.add(self.owner)

        ConflictCheck.objects.create(
            cabinet=self.cabinet,
            initiated_by=self.owner,
            matter=self.owner_case,
            search_query="Contoso Corp",
            result_count=2,
            status=ConflictCheck.ReviewStatus.PENDING_REVIEW,
        )
        ConflictCheck.objects.create(
            cabinet=self.cabinet,
            initiated_by=self.owner,
            search_query="Reviewed Party",
            result_count=0,
            status=ConflictCheck.ReviewStatus.REVIEWED_NO_CONFLICT,
        )

    def _get(self, user):
        return api_client_for(user).get(self.url)

    def test_owner_portfolio_and_crm(self):
        data = self._get(self.owner).json()
        self.assertIn("portfolio", data)
        self.assertIn("crm", data)
        self.assertGreaterEqual(data["portfolio"]["active_total"], 2)
        statuses = {b["key"]: b["count"] for b in data["portfolio"]["by_status"]}
        self.assertIn(Case.CaseStatus.OPEN, statuses)
        self.assertGreaterEqual(data["crm"]["stale_matters_count"], 1)
        stale_titles = {m["title"] for m in data["crm"]["stale_matters"]}
        self.assertTrue(stale_titles & {"Owner Matter", "Aged Matter"})
        self.assertEqual(data["crm"]["rules"]["stale_matter_days"], STALE_MATTER_DAYS)
        self.assertGreaterEqual(data["crm"]["client_follow_ups_count"], 1)
        follow_names = {f["name"] for f in data["crm"]["client_follow_ups"]}
        self.assertIn("Stale", follow_names)
        self.assertIsInstance(data["kpis"]["wip_aging_gt_60"], dict)
        self.assertGreaterEqual(data["kpis"]["wip_aging_gt_60"]["value"], 1)
        self.assertIn("stale_matters", data["definitions"])

    def test_lawyer_portfolio_is_personal(self):
        data = self._get(self.lawyer).json()
        self.assertEqual(data["meta"]["scope"], "personal")
        self.assertEqual(data["portfolio"]["active_total"], 1)
        titles_in_stale = {m["title"] for m in data["crm"]["stale_matters"]}
        self.assertNotIn("Owner Matter", titles_in_stale)
        self.assertNotIn("Aged Matter", titles_in_stale)

    def test_team_overdue_cabinet_vs_personal(self):
        owner_data = self._get(self.owner).json()
        self.assertIsNotNone(owner_data["team"])
        self.assertGreaterEqual(owner_data["team"]["total"], 2)
        assignee_ids = {a["user_id"] for a in owner_data["team"]["by_assignee"]}
        self.assertIn(self.lawyer.id, assignee_ids)
        self.assertIn(self.owner.id, assignee_ids)

        lawyer_data = self._get(self.lawyer).json()
        self.assertIsNotNone(lawyer_data["team"])
        self.assertEqual(lawyer_data["team"]["total"], 1)
        self.assertEqual(lawyer_data["team"]["by_assignee"][0]["user_id"], self.lawyer.id)

    def test_conflict_review_queue_pending_only(self):
        data = self._get(self.owner).json()
        queue = data["conflict_review_queue"]
        self.assertIsNotNone(queue)
        queries = {c["search_query"] for c in queue}
        self.assertIn("Contoso Corp", queries)
        self.assertNotIn("Reviewed Party", queries)

    def test_notification_activity_preferred_and_isolated(self):
        # Clear any signal-created noise so the feed is deterministic.
        Notification.objects.filter(recipient=self.lawyer).delete()
        Notification.objects.create(
            recipient=self.lawyer,
            notification_type="TASK_ASSIGNED",
            title="Your task",
            message="Assigned to you",
            action_url="/dashboard/tasks",
        )
        Notification.objects.create(
            recipient=self.owner,
            notification_type="CASE_UPDATE",
            title="Secret owner note",
            message="Owner-only activity",
        )

        lawyer_data = self._get(self.lawyer).json()
        self.assertEqual(len(lawyer_data["recent_activity"]), 1)
        self.assertEqual(lawyer_data["recent_activity"][0]["kind"], "notification")
        self.assertEqual(lawyer_data["recent_activity"][0]["title"], "Your task")
        blob = str(lawyer_data["recent_activity"]).lower()
        self.assertNotIn("secret", blob)
        self.assertNotIn("owner-only", blob)

        # Personal scope without notifications stays empty (no ActivityLog fallback)
        assistant = _create_member(
            self.cabinet,
            email="p2-asst@test.com",
            phone="+212633000020",
            role=User.Role.ASSISTANT,
            first_name="Asst",
        )
        Notification.objects.filter(recipient=assistant).delete()
        asst_data = self._get(assistant).json()
        self.assertEqual(asst_data["recent_activity"], [])

    def test_cross_tenant_p2_isolation(self):
        other_owner, other_cab = _create_owner("p2-iso@test.com", "+212633000099", "Iso Cab")
        _create_case(other_cab, other_owner, title="Secret Portfolio Matter")
        ConflictCheck.objects.create(
            cabinet=other_cab,
            initiated_by=other_owner,
            search_query="Foreign Conflict",
            result_count=1,
            status=ConflictCheck.ReviewStatus.PENDING_REVIEW,
        )
        data = self._get(self.owner).json()
        blob = str(data).lower()
        self.assertNotIn("secret portfolio", blob)
        self.assertNotIn("foreign conflict", blob)
        queries = {c["search_query"] for c in (data["conflict_review_queue"] or [])}
        self.assertNotIn("Foreign Conflict", queries)

    def test_p2_keys_present(self):
        data = self._get(self.owner).json()
        for key in ("portfolio", "crm", "team", "conflict_review_queue"):
            self.assertIn(key, data)
        self.assertEqual(status.HTTP_200_OK, self._get(self.owner).status_code)
