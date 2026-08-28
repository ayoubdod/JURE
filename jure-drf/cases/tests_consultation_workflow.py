"""Consultation workflow: references, validation, follow-ups, conversion, email."""
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cabinets.models import Cabinet
from cases.models import Case, CaseReferenceSequence
from cases.reference import allocate_typed_reference
from cases.validators import validate_consultation_data

User = get_user_model()


def _valid_phone():
    return f"+3361{uuid.uuid4().int % 10**7:07d}"


def _make_owner(email):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=_valid_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name="Test Cabinet",
        business_address="123 Test St",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


class ReferenceGenerationTest(TestCase):
    def setUp(self):
        self.user, self.cabinet = _make_owner("ref@test.com")

    def test_consultation_sequence_and_new_year(self):
        r1 = allocate_typed_reference(self.cabinet, Case.CaseType.CONSULTATION, year=2026)
        r2 = allocate_typed_reference(self.cabinet, Case.CaseType.CONSULTATION, year=2026)
        self.assertEqual(r1, "C-2026-0001")
        self.assertEqual(r2, "C-2026-0002")
        r3 = allocate_typed_reference(self.cabinet, Case.CaseType.CONSULTATION, year=2027)
        self.assertEqual(r3, "C-2027-0001")

    def test_litigation_and_admin_sequences_are_independent(self):
        lit1 = allocate_typed_reference(self.cabinet, Case.CaseType.LITIGATION, year=2026)
        adm1 = allocate_typed_reference(self.cabinet, Case.CaseType.ADMINISTRATIVE, year=2026)
        lit2 = allocate_typed_reference(self.cabinet, Case.CaseType.LITIGATION, year=2026)
        self.assertEqual(lit1, "L-2026-0001")
        self.assertEqual(lit2, "L-2026-0002")
        self.assertEqual(adm1, "A-2026-0001")

    def test_cabinets_have_independent_counters(self):
        other_user, other_cab = _make_owner("other-ref@test.com")
        a = allocate_typed_reference(self.cabinet, Case.CaseType.CONSULTATION, year=2026)
        b = allocate_typed_reference(other_cab, Case.CaseType.CONSULTATION, year=2026)
        self.assertEqual(a, "C-2026-0001")
        self.assertEqual(b, "C-2026-0001")
        self.assertEqual(CaseReferenceSequence.objects.filter(year=2026, kind="C").count(), 2)


class ConsultationValidationTest(TestCase):
    def test_in_person_requires_address(self):
        with self.assertRaises(ValidationError):
            validate_consultation_data(
                {
                    "consultationType": "PREVENTIVE",
                    "legalDomain": "CORPORATE",
                    "consultationDate": "2026-08-26T10:00:00",
                    "durationMinutes": 60,
                    "format": "IN_PERSON",
                    "legalQuestion": "Q?",
                    "outcome": "SCHEDULED",
                }
            )

    def test_phone_requires_number(self):
        with self.assertRaises(ValidationError):
            validate_consultation_data(
                {
                    "consultationType": "REACTIVE",
                    "legalDomain": "LABOR",
                    "consultationDate": "2026-08-26T10:00:00",
                    "durationMinutes": 30,
                    "format": "PHONE",
                    "legalQuestion": "Q?",
                    "outcome": "SCHEDULED",
                }
            )

    def test_video_requires_valid_url(self):
        with self.assertRaises(ValidationError):
            validate_consultation_data(
                {
                    "consultationType": "REACTIVE",
                    "legalDomain": "LABOR",
                    "consultationDate": "2026-08-26T10:00:00",
                    "durationMinutes": 30,
                    "format": "VIDEO",
                    "legalQuestion": "Q?",
                    "videoLink": "not-a-url",
                    "outcome": "SCHEDULED",
                }
            )

    def test_other_domain_requires_custom(self):
        with self.assertRaises(ValidationError):
            validate_consultation_data(
                {
                    "consultationType": "PREVENTIVE",
                    "legalDomain": "OTHER",
                    "consultationDate": "2026-08-26T10:00:00",
                    "durationMinutes": 15,
                    "format": "PHONE",
                    "phoneNumber": "+212600000000",
                    "legalQuestion": "Q?",
                    "outcome": "SCHEDULED",
                }
            )

    def test_valid_video_payload(self):
        data = validate_consultation_data(
            {
                "consultationType": "PREVENTIVE",
                "legalDomain": "CORPORATE",
                "consultationDate": "2026-08-26T10:00:00",
                "durationMinutes": 60,
                "format": "VIDEO",
                "videoLink": "https://meet.google.com/abc-defg-hij",
                "legalQuestion": "Q?",
                "outcome": "SCHEDULED",
            }
        )
        self.assertEqual(data["durationMinutes"], 60)


class ConsultationWorkflowAPITest(APITestCase):
    def setUp(self):
        self.api = APIClient()
        self.user, self.cabinet = _make_owner("workflow@test.com")
        self.api.force_authenticate(user=self.user)

    def _payload(self, **overrides):
        body = {
            "title": "Corporate restructuring advice",
            "description": "The client seeks advice regarding termination.",
            "court": "N/A",
            "caseType": "CONSULTATION",
            "client": None,
            "case_specific_data": {
                "consultationType": "PREVENTIVE",
                "legalDomain": "CORPORATE",
                "consultationDate": "2026-08-26T10:00:00",
                "duration": "1h",
                "durationMinutes": 60,
                "format": "VIDEO",
                "videoLink": "https://meet.google.com/abc-defg-hij",
                "legalQuestion": "The client seeks advice regarding termination of an employment contract.",
                "factsContext": "Employed since 2019.",
                "adviceSummary": "",
                "followUpRequired": False,
                "outcome": "SCHEDULED",
            },
        }
        body.update(overrides)
        return body

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_create_assigns_c_reference(self):
        res = self.api.post("/api/v1/cases/", self._payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.content)
        self.assertRegex(res.data["reference"], r"^C-\d{4}-0001$")
        self.assertEqual(res.data["caseType"], "CONSULTATION")

    def test_create_rejects_client_supplied_reference(self):
        res = self.api.post("/api/v1/cases/", self._payload(reference="HACK-1"), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.content)
        self.assertNotEqual(res.data["reference"], "HACK-1")
        self.assertTrue(res.data["reference"].startswith("C-"))

    def test_follow_up_identifiers(self):
        parent = self.api.post("/api/v1/cases/", self._payload(), format="json")
        self.assertEqual(parent.status_code, 201, parent.content)
        pk = parent.data["id"]
        parent_ref = parent.data["reference"]
        f1 = self.api.post(
            f"/api/v1/cases/{pk}/follow-ups/",
            {
                "title": "Follow-up 1",
                "case_specific_data": {
                    "consultationType": "REACTIVE",
                    "legalDomain": "CORPORATE",
                    "consultationDate": "2026-09-03T10:00:00",
                    "durationMinutes": 30,
                    "format": "PHONE",
                    "phoneNumber": "+212600000001",
                    "legalQuestion": "Follow-up question",
                    "outcome": "SCHEDULED",
                },
            },
            format="json",
        )
        self.assertEqual(f1.status_code, 201, f1.content)
        self.assertEqual(f1.data["reference"], f"{parent_ref}-F01")
        f2 = self.api.post(
            f"/api/v1/cases/{pk}/follow-ups/",
            {
                "title": "Follow-up 2",
                "case_specific_data": {
                    "consultationType": "REACTIVE",
                    "legalDomain": "CORPORATE",
                    "consultationDate": "2026-09-10T10:00:00",
                    "durationMinutes": 45,
                    "format": "IN_PERSON",
                    "address": "12 Avenue Mohammed V",
                    "city": "Casablanca",
                    "legalQuestion": "Follow-up 2",
                    "outcome": "SCHEDULED",
                },
            },
            format="json",
        )
        self.assertEqual(f2.status_code, 201, f2.content)
        self.assertEqual(f2.data["reference"], f"{parent_ref}-F02")
        parent_obj = Case.objects.get(pk=pk)
        self.assertEqual(parent_obj.follow_ups.count(), 2)

        listed = self.api.get("/api/v1/cases/", {"caseType": "CONSULTATION"})
        self.assertEqual(listed.status_code, 200, listed.content)
        listed_ids = {row["id"] for row in listed.data.get("results", listed.data if isinstance(listed.data, list) else [])}
        self.assertIn(pk, listed_ids)
        self.assertNotIn(f1.data["id"], listed_ids)
        self.assertNotIn(f2.data["id"], listed_ids)

        detail = self.api.get(f"/api/v1/cases/{pk}/")
        self.assertEqual(detail.status_code, 200, detail.content)
        follow_refs = [row["reference"] for row in (detail.data.get("followUps") or [])]
        self.assertEqual(follow_refs, [f"{parent_ref}-F01", f"{parent_ref}-F02"])
        self.assertEqual(detail.data["followUps"][0]["consultationDate"], "2026-09-03T10:00:00")
        self.assertEqual(detail.data.get("followUpCount"), 2)

        listed = self.api.get("/api/v1/cases/", {"caseType": "CONSULTATION"})
        parent_row = next(row for row in listed.data.get("results", []) if row["id"] == pk)
        self.assertEqual(parent_row.get("followUpCount"), 2)

        has_fu = self.api.get("/api/v1/cases/", {"caseType": "CONSULTATION", "followUpFilter": "has"})
        has_ids = {row["id"] for row in has_fu.data.get("results", [])}
        self.assertIn(pk, has_ids)

        converted = self.api.get("/api/v1/cases/", {"caseType": "CONSULTATION", "converted": "1"})
        self.assertEqual(converted.status_code, 200)
        self.assertNotIn(pk, {row["id"] for row in converted.data.get("results", [])})

        month = self.api.get("/api/v1/cases/", {"caseType": "CONSULTATION", "thisMonth": "1"})
        self.assertEqual(month.status_code, 200)

    def test_convert_creates_l_reference_and_keeps_consultation(self):
        created = self.api.post("/api/v1/cases/", self._payload(), format="json")
        pk = created.data["id"]
        consultation_ref = created.data["reference"]
        res = self.api.post(f"/api/v1/cases/{pk}/convert/", {"targetType": "LITIGATION"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertRegex(res.data["newCase"]["reference"], r"^L-\d{4}-0001$")
        source = Case.objects.get(pk=pk)
        self.assertTrue(Case.objects.filter(pk=pk).exists())
        self.assertEqual(source.reference, consultation_ref)
        self.assertEqual(source.converted_to_case.reference, res.data["newCase"]["reference"])
        self.assertEqual(source.converted_to_case.converted_from_case_id, pk)

    def test_convert_admin_independent_sequence(self):
        c1 = self.api.post("/api/v1/cases/", self._payload(title="C1"), format="json")
        c2 = self.api.post("/api/v1/cases/", self._payload(title="C2"), format="json")
        lit = self.api.post(f"/api/v1/cases/{c1.data['id']}/convert/", {"targetType": "LITIGATION"}, format="json")
        adm = self.api.post(f"/api/v1/cases/{c2.data['id']}/convert/", {"targetType": "ADMINISTRATIVE"}, format="json")
        self.assertEqual(lit.status_code, 201, lit.content)
        self.assertEqual(adm.status_code, 201, adm.content)
        self.assertRegex(lit.data["newCase"]["reference"], r"^L-\d{4}-0001$")
        self.assertRegex(adm.data["newCase"]["reference"], r"^A-\d{4}-0001$")

    @patch("cases.email.EmailMultiAlternatives.send", side_effect=RuntimeError("smtp down"))
    def test_email_failure_does_not_rollback_create(self, _mock_send):
        res = self.api.post("/api/v1/cases/", self._payload(client=self.user.id), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        case = Case.objects.get(pk=res.data["id"])
        self.assertEqual(case.email_confirmation_status, "FAILED")

    @patch("cases.email.EmailMultiAlternatives.send", return_value=1)
    def test_retry_confirmation(self, _mock_send):
        created = self.api.post("/api/v1/cases/", self._payload(), format="json")
        pk = created.data["id"]
        Case.objects.filter(pk=pk).update(email_confirmation_status="FAILED", email_confirmation_error="boom")
        # attach a client with email
        case = Case.objects.get(pk=pk)
        case.client = self.user
        case.save(update_fields=["client"])
        retry = self.api.post(f"/api/v1/cases/{pk}/send-confirmation/", {}, format="json")
        self.assertEqual(retry.status_code, 200, retry.content)
        case.refresh_from_db()
        self.assertEqual(case.email_confirmation_status, "SENT")
