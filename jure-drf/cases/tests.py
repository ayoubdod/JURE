import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from cabinets.models import Cabinet
from .models import Case
from .utils import is_consultation_ready_to_convert

User = get_user_model()


def _valid_fr_phone():
    return f"+3361{uuid.uuid4().int % 10**7:07d}"


def _create_cabinet_user(email="lawyer@test.com", phone=None):
    """Create a user who owns a cabinet (for case permissions)."""
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone or _valid_fr_phone(),
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


def _create_consultation(cabinet, user, **kwargs):
    """Create a minimal CONSULTATION case."""
    defaults = {
        "case_type": Case.CaseType.CONSULTATION,
        "cabinet": cabinet,
        "assigned_to": user,
        "title": "Test consultation",
        "description": "Test description",
        "court": "N/A",
        "reference": f"REF-{uuid.uuid4().hex[:8].upper()}",
        "status": Case.CaseStatus.OPEN,
    }
    defaults.update(kwargs)
    return Case.objects.create(**defaults)


class IsConsultationReadyToConvertTest(TestCase):
    """Test the is_consultation_ready_to_convert helper."""

    def test_ready_via_status(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
            case_specific_data={},
        )
        ready, fields = is_consultation_ready_to_convert(case)
        self.assertTrue(ready)
        self.assertIn("status", fields)

    def test_ready_via_outcome(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.IN_PROGRESS,
            case_specific_data={"outcome": "CONVERTED_TO_CASE"},
        )
        ready, fields = is_consultation_ready_to_convert(case)
        self.assertTrue(ready)
        self.assertIn("case_specific_data.outcome", fields)

    def test_ready_via_outcome_camel_case(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.IN_PROGRESS,
            case_specific_data={"Outcome": "CONVERTED_TO_CASE"},
        )
        ready, _ = is_consultation_ready_to_convert(case)
        self.assertTrue(ready)

    def test_ready_via_case_specific_status(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.IN_PROGRESS,
            case_specific_data={"status": "CONVERTED_TO_CASE"},
        )
        ready, _ = is_consultation_ready_to_convert(case)
        self.assertTrue(ready)

    def test_not_ready_wrong_case_type(self):
        case = Case(
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
        )
        ready, fields = is_consultation_ready_to_convert(case)
        self.assertFalse(ready)
        self.assertEqual(fields, [])

    def test_ready_when_completed(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.IN_PROGRESS,
            case_specific_data={"outcome": "COMPLETED"},
        )
        ready, fields = is_consultation_ready_to_convert(case)
        self.assertTrue(ready)
        self.assertIn("case_specific_data.outcome", fields)

    def test_not_ready_when_cancelled(self):
        case = Case(
            case_type=Case.CaseType.CONSULTATION,
            status=Case.CaseStatus.OPEN,
            case_specific_data={"outcome": "CANCELLED"},
        )
        ready, fields = is_consultation_ready_to_convert(case)
        self.assertFalse(ready)
        self.assertIn("case_specific_data.outcome", fields)


class CaseConvertAPITest(APITestCase):
    """Test POST /api/v1/cases/:id/convert/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user, self.cabinet = _create_cabinet_user()
        self.client.force_authenticate(user=self.user)

    def test_convert_legacy_outcome_in_progress(self):
        """Legacy row: status=IN_PROGRESS, outcome=CONVERTED_TO_CASE, not converted → success."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.IN_PROGRESS,
            case_specific_data={
                "outcome": "CONVERTED_TO_CASE",
                "legalQuestion": "Q?",
                "adviceSummary": "A",
            },
        )
        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(url, {"targetType": "LITIGATION"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("newCase", data)
        self.assertEqual(data["newCase"]["caseType"], "LITIGATION")
        self.assertIn("convertedFromCase", data["newCase"])
        self.assertEqual(data["newCase"]["convertedFromCase"]["id"], consultation.id)

    def test_convert_status_converted_to_case(self):
        """status=CONVERTED_TO_CASE → success."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
            case_specific_data={"legalQuestion": "Q?", "adviceSummary": "A"},
        )
        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(url, {"targetType": "ADMINISTRATIVE"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["newCase"]["caseType"], "ADMINISTRATIVE")

    def test_convert_already_linked_409(self):
        """Already converted consultation → 409."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
            case_specific_data={"legalQuestion": "Q?", "adviceSummary": "A"},
        )
        # Create a derived case and link it
        derived = Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=self.cabinet,
            assigned_to=self.user,
            title="Derived",
            description="Desc",
            court="N/A",
            reference="DERIVED-1-X",
            status=Case.CaseStatus.OPEN,
            converted_from_case=consultation,
        )
        consultation.converted_to_case = derived
        consultation.save(update_fields=["converted_to_case"])

        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(url, {"targetType": "LITIGATION"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        data = response.json()
        self.assertEqual(data["code"], "already_converted")
        self.assertIn("detail", data)
        self.assertIn(derived.reference, data["detail"])
        self.assertEqual(data["converted_to_case_id"], derived.id)

    def test_convert_wrong_case_type_400(self):
        """Source is LITIGATION → 400 with clear error."""
        litigation = _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
        )
        url = reverse("case-convert", kwargs={"pk": litigation.pk})
        response = self.client.post(url, {"targetType": "LITIGATION"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["code"], "wrong_case_type")
        self.assertEqual(data["case_type"], "LITIGATION")

    def test_convert_not_ready_when_cancelled_400(self):
        """Cancelled consultation cannot be converted."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.OPEN,
            case_specific_data={"outcome": "CANCELLED"},
        )
        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(url, {"targetType": "LITIGATION"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["code"], "not_ready_to_convert")

    def test_convert_target_type_required_400(self):
        """Missing targetType → 400."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
        )
        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["code"], "target_type_required")

    def test_convert_invalid_target_type_400(self):
        """targetType=CONSULTATION → 400."""
        consultation = _create_consultation(
            self.cabinet,
            self.user,
            status=Case.CaseStatus.CONVERTED_TO_CASE,
        )
        url = reverse("case-convert", kwargs={"pk": consultation.pk})
        response = self.client.post(
            url, {"targetType": "CONSULTATION"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["code"], "invalid_target_type")


def _create_member(email, cabinet, role="LAWYER"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Member",
        last_name=role,
        phone=_valid_fr_phone(),
        country="FR",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = role
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user


class CaseCloseAPITest(APITestCase):
    """Test POST /api/v1/cases/:id/close/ — real persisted closure."""

    def setUp(self):
        self.client = APIClient()
        self.user, self.cabinet = _create_cabinet_user("closer@test.com")
        self.client.force_authenticate(user=self.user)

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    def test_authorized_user_can_close_matter(self):
        matter = _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
            title="Close me",
        )
        url = reverse("case-close", kwargs={"pk": matter.pk})
        response = self.client.post(
            url,
            {"outcome": "Settled", "lessons": "Negotiate early"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["already_closed"])
        self.assertEqual(data["previous_status"], Case.CaseStatus.OPEN)
        self.assertEqual(data["case"]["status"], Case.CaseStatus.CLOSED)

        matter.refresh_from_db()
        self.assertEqual(matter.status, Case.CaseStatus.CLOSED)
        self.assertEqual(matter.updated_by_id, self.user.id)
        summary = (matter.case_specific_data or {}).get("close_summary") or {}
        self.assertEqual(summary.get("outcome"), "Settled")
        self.assertEqual(summary.get("lessons"), "Negotiate early")
        self.assertEqual(summary.get("previous_status"), Case.CaseStatus.OPEN)

        from dashboard.models import ActivityLog

        logs = ActivityLog.objects.filter(cabinet=self.cabinet, kind="matter_closed")
        self.assertEqual(logs.count(), 1)
        self.assertIn(matter.reference, logs.first().message)

    def test_already_closed_is_idempotent(self):
        matter = _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.CLOSED,
        )
        url = reverse("case-close", kwargs={"pk": matter.pk})
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["already_closed"])
        self.assertEqual(data["case"]["status"], Case.CaseStatus.CLOSED)

        from dashboard.models import ActivityLog

        self.assertEqual(
            ActivityLog.objects.filter(cabinet=self.cabinet, kind="matter_closed").count(),
            0,
        )

    def test_viewer_cannot_close_matter(self):
        viewer = _create_member("viewer@test.com", self.cabinet, role="VIEWER")
        matter = _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
        )
        self._auth_as(viewer)
        url = reverse("case-close", kwargs={"pk": matter.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        matter.refresh_from_db()
        self.assertEqual(matter.status, Case.CaseStatus.OPEN)

    def test_cannot_close_other_cabinet_matter(self):
        other_user, other_cab = _create_cabinet_user("other-owner@test.com")
        foreign = _create_consultation(
            other_cab,
            other_user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
        )
        url = reverse("case-close", kwargs={"pk": foreign.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        foreign.refresh_from_db()
        self.assertEqual(foreign.status, Case.CaseStatus.OPEN)

    def test_nonexistent_matter_404(self):
        url = reverse("case-close", kwargs={"pk": 999999})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_401(self):
        matter = _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
        )
        self.client.force_authenticate(user=None)
        self.client.credentials()
        url = reverse("case-close", kwargs={"pk": matter.pk})
        response = self.client.post(url, {}, format="json")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class CaseTypeFilterAPITest(APITestCase):
    """GET /api/v1/cases/ — caseType and JSON filters for specialized workspaces."""

    def setUp(self):
        self.client = APIClient()
        self.user, self.cabinet = _create_cabinet_user("filter@test.com")
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("case-list")

    def test_case_type_consultation_excludes_litigation(self):
        _create_consultation(self.cabinet, self.user, title="Consult A")
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Lit A",
            case_specific_data={"clientRole": "PLAINTIFF"},
        )
        response = self.client.get(self.list_url, {"caseType": "CONSULTATION"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data["results"]]
        self.assertIn("Consult A", titles)
        self.assertNotIn("Lit A", titles)

    def test_administrative_duty_alias_maps_to_administrative(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.ADMINISTRATIVE,
            title="Admin A",
            case_specific_data={"dutyType": "PERMIT", "priority": "HIGH"},
        )
        response = self.client.get(self.list_url, {"caseType": "ADMINISTRATIVE_DUTY"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data["results"]]
        self.assertIn("Admin A", titles)

    def test_outcome_json_filter(self):
        _create_consultation(
            self.cabinet,
            self.user,
            title="Scheduled one",
            case_specific_data={"outcome": "SCHEDULED"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            title="Done one",
            case_specific_data={"outcome": "COMPLETED"},
        )
        response = self.client.get(
            self.list_url, {"caseType": "CONSULTATION", "outcome": "SCHEDULED"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data["results"]]
        self.assertEqual(titles, ["Scheduled one"])

    def test_client_role_json_filter(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Plaintiff matter",
            case_specific_data={"clientRole": "PLAINTIFF"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Defendant matter",
            case_specific_data={"clientRole": "DEFENDANT"},
        )
        response = self.client.get(
            self.list_url, {"caseType": "LITIGATION", "clientRole": "PLAINTIFF"}
        )
        titles = [row["title"] for row in response.data["results"]]
        self.assertEqual(titles, ["Plaintiff matter"])

    def test_court_specialty_json_filter(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Commercial court",
            case_specific_data={"courtSpecialty": "COMMERCIAL", "jurisdiction": "FIRST_INSTANCE"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Ordinary court",
            case_specific_data={"courtSpecialty": "NORMAL", "jurisdiction": "APPEAL"},
        )
        response = self.client.get(
            self.list_url, {"caseType": "LITIGATION", "courtSpecialty": "COMMERCIAL"}
        )
        titles = [row["title"] for row in response.data["results"]]
        self.assertEqual(titles, ["Commercial court"])

    def test_jurisdiction_level_json_filter(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="First instance",
            case_specific_data={"jurisdiction": "FIRST_INSTANCE"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Appeal",
            case_specific_data={"jurisdiction": "APPEAL"},
        )
        response = self.client.get(
            self.list_url, {"caseType": "LITIGATION", "jurisdiction": "APPEAL"}
        )
        titles = [row["title"] for row in response.data["results"]]
        self.assertEqual(titles, ["Appeal"])

    def test_chamber_json_filter(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Civil chamber",
            case_specific_data={"jurisdiction": "FIRST_INSTANCE", "chamber": "CIVIL"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Family chamber",
            case_specific_data={"jurisdiction": "FIRST_INSTANCE", "chamber": "FAMILY"},
        )
        response = self.client.get(
            self.list_url, {"caseType": "LITIGATION", "chamber": "CIVIL"}
        )
        titles = [row["title"] for row in response.data["results"]]
        self.assertEqual(titles, ["Civil chamber"])

    def test_city_json_filter_matches_city_and_legacy_jurisdiction(self):
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Casa new",
            case_specific_data={"city": "Casablanca", "jurisdiction": "FIRST_INSTANCE"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Rabat legacy",
            case_specific_data={"jurisdiction": "Rabat"},
        )
        _create_consultation(
            self.cabinet,
            self.user,
            case_type=Case.CaseType.LITIGATION,
            title="Fes",
            case_specific_data={"city": "Fes", "jurisdiction": "APPEAL"},
        )
        casa = self.client.get(self.list_url, {"caseType": "LITIGATION", "city": "Casa"})
        self.assertEqual([row["title"] for row in casa.data["results"]], ["Casa new"])
        rabat = self.client.get(self.list_url, {"caseType": "LITIGATION", "city": "Rabat"})
        self.assertEqual([row["title"] for row in rabat.data["results"]], ["Rabat legacy"])


class CaseCabinetIsolationTests(APITestCase):
    def test_list_excludes_other_cabinet_matters(self):
        user_a, cab_a = _create_cabinet_user("cases-a@test.com")
        user_b, cab_b = _create_cabinet_user("cases-b@test.com")
        _create_consultation(cab_a, user_a, title="Ours")
        _create_consultation(cab_b, user_b, title="Theirs")
        api = APIClient()
        api.force_authenticate(user=user_a)
        response = api.get(reverse("case-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data["results"]]
        self.assertIn("Ours", titles)
        self.assertNotIn("Theirs", titles)


class CloseCaseServiceTest(TestCase):
    """Domain close_case() — same rules as the HTTP action, without the view."""

    def test_persists_closed_status_summary_and_audit(self):
        from dashboard.models import ActivityLog

        from .services import close_case

        user, cabinet = _create_cabinet_user("svc-closer@test.com")
        matter = _create_consultation(
            cabinet,
            user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
            title="Service close",
        )
        closed, already, previous = close_case(matter, user, outcome="Settled", lessons="Call early")
        self.assertFalse(already)
        self.assertEqual(previous, Case.CaseStatus.OPEN)
        matter.refresh_from_db()
        self.assertEqual(closed.status, Case.CaseStatus.CLOSED)
        self.assertEqual(matter.status, Case.CaseStatus.CLOSED)
        self.assertEqual(matter.updated_by_id, user.id)
        summary = (matter.case_specific_data or {}).get("close_summary") or {}
        self.assertEqual(summary.get("outcome"), "Settled")
        self.assertEqual(summary.get("lessons"), "Call early")
        self.assertEqual(
            ActivityLog.objects.filter(cabinet=cabinet, kind="matter_closed").count(),
            1,
        )

    def test_already_closed_is_idempotent(self):
        from dashboard.models import ActivityLog

        from .services import close_case

        user, cabinet = _create_cabinet_user("svc-closed@test.com")
        matter = _create_consultation(
            cabinet,
            user,
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.CLOSED,
        )
        _, already, previous = close_case(matter, user, outcome="ignored")
        self.assertTrue(already)
        self.assertEqual(previous, Case.CaseStatus.CLOSED)
        self.assertEqual(
            ActivityLog.objects.filter(cabinet=cabinet, kind="matter_closed").count(),
            0,
        )

