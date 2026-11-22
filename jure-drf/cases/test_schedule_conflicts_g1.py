"""G1: schedule-conflicts preview returns real overlaps (never a silent stub)."""
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
from core.testing import api_client_for
from lawyers.models import LawyerProfile
from tasks.models import Appointment
from users.models import User

UserModel = get_user_model()


def _aware(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _owner(email: str, phone: str, trade: str = "G1 Cab"):
    user = UserModel.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Owner",
        last_name="User",
        phone=phone,
        country="MA",
    )
    cabinet = Cabinet.objects.create(owner=user, trade_name=trade, business_address="1 St")
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name="Owner User")
    return user, cabinet


def _member(cabinet, *, email: str, phone: str, role: str = User.Role.LAWYER, first_name: str = "Law"):
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
    LawyerProfile.objects.create(user=user, name=f"{first_name} Member")
    return user


def _consultation(cabinet, assignee, *, title: str, start: datetime, duration: int = 60):
    return Case.objects.create(
        case_type=Case.CaseType.CONSULTATION,
        cabinet=cabinet,
        assigned_to=assignee,
        title=title,
        description="Desc",
        court="",
        reference=f"C-{uuid.uuid4().hex[:8].upper()}",
        status=Case.CaseStatus.OPEN,
        case_specific_data={
            "consultationType": "PREVENTIVE",
            "legalDomain": "CORPORATE",
            "consultationDate": start.isoformat(),
            "durationMinutes": duration,
            "format": "PHONE",
            "phoneNumber": "+212600000000",
            "legalQuestion": "Q?",
            "outcome": "SCHEDULED",
        },
    )


class ScheduleConflictsPreviewAPITest(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = _owner("g1-owner@test.com", "+212655000001")
        self.lawyer = _member(
            self.cabinet, email="g1-law@test.com", phone="+212655000002", first_name="Lawyer"
        )
        self.url = reverse("case-schedule-conflicts-preview")
        self.start = _aware(datetime(2026, 8, 26, 10, 0, 0))
        _consultation(self.cabinet, self.lawyer, title="Existing Consult", start=self.start, duration=60)

    def test_preview_detects_overlapping_consultation(self):
        res = api_client_for(self.owner).get(
            self.url,
            {
                "assignedTo": self.lawyer.id,
                "date": self.start.isoformat(),
                "durationMinutes": 60,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        conflicts = res.json()["conflicts"]
        self.assertGreaterEqual(len(conflicts), 1)
        titles = {c.get("title") for c in conflicts}
        self.assertIn("Existing Consult", titles)
        self.assertEqual(conflicts[0].get("source"), "consultation")

    def test_preview_detects_appointment_overlap(self):
        end = self.start + timedelta(hours=1)
        Appointment.objects.create(
            title="Busy Slot",
            start_at=self.start,
            end_at=end,
            cabinet=self.cabinet,
            created_by=self.lawyer,
        )
        later = self.start + timedelta(hours=3)
        # Use a window that only hits the appointment (exclude the existing consult by shifting)
        # Existing consult is 10:00-11:00; appointment same. Query 10:00 still hits both.
        res = api_client_for(self.owner).get(
            self.url,
            {
                "assignedTo": self.lawyer.id,
                "consultationDate": self.start.isoformat(),
                "durationMinutes": 30,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sources = {c.get("source") for c in res.json()["conflicts"]}
        self.assertIn("appointment", sources)
        self.assertIn("Busy Slot", {c.get("title") for c in res.json()["conflicts"]})
        # silence unused
        self.assertTrue(later)

    def test_empty_without_params(self):
        res = api_client_for(self.owner).get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["conflicts"], [])

    def test_foreign_attorney_rejected(self):
        other, _ = _owner("g1-other@test.com", "+212655000099", "Other")
        res = api_client_for(self.owner).get(
            self.url,
            {
                "assignedTo": other.id,
                "date": self.start.isoformat(),
                "durationMinutes": 60,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_tenant_isolation(self):
        other_owner, other_cab = _owner("g1-iso@test.com", "+212655000088", "Iso")
        other_law = _member(
            other_cab, email="g1-iso-l@test.com", phone="+212655000087", first_name="IsoLaw"
        )
        _consultation(other_cab, other_law, title="Secret Foreign Consult", start=self.start)
        res = api_client_for(self.owner).get(
            self.url,
            {
                "assignedTo": self.lawyer.id,
                "date": self.start.isoformat(),
                "durationMinutes": 60,
            },
        )
        blob = str(res.json()).lower()
        self.assertNotIn("secret foreign", blob)

    def test_exclude_case_id_skips_self(self):
        existing = Case.objects.filter(cabinet=self.cabinet, title="Existing Consult").first()
        res = api_client_for(self.owner).get(
            self.url,
            {
                "assignedTo": self.lawyer.id,
                "date": self.start.isoformat(),
                "durationMinutes": 60,
                "excludeCaseId": existing.id,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = {c.get("title") for c in res.json()["conflicts"]}
        self.assertNotIn("Existing Consult", titles)
