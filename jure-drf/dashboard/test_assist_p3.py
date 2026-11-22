"""P3 dashboard JURIA assist: briefing + NL ask (mocked LLM, privacy, flags)."""
from __future__ import annotations

import uuid
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from core.testing import api_client_for
from dashboard.services.assist_context import build_assist_context, rank_sources
from lawyers.models import LawyerProfile
from tasks.models import Task
from users.models import User

UserModel = get_user_model()


def _create_owner(email: str, phone: str):
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
        trade_name="P3 Cabinet",
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


@override_settings(JURIA_ENABLED=True, DEEPSEEK_API_KEY="sk-test", JURIA_PROVIDER="deepseek")
class AssistContextUnitTest(APITestCase):
    def test_context_is_scope_aware(self):
        owner, cabinet = _create_owner("p3-ctx-o@test.com", "+212644000001")
        lawyer = _create_member(
            cabinet, email="p3-ctx-l@test.com", phone="+212644000002", role=User.Role.LAWYER, first_name="Law"
        )
        Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=cabinet,
            assigned_to=owner,
            title="Owner Only Matter",
            description="Desc",
            court="Court",
            reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
            status=Case.CaseStatus.OPEN,
        )
        Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=cabinet,
            assigned_to=lawyer,
            title="Lawyer Matter",
            description="Desc",
            court="Court",
            reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
            status=Case.CaseStatus.OPEN,
        )
        today = timezone.localdate()
        Task.objects.create(
            title="Lawyer Overdue Secret",
            cabinet=cabinet,
            due_date=today - timedelta(days=2),
            status=Task.TaskStatus.TODO,
            assigned_to=lawyer,
        )

        owner_ctx = build_assist_context(user=owner, cabinet=cabinet)
        lawyer_ctx = build_assist_context(user=lawyer, cabinet=cabinet)
        self.assertEqual(owner_ctx["facts"]["scope"], "cabinet")
        self.assertEqual(lawyer_ctx["facts"]["scope"], "personal")
        self.assertGreaterEqual(owner_ctx["facts"]["kpis"]["active_cases"], 2)
        self.assertEqual(lawyer_ctx["facts"]["kpis"]["active_cases"], 1)
        lawyer_blob = lawyer_ctx["text_pack"].lower()
        self.assertNotIn("owner only matter", lawyer_blob)

    def test_rank_sources_prefers_token_overlap(self):
        sources = [
            {"id": 1, "kind": "task_overdue", "title": "File brief", "text": "task_overdue: File brief"},
            {"id": 2, "kind": "appointment_today", "title": "Client call", "text": "appointment_today: Client call"},
        ]
        ranked = rank_sources("overdue brief filing", sources)
        self.assertEqual(ranked[0]["id"], 1)


@override_settings(JURIA_ENABLED=True, DEEPSEEK_API_KEY="sk-test", JURIA_PROVIDER="deepseek")
class AssistAPITest(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = _create_owner("p3-api-o@test.com", "+212644000011")
        self.lawyer = _create_member(
            self.cabinet,
            email="p3-api-l@test.com",
            phone="+212644000012",
            role=User.Role.LAWYER,
            first_name="Lawyer",
        )
        self.briefing_url = reverse("dashboard-briefing")
        self.ask_url = reverse("dashboard-ask")
        self.overview_url = reverse("dashboard-overview")

    @patch("dashboard.services.assist._call_llm", return_value=("Briefing text", 12))
    def test_briefing_returns_caveats_and_sources(self, _mock):
        res = api_client_for(self.owner).get(self.briefing_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["kind"], "briefing")
        self.assertEqual(data["text"], "Briefing text")
        self.assertTrue(any("vector" in c.lower() or "semantic" in c.lower() for c in data["caveats"]))
        self.assertEqual(data["retrieval"]["method"], "dashboard_queues_keyword")
        self.assertIn("sources", data)
        self.assertIn("facts", data)

    @patch("dashboard.services.assist._call_llm", return_value=("You have 1 overdue task.", 8))
    def test_ask_requires_question_and_answers(self, _mock):
        bad = api_client_for(self.owner).post(self.ask_url, {"question": ""}, format="json")
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        ok = api_client_for(self.owner).post(
            self.ask_url, {"question": "How many overdue tasks?", "language": "en"}, format="json"
        )
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        data = ok.json()
        self.assertEqual(data["kind"], "answer")
        self.assertIn("overdue", data["text"].lower())
        self.assertTrue(data["caveats"])

    def test_juria_disabled_returns_503(self):
        with self.settings(JURIA_ENABLED=False):
            res = api_client_for(self.owner).get(self.briefing_url)
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_overview_exposes_juria_assist_flags(self):
        data = api_client_for(self.owner).get(self.overview_url).json()
        self.assertTrue(data["tools"]["juria_enabled"])
        self.assertTrue(data["tools"]["juria_briefing"])
        self.assertTrue(data["tools"]["juria_ask"])

    def test_cross_tenant_ask_isolation(self):
        other, other_cab = _create_owner("p3-iso@test.com", "+212644000099")
        Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=other_cab,
            assigned_to=other,
            title="Secret Foreign Matter XYZ",
            description="Desc",
            court="Court",
            reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
            status=Case.CaseStatus.OPEN,
        )
        with patch("dashboard.services.assist._call_llm", return_value=("ok", 1)) as mock_llm:
            res = api_client_for(self.owner).post(
                self.ask_url, {"question": "What matters are active?"}, format="json"
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # LLM must not receive the foreign matter title in retrieved context
        _args, kwargs = mock_llm.call_args
        retrieved = kwargs.get("retrieved_block") or ""
        self.assertNotIn("Secret Foreign Matter XYZ", retrieved)
