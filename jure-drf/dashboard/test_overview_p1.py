"""P1 role-aware dashboard overview: scopes, finance gate, calendar dedupe, isolation."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from clients.models import Client as ClientProfile
from core.testing import api_client_for
from dashboard.kpi import month_bounds
from dashboard.services.overview import (
    _dedupe_events,
    build_overview_payload,
    is_finance_authorized,
    resolve_dashboard_role,
    resolve_scope,
)
from finance.models import Invoice
from lawyers.models import LawyerProfile
from tasks.models import Appointment, Task
from users.models import User

UserModel = get_user_model()


def _aware(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _create_owner(email: str, phone: str, trade_name: str = "P1 Cabinet"):
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


def _create_client(cabinet, *, email: str, phone: str):
    return UserModel.objects.create_user(
        email=email,
        password="clientpass123",
        first_name="Client",
        last_name="Person",
        phone=phone,
        country="MA",
        cabinet=cabinet,
        is_cabinet_member=False,
    )


def _create_case(cabinet, assignee, *, title="Matter", status_value=Case.CaseStatus.OPEN):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=assignee,
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


class RoleResolutionUnitTest(APITestCase):
    def test_owner_without_role_resolves_owner(self):
        user, cabinet = _create_owner("own@test.com", "+212600000001")
        user.role = None
        user.save(update_fields=["role"])
        self.assertEqual(resolve_dashboard_role(user), User.Role.OWNER)
        self.assertEqual(resolve_scope(resolve_dashboard_role(user)), "cabinet")

    def test_lawyer_is_personal_scope(self):
        _, cabinet = _create_owner("own2@test.com", "+212600000002")
        lawyer = _create_member(
            cabinet, email="law@test.com", phone="+212600000003", role=User.Role.LAWYER
        )
        self.assertEqual(resolve_scope(resolve_dashboard_role(lawyer)), "personal")

    def test_finance_auth_owner_admin_only_no_superuser_bypass(self):
        owner, cabinet = _create_owner("fin-o@test.com", "+212600000004")
        admin = _create_member(
            cabinet, email="fin-a@test.com", phone="+212600000005", role=User.Role.ADMIN
        )
        manager = _create_member(
            cabinet, email="fin-m@test.com", phone="+212600000006", role=User.Role.MANAGER
        )
        lawyer = _create_member(
            cabinet, email="fin-l@test.com", phone="+212600000007", role=User.Role.LAWYER
        )
        assistant = _create_member(
            cabinet, email="fin-as@test.com", phone="+212600000008", role=User.Role.ASSISTANT
        )
        viewer = _create_member(
            cabinet, email="fin-v@test.com", phone="+212600000009", role=User.Role.VIEWER
        )
        super_lawyer = _create_member(
            cabinet,
            email="fin-su@test.com",
            phone="+212600000010",
            role=User.Role.LAWYER,
            first_name="Super",
        )
        super_lawyer.is_superuser = True
        super_lawyer.is_staff = True
        super_lawyer.save(update_fields=["is_superuser", "is_staff"])

        self.assertTrue(is_finance_authorized(owner))
        self.assertTrue(is_finance_authorized(admin))
        self.assertFalse(is_finance_authorized(manager))
        self.assertFalse(is_finance_authorized(lawyer))
        self.assertFalse(is_finance_authorized(assistant))
        self.assertFalse(is_finance_authorized(viewer))
        self.assertFalse(
            is_finance_authorized(super_lawyer),
            "superuser without OWNER/ADMIN role must not receive dashboard finance",
        )


class DedupeUnitTest(APITestCase):
    def test_dedupe_by_source_type_and_id(self):
        events = [
            {"sourceType": "CASE_DEADLINE", "sourceId": "1", "title": "A"},
            {"sourceType": "CASE_DEADLINE", "sourceId": "1", "title": "A dup"},
            {"sourceType": "CASE_DUE_DATE", "sourceId": "1", "title": "B"},
        ]
        out = _dedupe_events(events)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["title"], "A")
        self.assertEqual(out[1]["title"], "B")


class OverviewRoleScopeAPITest(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = _create_owner("p1-owner@test.com", "+212611000001")
        self.admin = _create_member(
            self.cabinet, email="p1-admin@test.com", phone="+212611000002", role=User.Role.ADMIN
        )
        self.manager = _create_member(
            self.cabinet,
            email="p1-manager@test.com",
            phone="+212611000003",
            role=User.Role.MANAGER,
        )
        self.lawyer = _create_member(
            self.cabinet,
            email="p1-lawyer@test.com",
            phone="+212611000004",
            role=User.Role.LAWYER,
            first_name="Lawyer",
        )
        self.assistant = _create_member(
            self.cabinet,
            email="p1-asst@test.com",
            phone="+212611000005",
            role=User.Role.ASSISTANT,
            first_name="Asst",
        )
        self.viewer = _create_member(
            self.cabinet,
            email="p1-viewer@test.com",
            phone="+212611000006",
            role=User.Role.VIEWER,
            first_name="Viewer",
        )
        self.url = reverse("dashboard-overview")
        self.today = timezone.localdate()

        # Lawyer owns one open case + one open task; owner owns another pair.
        self.lawyer_case = _create_case(self.cabinet, self.lawyer, title="Lawyer Case")
        self.owner_case = _create_case(self.cabinet, self.owner, title="Owner Case")
        self.lawyer_task = _create_task(
            self.cabinet,
            title="Lawyer Task",
            due_date=self.today,
            assigned_to=self.lawyer,
        )
        self.lawyer_task.assignees.add(self.lawyer)
        self.owner_task = _create_task(
            self.cabinet,
            title="Owner Task",
            due_date=self.today,
            assigned_to=self.owner,
        )
        self.owner_task.assignees.add(self.owner)
        self.overdue_lawyer = _create_task(
            self.cabinet,
            title="Lawyer Overdue",
            due_date=self.today - timedelta(days=2),
            assigned_to=self.lawyer,
        )
        self.overdue_lawyer.assignees.add(self.lawyer)

        tz = timezone.get_current_timezone()
        start = timezone.make_aware(datetime.combine(self.today, datetime.min.time().replace(hour=10)), tz)
        end = start + timedelta(hours=1)
        self.lawyer_appt = Appointment.objects.create(
            title="Lawyer Appt",
            start_at=start,
            end_at=end,
            cabinet=self.cabinet,
            created_by=self.lawyer,
        )
        self.lawyer_appt.attendees.add(self.lawyer)
        self.owner_appt = Appointment.objects.create(
            title="Owner Appt",
            start_at=start + timedelta(hours=2),
            end_at=end + timedelta(hours=2),
            cabinet=self.cabinet,
            created_by=self.owner,
        )
        self.owner_appt.attendees.add(self.owner)

    def _get(self, user):
        return api_client_for(user).get(self.url)

    def test_owner_cabinet_scope_sees_all_tasks(self):
        data = self._get(self.owner).json()
        self.assertEqual(data["meta"]["role"], User.Role.OWNER)
        self.assertEqual(data["meta"]["scope"], "cabinet")
        titles = {t["title"] for t in data["today_tasks"]}
        self.assertIn("Lawyer Task", titles)
        self.assertIn("Owner Task", titles)
        self.assertEqual(data["kpis"]["tasks_due_today"]["value"], 2)
        self.assertEqual(data["kpis"]["active_cases"]["value"], 2)
        self.assertIsNotNone(data["finance"])
        self.assertIn("invoiced", data["finance"])
        self.assertNotIn("mrr", data["finance"])
        self.assertNotIn("arpu", data["finance"])

    def test_finance_role_matrix_api(self):
        """OWNER/ADMIN get finance; all other cabinet roles get null (incl. superuser lawyer)."""
        expect_finance = {
            User.Role.OWNER: True,
            User.Role.ADMIN: True,
            User.Role.MANAGER: False,
            User.Role.LAWYER: False,
            User.Role.ASSISTANT: False,
            User.Role.VIEWER: False,
        }
        users = {
            User.Role.OWNER: self.owner,
            User.Role.ADMIN: self.admin,
            User.Role.MANAGER: self.manager,
            User.Role.LAWYER: self.lawyer,
            User.Role.ASSISTANT: self.assistant,
            User.Role.VIEWER: self.viewer,
        }
        for role, user in users.items():
            data = self._get(user).json()
            if expect_finance[role]:
                self.assertIsNotNone(data["finance"], role)
            else:
                self.assertIsNone(data["finance"], role)

        super_user = _create_member(
            self.cabinet,
            email="p1-super@test.com",
            phone="+212611000066",
            role=User.Role.VIEWER,
            first_name="Root",
        )
        super_user.is_superuser = True
        super_user.is_staff = True
        super_user.save(update_fields=["is_superuser", "is_staff"])
        su_data = self._get(super_user).json()
        self.assertIsNone(su_data["finance"])
        self.assertEqual(su_data["meta"]["role"], User.Role.VIEWER)

    def test_lawyer_personal_scope_hides_others_work(self):
        data = self._get(self.lawyer).json()
        self.assertEqual(data["meta"]["scope"], "personal")
        self.assertIsNone(data["finance"])
        titles = {t["title"] for t in data["today_tasks"]}
        self.assertEqual(titles, {"Lawyer Task"})
        self.assertEqual(data["kpis"]["tasks_due_today"]["value"], 1)
        self.assertEqual(data["kpis"]["tasks_overdue"]["value"], 1)
        self.assertEqual(data["kpis"]["active_cases"]["value"], 1)
        case_titles = {c["title"] for c in data["recent_cases"]}
        self.assertEqual(case_titles, {"Lawyer Case"})
        my_day_task_titles = {t["title"] for t in data["my_day"]["tasks_due_today"]}
        self.assertEqual(my_day_task_titles, {"Lawyer Task"})
        appt_titles = {a["title"] for a in data["my_day"]["appointments_today"]}
        self.assertEqual(appt_titles, {"Lawyer Appt"})
        attention_kinds = {a["kind"] for a in data["attention"]}
        self.assertIn("task_overdue", attention_kinds)
        self.assertIn("task_due_today", attention_kinds)
        self.assertIn("appointment_today", attention_kinds)
        # Personal scope: recipient notifications OK; never cabinet ActivityLog fallback
        for item in data["recent_activity"]:
            self.assertEqual(item.get("kind"), "notification")
        blob = str(data["recent_activity"]).lower()
        self.assertNotIn("owner case", blob)

    def test_personal_scope_hides_other_lawyer_activity(self):
        from dashboard.models import ActivityLog

        # Firm-visible activity about the owner's matter / task
        ActivityLog.objects.create(
            cabinet=self.cabinet,
            kind="matter_closed",
            message="Matter closed: SECRET — Owner Case (OPEN → CLOSED)",
            entity_type="case",
            entity_id=str(self.owner_case.id),
        )
        _create_task(
            self.cabinet,
            title="Owner Done Secret",
            due_date=self.today,
            status_value=Task.TaskStatus.DONE,
            assigned_to=self.owner,
        )

        owner_data = self._get(self.owner).json()
        self.assertTrue(len(owner_data["recent_activity"]) > 0)

        for user in (self.lawyer, self.assistant):
            data = self._get(user).json()
            self.assertEqual(data["meta"]["scope"], "personal")
            # May include own notifications, but never cabinet-wide logs / owner secrets
            for item in data["recent_activity"]:
                self.assertEqual(
                    item.get("kind"),
                    "notification",
                    f"{user.role} must not receive ActivityLog fallback",
                )
            blob = str(data["recent_activity"]).lower()
            self.assertNotIn("owner case", blob)
            self.assertNotIn("owner done secret", blob)
            self.assertNotIn("secret —", blob)
            self.assertNotIn("matter closed: secret", blob)

    def test_assistant_personal_scope(self):
        # Assign assistant a task only.
        task = _create_task(
            self.cabinet,
            title="Asst Task",
            due_date=self.today,
            assigned_to=self.assistant,
        )
        task.assignees.add(self.assistant)
        data = self._get(self.assistant).json()
        self.assertEqual(data["meta"]["scope"], "personal")
        self.assertIsNone(data["finance"])
        titles = {t["title"] for t in data["today_tasks"]}
        self.assertEqual(titles, {"Asst Task"})

    def test_viewer_cabinet_scope_no_finance(self):
        data = self._get(self.viewer).json()
        self.assertEqual(data["meta"]["role"], User.Role.VIEWER)
        self.assertEqual(data["meta"]["scope"], "cabinet")
        self.assertIsNone(data["finance"])
        # Cabinet-wide visibility of operational counts
        self.assertEqual(data["kpis"]["tasks_due_today"]["value"], 2)

    def test_query_cabinet_id_ignored(self):
        other_owner, other_cab = _create_owner("other-p1@test.com", "+212611000099", "Other Cab")
        _create_client(other_cab, email="secret-c@test.com", phone="+212611000098")
        # Attempt to pass foreign cabinet — must still resolve to caller's cabinet.
        response = api_client_for(self.lawyer).get(
            self.url, {"cabinet_id": other_cab.id, "cabinet": other_cab.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["meta"]["cabinet_id"], self.cabinet.id)
        self.assertNotEqual(data["meta"]["cabinet_id"], other_cab.id)

    def test_cross_tenant_isolation(self):
        other_owner, other_cab = _create_owner("iso@test.com", "+212611000088", "Iso Cab")
        _create_case(other_cab, other_owner, title="Secret Matter")
        _create_task(
            other_cab,
            title="Secret Task",
            due_date=self.today,
            assigned_to=other_owner,
        )
        data = self._get(self.owner).json()
        titles = {t["title"] for t in data["today_tasks"]}
        self.assertNotIn("Secret Task", titles)
        case_titles = {c["title"] for c in data["recent_cases"]}
        self.assertNotIn("Secret Matter", case_titles)

    def test_p1_kpi_keys_present_and_no_fake_conflict_or_saas(self):
        data = self._get(self.owner).json()
        for key in (
            "active_cases",
            "cases_opened_mtd",
            "cases_closed_mtd",
            "tasks_due_today",
            "tasks_overdue",
            "upcoming_deadlines_7d",
            "active_clients",
        ):
            self.assertIn(key, data["kpis"])
            self.assertIn("value", data["kpis"][key])
        self.assertIsNone(data["kpis"]["open_high_risk_matters"])
        blob = str(data).lower()
        self.assertNotIn("schedule.conflict", blob)
        self.assertNotIn("mrr", blob)
        self.assertNotIn("arpu", blob)
        self.assertIn("attention", data)
        self.assertIn("my_day", data)
        self.assertIn("tools", data)
        self.assertIn("meta", data)

    def test_cases_closed_mtd_uses_modified_window(self):
        case = _create_case(
            self.cabinet, self.owner, title="To Close", status_value=Case.CaseStatus.OPEN
        )
        case.status = Case.CaseStatus.CLOSED
        case.save(update_fields=["status"])
        # Touch modified into current month explicitly
        _, month_start, _ = month_bounds()
        Case.objects.filter(pk=case.pk).update(modified=_aware(month_start + timedelta(days=2)))
        data = self._get(self.owner).json()
        self.assertGreaterEqual(data["kpis"]["cases_closed_mtd"]["value"], 1)

    def test_active_cases_excludes_terminal_statuses(self):
        _create_case(self.cabinet, self.owner, status_value=Case.CaseStatus.ARCHIVED)
        _create_case(self.cabinet, self.owner, status_value=Case.CaseStatus.CANCELLED)
        _create_case(self.cabinet, self.owner, status_value=Case.CaseStatus.CLOSED)
        data = self._get(self.owner).json()
        # Only the two OPEN cases from setUp remain active
        self.assertEqual(data["kpis"]["active_cases"]["value"], 2)

    def test_finance_matches_service_for_owner(self):
        client_user = _create_client(self.cabinet, email="inv-c@test.com", phone="+212611000077")
        profile = ClientProfile.objects.create(user=client_user, client_type=ClientProfile.ClientType.INDIVIDUAL)
        case = _create_case(self.cabinet, self.owner, title="Billed Matter")
        Invoice.objects.create(
            cabinet=self.cabinet,
            invoice_number=f"INV-{uuid.uuid4().hex[:6].upper()}",
            case=case,
            client=profile,
            amount_ht=Decimal("100.00"),
            tva_amount=Decimal("20.00"),
            amount_ttc=Decimal("120.00"),
            status=Invoice.Status.SENT,
            created_by=self.owner,
        )
        # issued_date is auto_now_add — within current month
        data = self._get(self.owner).json()
        self.assertIsNotNone(data["finance"])
        # Firm TVA may be off by default → amount_ttc collapses to HT via Invoice.save().
        invoice = Invoice.objects.get(case=case)
        self.assertEqual(float(data["finance"]["invoiced"]), float(invoice.amount_ttc))
        self.assertGreater(float(data["finance"]["invoiced"]), 0)
        lawyer_data = self._get(self.lawyer).json()
        self.assertIsNone(lawyer_data["finance"])


class OverviewPayloadUnitTest(APITestCase):
    def test_build_overview_payload_direct(self):
        owner, cabinet = _create_owner("unit@test.com", "+212622000001")
        payload = build_overview_payload(user=owner, cabinet=cabinet, request=None)
        self.assertEqual(payload["meta"]["cabinet_id"], cabinet.id)
        self.assertEqual(payload["meta"]["scope"], "cabinet")
        self.assertIsInstance(payload["stats"], list)
        self.assertEqual(len(payload["stats"]), 3)
        self.assertIn("active_clients", payload["definitions"])
        self.assertIn("User", payload["definitions"]["active_clients"])
        self.assertIn("clients.Client", payload["definitions"]["active_clients"])

    def test_active_clients_kpi_counts_user_not_fiscal_profile(self):
        """Dashboard headcount = User clients; fiscal Client profile is optional."""
        owner, cabinet = _create_owner("cli-def@test.com", "+212622000011")
        client_user = _create_client(cabinet, email="cli-u@test.com", phone="+212622000012")
        # No ClientProfile row yet — still counted as an active client.
        payload = build_overview_payload(user=owner, cabinet=cabinet, request=None)
        self.assertEqual(payload["kpis"]["active_clients"]["value"], 1)
        self.assertEqual(ClientProfile.objects.filter(user=client_user).count(), 0)

    def test_mom_no_invented_percent_when_previous_zero(self):
        owner, cabinet = _create_owner("mom@test.com", "+212622000021")
        _create_client(cabinet, email="new-only@test.com", phone="+212622000022")
        # Client joined "now" → previous baseline 0 → no_previous_data
        from django.contrib.auth import get_user_model

        u = get_user_model().objects.get(email="new-only@test.com")
        _, month_start, _ = month_bounds()
        get_user_model().objects.filter(pk=u.pk).update(
            date_joined=_aware(month_start + timedelta(days=3))
        )
        payload = build_overview_payload(user=owner, cabinet=cabinet, request=None)
        clients = payload["kpis"]["active_clients"]
        self.assertEqual(clients["value"], 1)
        self.assertEqual(clients["change_state"], "no_previous_data")
        self.assertIsNone(clients["change"])
        self.assertIsNone(clients["growth"])
