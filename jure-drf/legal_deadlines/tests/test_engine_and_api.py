"""Tests for the legal deadline calculation engine and API tenancy."""
from __future__ import annotations

import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from legal_deadlines.engine import CalculationError, calculate_deadline, resolve_active_rule
from legal_deadlines.models import CalculatedDeadline, DeadlineRule, LegalHoliday
from legal_deadlines.seed import seed_all

User = get_user_model()


_PHONE_SEQ = 0


def _create_cabinet_user(email: str, phone: str | None = None):
    global _PHONE_SEQ
    _PHONE_SEQ += 1
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone or f"+3361{_PHONE_SEQ:07d}",
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=f"Cabinet {email}",
        business_address="Casablanca",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


def _create_case(cabinet, user, title="Test matter"):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=user,
        title=title,
        description="desc",
        court="TPI Casablanca",
        reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status=Case.CaseStatus.OPEN,
        client=user,
    )


class EngineDelaiFrancTests(TestCase):
    def setUp(self):
        seed_all()
        self.rule = DeadlineRule.objects.get(
            code="MA_CIVIL_APPEAL",
            version="1974.1",
        )

    def test_known_delai_franc_example_notification_1_march_30_days(self):
        """
        Verified example (doctrine / Art. 602 style):
        notification 1 Mar → 30-day délai franc → 1 Apr (absent holidays).
        """
        result = calculate_deadline(date(2026, 3, 1), self.rule, holidays=[])
        self.assertEqual(result.calculated_deadline, date(2026, 4, 1))
        self.assertEqual(result.explanation["computation_method"], "delai_franc")

    def test_triggering_day_excluded(self):
        result = calculate_deadline(date(2026, 1, 5), self.rule, holidays=[])
        # 5 Jan + délai franc 30 → 5 Feb
        self.assertEqual(result.calculated_deadline, date(2026, 2, 5))

    def test_month_and_year_boundaries(self):
        result = calculate_deadline(date(2025, 12, 15), self.rule, holidays=[])
        self.assertEqual(result.calculated_deadline, date(2026, 1, 15))

    def test_february_non_leap(self):
        # 2025 is not a leap year; 30-day délai franc from 1 Feb → 4 Mar? 
        # start 2 Feb, nth=2 Feb+29=3 Mar, +1 = 4 Mar
        result = calculate_deadline(date(2025, 2, 1), self.rule, holidays=[])
        self.assertEqual(result.calculated_deadline, date(2025, 3, 4))

    def test_leap_year_february(self):
        # 2024 leap: start 2 Feb, nth = 2 Mar, +1 = 3 Mar (Sunday) → Mon 4 Mar
        result = calculate_deadline(date(2024, 2, 1), self.rule, holidays=[])
        self.assertEqual(result.calculated_deadline, date(2024, 3, 4))
        self.assertIsNotNone(result.explanation["non_working_day_adjustment"])

    def test_weekend_final_day_adjustment(self):
        # Craft a date so provisional lands on Saturday.
        # For 10-day opposition: notification Wed 2026-01-07 → start 8 Jan,
        # nth = 17 Jan, provisional = 18 Jan (Sunday) → next working Mon 19 Jan.
        opp = DeadlineRule.objects.get(code="MA_CIVIL_OPPOSITION", version="1974.1")
        result = calculate_deadline(date(2026, 1, 7), opp, holidays=[])
        self.assertEqual(result.calculated_deadline.weekday(), 0)  # Monday
        self.assertIsNotNone(result.explanation["non_working_day_adjustment"])

    def test_moroccan_holiday_adjustment(self):
        throne = LegalHoliday(
            jurisdiction="MA",
            name="Fête du Trône",
            date=date(2026, 7, 30),
            year=2026,
            is_legally_relevant=True,
        )
        # Build a 1-day délai franc ending on Throne Day.
        short = DeadlineRule.objects.create(
            code="MA_CIVIL_TEST_SHORT",
            name="Test 1-day",
            procedure_type=DeadlineRule.ProcedureType.RESPONSE,
            duration_value=1,
            duration_unit=DeadlineRule.DurationUnit.DAYS,
            computation_method=DeadlineRule.ComputationMethod.DELAI_FRANC,
            exclude_triggering_day=True,
            adjust_non_working_final_day=True,
            weekend_days=[5, 6],
            version="test.1",
            effective_from=date(2020, 1, 1),
            active=True,
            verification_status=DeadlineRule.VerificationStatus.VERIFIED,
        )
        # event 28 Jul → start 29, nth=29, provisional=30 Jul (holiday) → 31 Jul
        result = calculate_deadline(date(2026, 7, 28), short, holidays=[throne])
        self.assertEqual(result.calculated_deadline, date(2026, 7, 31))

    def test_historical_rule_version_selected_by_trigger_date(self):
        old = resolve_active_rule(
            legal_domain=DeadlineRule.LegalDomain.CIVIL_PROCEDURE,
            procedure_type=DeadlineRule.ProcedureType.APPEAL,
            as_of=date(2026, 8, 10),
        )
        self.assertEqual(old.version, "1974.1")
        new = resolve_active_rule(
            legal_domain=DeadlineRule.LegalDomain.CIVIL_PROCEDURE,
            procedure_type=DeadlineRule.ProcedureType.APPEAL,
            as_of=date(2026, 8, 24),
        )
        self.assertEqual(new.version, "2026.1")

    def test_inactive_unverified_rule_rejected(self):
        rule = DeadlineRule.objects.get(code="MA_CIVIL_REFERE_APPEAL")
        with self.assertRaises(CalculationError):
            calculate_deadline(date(2026, 9, 1), rule)

    def test_zero_duration_rejected(self):
        self.rule.duration_value = 0
        with self.assertRaises(CalculationError):
            calculate_deadline(date(2026, 3, 1), self.rule, holidays=[])


class EngineDeterminismTests(TestCase):
    def setUp(self):
        seed_all()

    def test_same_inputs_same_output(self):
        rule = DeadlineRule.objects.get(code="MA_CIVIL_CASSATION", version="1974.1")
        a = calculate_deadline(date(2026, 5, 10), rule, holidays=[])
        b = calculate_deadline(date(2026, 5, 10), rule, holidays=[])
        self.assertEqual(a.calculated_deadline, b.calculated_deadline)
        self.assertEqual(a.explanation["final_deadline"], b.explanation["final_deadline"])


class LegalDeadlineAPITests(APITestCase):
    def setUp(self):
        seed_all()
        self.user_a, self.cabinet_a = _create_cabinet_user("a@test.com")
        self.user_b, self.cabinet_b = _create_cabinet_user("b@test.com")
        self.case_a = _create_case(self.cabinet_a, self.user_a, "Matter A")
        self.case_b = _create_case(self.cabinet_b, self.user_b, "Matter B")
        self.client = APIClient()

    def test_calculate_preview(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/v1/legal-deadlines/calculate/",
            {
                "procedure_type": "appeal",
                "legal_domain": "civil_procedure",
                "triggering_date": "2026-03-01",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["calculated_deadline"], "2026-04-01")
        self.assertIn("explanation", res.data)

    def test_save_and_persist_across_requests(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_a.id,
                "procedure_type": "appeal",
                "legal_domain": "civil_procedure",
                "triggering_date": "2026-03-01",
                "reminder_offsets": [7, 3, 1, 0],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        deadline_id = res.data["id"]
        self.assertEqual(res.data["calculated_deadline"], "2026-04-01")
        self.assertEqual(len(res.data["reminders"]), 4)

        listed = self.client.get("/api/v1/legal-deadlines/deadlines/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        results = listed.data["results"] if isinstance(listed.data, dict) and "results" in listed.data else listed.data
        self.assertTrue(any(d["id"] == deadline_id for d in results))

    def test_cross_cabinet_isolation(self):
        self.client.force_authenticate(self.user_a)
        created = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_a.id,
                "procedure_type": "opposition",
                "triggering_date": "2026-01-10",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        deadline_id = created.data["id"]

        self.client.force_authenticate(self.user_b)
        listed = self.client.get("/api/v1/legal-deadlines/deadlines/")
        results = listed.data["results"] if isinstance(listed.data, dict) and "results" in listed.data else listed.data
        self.assertFalse(any(d["id"] == deadline_id for d in results))

        detail = self.client.get(f"/api/v1/legal-deadlines/deadlines/{deadline_id}/")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

        task_res = self.client.post(
            f"/api/v1/legal-deadlines/deadlines/{deadline_id}/create-task/",
            {"title": "Should not exist"},
            format="json",
        )
        self.assertIn(
            task_res.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        patched = self.client.patch(
            f"/api/v1/legal-deadlines/deadlines/{deadline_id}/",
            {"notes": "Hacked"},
            format="json",
        )
        self.assertIn(
            patched.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        deleted = self.client.delete(f"/api/v1/legal-deadlines/deadlines/{deadline_id}/")
        self.assertIn(
            deleted.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.client.force_authenticate(self.user_a)
        still = self.client.get(f"/api/v1/legal-deadlines/deadlines/{deadline_id}/")
        self.assertEqual(still.status_code, status.HTTP_200_OK)
        self.assertNotEqual((still.data.get("notes") or "").strip(), "Hacked")

    def test_cannot_save_to_other_cabinet_case(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_b.id,
                "procedure_type": "appeal",
                "triggering_date": "2026-03-01",
            },
            format="json",
        )
        self.assertIn(res.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN))

    def test_manual_override_flagged(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_a.id,
                "procedure_type": "appeal",
                "triggering_date": "2026-03-01",
                "manual_deadline": "2026-04-10",
                "override_reason": "Verified against court clerk confirmation",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["is_manual_override"])
        self.assertEqual(res.data["calculated_deadline"], "2026-04-01")
        self.assertEqual(res.data["final_deadline"], "2026-04-10")

    def test_create_task_from_deadline(self):
        self.client.force_authenticate(self.user_a)
        created = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_a.id,
                "procedure_type": "cassation",
                "triggering_date": "2026-02-01",
            },
            format="json",
        )
        deadline_id = created.data["id"]
        task_res = self.client.post(
            f"/api/v1/legal-deadlines/deadlines/{deadline_id}/create-task/",
            {"title": "File cassation"},
            format="json",
        )
        self.assertEqual(task_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(task_res.data["title"], "File cassation")
        self.assertEqual(task_res.data["due_date"], created.data["final_deadline"])
        self.assertEqual(task_res.data["case"], self.case_a.id)

    def test_domains_mvp_civil_only(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/v1/legal-deadlines/domains/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        civil = next(d for d in res.data if d["value"] == "civil_procedure")
        labour = next(d for d in res.data if d["value"] == "labour")
        self.assertTrue(civil["available"])
        self.assertFalse(labour["available"])

    def test_non_civil_domain_calculate_rejected(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/v1/legal-deadlines/calculate/",
            {
                "legal_domain": "labour",
                "procedure_type": "appeal",
                "triggering_date": "2026-03-01",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rule_snapshot_survives_rule_change(self):
        self.client.force_authenticate(self.user_a)
        created = self.client.post(
            "/api/v1/legal-deadlines/deadlines/",
            {
                "case": self.case_a.id,
                "procedure_type": "appeal",
                "triggering_date": "2026-03-01",
            },
            format="json",
        )
        deadline = CalculatedDeadline.objects.get(pk=created.data["id"])
        snapshot_version = deadline.rule_snapshot["version"]
        rule = deadline.rule
        rule.duration_value = 99
        rule.save(update_fields=["duration_value"])
        deadline.refresh_from_db()
        self.assertEqual(deadline.rule_snapshot["version"], snapshot_version)
        self.assertEqual(deadline.rule_snapshot["duration_value"], 30)
