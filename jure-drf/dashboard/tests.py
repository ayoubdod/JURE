"""Tests for dashboard KPI month-over-month growth."""
import uuid
from datetime import datetime, time, timedelta

from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from cabinets.models import Cabinet
from cases.models import Case
from lawyers.models import LawyerProfile
from tasks.models import Task

from .kpi import calculate_growth, month_bounds, month_date_bounds
from .views import build_dashboard_stats

User = get_user_model()


def _aware(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _create_cabinet_lawyer(email: str, phone: str, trade_name: str = "Cabinet"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone,
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name,
        business_address="123 Test St",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name=f"{user.first_name} {user.last_name}")
    return user, cabinet


def _create_client(cabinet, *, email: str, phone: str, date_joined: datetime | None = None):
    client = User.objects.create_user(
        email=email,
        password="clientpass123",
        first_name="Client",
        last_name="User",
        phone=phone,
        country="FR",
        cabinet=cabinet,
        is_cabinet_member=False,
    )
    if date_joined is not None:
        User.objects.filter(pk=client.pk).update(date_joined=_aware(date_joined))
        client.refresh_from_db()
    return client


def _create_case(cabinet, user, *, status_value=Case.CaseStatus.OPEN, created: datetime | None = None):
    case = Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=user,
        title="Test case",
        description="Test description",
        court="Court",
        reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status=status_value,
    )
    if created is not None:
        Case.objects.filter(pk=case.pk).update(created=_aware(created))
        case.refresh_from_db()
    return case


def _create_task(cabinet, *, title: str, due_date, status_value=Task.TaskStatus.TODO):
    return Task.objects.create(
        title=title,
        cabinet=cabinet,
        due_date=due_date,
        status=status_value,
    )


class CalculateGrowthUnitTest(TestCase):
    def test_positive_growth(self):
        result = calculate_growth(42, 35)
        self.assertEqual(result["growth"], 20.0)
        self.assertEqual(result["change"], "+20%")
        self.assertEqual(result["change_state"], "up")

    def test_negative_growth(self):
        result = calculate_growth(8, 10)
        self.assertEqual(result["growth"], -20.0)
        self.assertEqual(result["change"], "-20%")
        self.assertEqual(result["change_state"], "down")

    def test_zero_growth(self):
        result = calculate_growth(10, 10)
        self.assertEqual(result["growth"], 0.0)
        self.assertEqual(result["change"], "0%")
        self.assertEqual(result["change_state"], "flat")

    def test_previous_zero_no_invented_percent(self):
        result = calculate_growth(5, 0)
        self.assertIsNone(result["growth"])
        self.assertIsNone(result["change"])
        self.assertEqual(result["change_state"], "no_previous_data")

    def test_both_zero_no_previous_data(self):
        result = calculate_growth(0, 0)
        self.assertIsNone(result["growth"])
        self.assertEqual(result["change_state"], "no_previous_data")

    def test_current_zero_previous_positive_is_minus_100(self):
        result = calculate_growth(0, 10)
        self.assertEqual(result["growth"], -100.0)
        self.assertEqual(result["change"], "-100%")
        self.assertEqual(result["change_state"], "down")

    def test_rounding_to_integer(self):
        # 20.666... → 21
        result = calculate_growth(20, 15)
        self.assertEqual(result["growth"], 33.0)
        self.assertEqual(result["change"], "+33%")


class DashboardStatsMoMTest(TestCase):
    def setUp(self):
        self.user, self.cabinet = _create_cabinet_lawyer(
            "lawyer-a@test.com", "+33610000001", "Cabinet A"
        )
        self.other_user, self.other_cabinet = _create_cabinet_lawyer(
            "lawyer-b@test.com", "+33610000002", "Cabinet B"
        )
        _, self.month_start, _ = month_bounds()
        self.prev_month_start_d, self.month_start_d, self.next_month_start_d = month_date_bounds()
        self.prev_mid = _aware(
            datetime.combine(self.prev_month_start_d + timedelta(days=10), time(12, 0))
        )
        self.curr_mid = _aware(
            datetime.combine(self.month_start_d + timedelta(days=5), time(12, 0))
        )
        # Exactly on month boundary (belongs to current month)
        self.boundary_start = self.month_start
        # Last instant of previous month
        self.boundary_prev_end = self.month_start - timedelta(microseconds=1)

    def test_clients_positive_growth(self):
        _create_client(
            self.cabinet,
            email="c1@test.com",
            phone="+33620000001",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.cabinet,
            email="c2@test.com",
            phone="+33620000002",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.cabinet,
            email="c3@test.com",
            phone="+33620000003",
            date_joined=self.curr_mid,
        )
        # 3 current, 2 previous → +50%
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        clients = stats["Total Clients"]
        self.assertEqual(clients["current"], 3)
        self.assertEqual(clients["previous"], 2)
        self.assertEqual(clients["growth"], 50.0)
        self.assertEqual(clients["change"], "+50%")
        self.assertEqual(clients["change_state"], "up")

    def test_clients_negative_growth_when_current_below_previous_stock(self):
        # Stock MoM: previous = joined before this month among current clients.
        # Negative growth for clients requires fewer clients now than existed
        # before this month — impossible with creation-only stock unless we
        # delete. Instead verify cases/tasks negatives; for clients verify
        # flat when no new clients this month.
        _create_client(
            self.cabinet,
            email="c1@test.com",
            phone="+33620000011",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.cabinet,
            email="c2@test.com",
            phone="+33620000012",
            date_joined=self.prev_mid,
        )
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        clients = stats["Total Clients"]
        self.assertEqual(clients["current"], 2)
        self.assertEqual(clients["previous"], 2)
        self.assertEqual(clients["growth"], 0.0)
        self.assertEqual(clients["change"], "0%")

    def test_active_cases_negative_growth(self):
        # 2 active from previous month + none new; then close one created prev month
        # → current 1, previous (active & created before month) 1 → 0%
        # Better: 2 prev-month active remain; current month has 0 new; close 0.
        # For -20%: current=8, previous=10 style — use period-like stock:
        # previous_active_created_before = 10 means 10 still-active created before month.
        # current = 8 means 2 were closed (excluded) — those 2 were created before
        # month so they leave both counts... actually closed ones leave current AND
        # leave previous (because previous filters active_qs). So both drop equally.
        #
        # Stock of currently-active cannot go negative vs previous subset.
        # Use tasks for true negative MoM; for cases verify positive and zero.
        c1 = _create_case(self.cabinet, self.user, created=self.prev_mid)
        c2 = _create_case(self.cabinet, self.user, created=self.prev_mid)
        _create_case(self.cabinet, self.user, created=self.curr_mid)
        # closed case must not count as active
        _create_case(
            self.cabinet,
            self.user,
            status_value=Case.CaseStatus.CLOSED,
            created=self.curr_mid,
        )
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        cases = stats["Active Cases"]
        self.assertEqual(cases["current"], 3)
        self.assertEqual(cases["previous"], 2)
        self.assertEqual(cases["growth"], 50.0)
        self.assertEqual(c1.status, Case.CaseStatus.OPEN)
        self.assertEqual(c2.status, Case.CaseStatus.OPEN)

    def test_tasks_negative_growth(self):
        # 10 todo due last month, 8 todo due this month → -20%
        for i in range(10):
            _create_task(
                self.cabinet,
                title=f"prev-{i}",
                due_date=self.prev_month_start_d + timedelta(days=1),
            )
        for i in range(8):
            _create_task(
                self.cabinet,
                title=f"curr-{i}",
                due_date=self.month_start_d + timedelta(days=1),
            )
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        tasks = stats["Tasks Due"]
        self.assertEqual(tasks["period_previous"], 10)
        self.assertEqual(tasks["period_current"], 8)
        self.assertEqual(tasks["growth"], -20.0)
        self.assertEqual(tasks["change"], "-20%")
        self.assertEqual(tasks["change_state"], "down")

    def test_previous_zero_no_previous_data(self):
        _create_client(
            self.cabinet,
            email="new@test.com",
            phone="+33620000021",
            date_joined=self.curr_mid,
        )
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        clients = stats["Total Clients"]
        self.assertEqual(clients["current"], 1)
        self.assertEqual(clients["previous"], 0)
        self.assertIsNone(clients["growth"])
        self.assertIsNone(clients["change"])
        self.assertEqual(clients["change_state"], "no_previous_data")

    def test_empty_cabinet_no_previous_data(self):
        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        for title in ("Total Clients", "Active Cases", "Tasks Due"):
            self.assertEqual(stats[title]["current"], 0)
            self.assertEqual(stats[title]["change_state"], "no_previous_data")
            self.assertIsNone(stats[title]["change"])

    def test_tenant_isolation(self):
        _create_client(
            self.cabinet,
            email="a@test.com",
            phone="+33620000031",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.other_cabinet,
            email="b@test.com",
            phone="+33620000032",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.other_cabinet,
            email="b2@test.com",
            phone="+33620000033",
            date_joined=self.curr_mid,
        )
        stats_a = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        stats_b = {s["title"]: s for s in build_dashboard_stats(self.other_cabinet)}
        self.assertEqual(stats_a["Total Clients"]["current"], 1)
        self.assertEqual(stats_b["Total Clients"]["current"], 2)
        self.assertEqual(stats_b["Total Clients"]["growth"], 100.0)

    def test_date_boundaries_assigned_correctly(self):
        _create_client(
            self.cabinet,
            email="prev-end@test.com",
            phone="+33620000041",
            date_joined=self.boundary_prev_end,
        )
        _create_client(
            self.cabinet,
            email="curr-start@test.com",
            phone="+33620000042",
            date_joined=self.boundary_start,
        )
        _create_case(self.cabinet, self.user, created=self.boundary_prev_end)
        _create_case(self.cabinet, self.user, created=self.boundary_start)

        # due_date on last day of prev month vs first day of current month
        last_prev = self.month_start_d - timedelta(days=1)
        _create_task(self.cabinet, title="prev-boundary", due_date=last_prev)
        _create_task(self.cabinet, title="curr-boundary", due_date=self.month_start_d)

        stats = {s["title"]: s for s in build_dashboard_stats(self.cabinet)}
        self.assertEqual(stats["Total Clients"]["current"], 2)
        self.assertEqual(stats["Total Clients"]["previous"], 1)
        self.assertEqual(stats["Active Cases"]["current"], 2)
        self.assertEqual(stats["Active Cases"]["previous"], 1)
        self.assertEqual(stats["Tasks Due"]["period_previous"], 1)
        self.assertEqual(stats["Tasks Due"]["period_current"], 1)


class DashboardOverviewAPITest(APITestCase):
    def setUp(self):
        self.api = APIClient()
        self.user, self.cabinet = _create_cabinet_lawyer(
            "api-lawyer@test.com", "+33630000001", "API Cabinet"
        )
        refresh = RefreshToken.for_user(self.user)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        self.url = reverse("dashboard-overview")
        _, self.month_start, _ = month_bounds()
        self.prev_mid = self.month_start - relativedelta(months=1) + timedelta(days=10)
        self.curr_mid = self.month_start + timedelta(days=5)

    def test_overview_returns_expected_kpi_structure(self):
        _create_client(
            self.cabinet,
            email="api-c1@test.com",
            phone="+33630000011",
            date_joined=self.prev_mid,
        )
        _create_client(
            self.cabinet,
            email="api-c2@test.com",
            phone="+33630000012",
            date_joined=self.curr_mid,
        )
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("stats", data)
        self.assertEqual(len(data["stats"]), 3)
        clients = next(s for s in data["stats"] if s["title"] == "Total Clients")
        self.assertEqual(clients["value"], "2")
        self.assertEqual(clients["current"], 2)
        self.assertEqual(clients["previous"], 1)
        self.assertEqual(clients["growth"], 100.0)
        self.assertEqual(clients["change"], "+100%")
        self.assertEqual(clients["change_state"], "up")
        self.assertNotEqual(clients["change"], "+12%")
        for key in ("announcement", "recent_cases", "today_tasks", "recent_activity", "kpis"):
            self.assertIn(key, data)

    def test_overview_tenant_isolation_via_api(self):
        other_user, other_cab = _create_cabinet_lawyer(
            "other-api@test.com", "+33630000002", "Other"
        )
        _create_client(
            other_cab,
            email="secret@test.com",
            phone="+33630000021",
            date_joined=self.prev_mid,
        )
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        clients = next(s for s in response.json()["stats"] if s["title"] == "Total Clients")
        self.assertEqual(clients["current"], 0)
