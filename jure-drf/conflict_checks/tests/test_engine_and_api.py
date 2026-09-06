"""Conflict check matching, search, tenancy, and API tests."""
from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from clients.models import Client
from conflict_checks.engine import search_conflicts
from conflict_checks.matching import MatchType, classify_match, normalize_name
from conflict_checks.models import ConflictCheck, PotentialMatch
from dashboard.models import ActivityLog

User = get_user_model()

_PHONE_SEQ = 0


def _phone():
    global _PHONE_SEQ
    _PHONE_SEQ += 1
    return f"+3361{_PHONE_SEQ:07d}"


def _create_cabinet_user(email: str, role: str = "OWNER"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=f"Cabinet {email}",
        business_address="Casablanca",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = role
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


def _create_client(cabinet, *, first_name, last_name, email=None, company=False, ice=None):
    email = email or f"{first_name.lower()}.{last_name.lower()}.{uuid.uuid4().hex[:6]}@example.com"
    client = User.objects.create_user(
        email=email,
        password="clientpass123",
        first_name=first_name,
        last_name=last_name,
        phone=_phone(),
        country="MA",
        cabinet=cabinet,
        is_cabinet_member=False,
        professional_card_number="9999",
        bar_association="N/A",
        bar_inscription_year="2024",
        accept_terms=True,
        accept_data_processing=True,
    )
    if company or ice:
        Client.objects.create(
            user=client,
            client_type=Client.ClientType.COMPANY if company else Client.ClientType.INDIVIDUAL,
            ice=ice,
        )
    return client


def _create_case(cabinet, user, *, title="Matter", client=None, status=Case.CaseStatus.OPEN, data=None):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=user,
        title=title,
        description="desc",
        court="TPI Casablanca",
        reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status=status,
        client=client,
        case_specific_data=data or {},
    )


class MatchingEngineTests(TestCase):
    def test_exact_match(self):
        r = classify_match("ABC Corporation", "ABC Corporation")
        self.assertIsNotNone(r)
        self.assertEqual(r.match_type, MatchType.EXACT)

    def test_normalized_org_suffix(self):
        r = classify_match("ABC Corporation", "ABC Corp.")
        self.assertIsNotNone(r)
        self.assertIn(r.match_type, (MatchType.HIGH, MatchType.POSSIBLE))

    def test_case_insensitive(self):
        r = classify_match("abc corporation", "ABC CORPORATION")
        self.assertEqual(r.match_type, MatchType.EXACT)

    def test_hyphen_normalized(self):
        r = classify_match("ABC-Corporation", "ABC Corporation")
        self.assertIsNotNone(r)
        self.assertIn(r.match_type, (MatchType.EXACT, MatchType.HIGH))

    def test_name_reorder(self):
        r = classify_match("Ahmed Benali", "Benali Ahmed")
        self.assertIsNotNone(r)
        self.assertEqual(r.match_type, MatchType.HIGH)

    def test_partial_match(self):
        r = classify_match("ABC Corp", "ABC Corporation Holdings")
        self.assertIsNotNone(r)
        self.assertEqual(r.match_type, MatchType.POSSIBLE)

    def test_no_weak_fuzzy(self):
        self.assertIsNone(classify_match("Apple", "Orange"))

    def test_normalize_strips_punct(self):
        self.assertEqual(normalize_name("ABC Corp."), "abc corp")


class SearchEngineTests(TestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_user("lawyer-a@jure.test")
        self.user_b, self.cab_b = _create_cabinet_user("lawyer-b@jure.test")

        self.client_a = _create_client(
            self.cab_a, first_name="Ahmed", last_name="Benali", company=False
        )
        self.org_a = _create_client(
            self.cab_a,
            first_name="ABC",
            last_name="Corporation",
            company=True,
            ice="001234567000012",
        )
        self.case_client = _create_case(
            self.cab_a,
            self.user_a,
            title="Corporate Litigation",
            client=self.org_a,
            data={
                "litigationType": "COMMERCIAL",
                "clientRole": "PLAINTIFF",
                "opposingParty": "XYZ Holdings",
                "opposingCounsel": "Dupont Law",
                "thirdParties": ["Ahmed Benali"],
                "courtName": "TPI",
                "jurisdiction": "Casablanca",
                "courtCaseNumber": "1",
                "filingDate": "2026-01-01",
                "firstHearingDate": "2026-02-01",
                "nextHearingDate": "2026-03-01",
                "statuteOfLimitationsDate": "2027-01-01",
                "legalArguments": "args",
                "priority": "HIGH",
            },
        )
        self.case_oppose = _create_case(
            self.cab_a,
            self.user_a,
            title="Opposing Matter",
            client=self.client_a,
            data={
                "litigationType": "CIVIL",
                "clientRole": "DEFENDANT",
                "opposingParty": "ABC Corporation",
                "courtName": "TPI",
                "jurisdiction": "Rabat",
                "courtCaseNumber": "2",
                "filingDate": "2026-01-01",
                "firstHearingDate": "2026-02-01",
                "nextHearingDate": "2026-03-01",
                "statuteOfLimitationsDate": "2027-01-01",
                "legalArguments": "args",
                "priority": "MEDIUM",
            },
        )
        # Cabinet B twin — must never leak
        org_b = _create_client(
            self.cab_b, first_name="ABC", last_name="Corporation", company=True
        )
        _create_case(
            self.cab_b,
            self.user_b,
            title="Secret Cabinet B Matter",
            client=org_b,
            data={"opposingParty": "ABC Corporation"},
        )

    def test_exact_client_match(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        roles = {(h.matter_id, h.role) for h in out.hits}
        self.assertIn((self.case_client.id, "PLAINTIFF"), roles)
        self.assertTrue(any(h.match_type == MatchType.EXACT.value for h in out.hits))

    def test_exact_opposing_party_match(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        self.assertTrue(
            any(
                h.matter_id == self.case_oppose.id and h.role == "OPPOSING_PARTY"
                for h in out.hits
            )
        )

    def test_third_party_representative_style_match(self):
        out = search_conflicts(cabinet=self.cab_a, query="Ahmed Benali")
        self.assertTrue(
            any(
                h.matter_id == self.case_client.id and h.role == "THIRD_PARTY"
                for h in out.hits
            )
        )
        # Also as client of another matter
        self.assertTrue(
            any(
                h.matter_id == self.case_oppose.id
                and h.role in ("CLIENT", "DEFENDANT")
                for h in out.hits
            )
        )

    def test_opposing_counsel_match(self):
        out = search_conflicts(cabinet=self.cab_a, query="Dupont Law")
        self.assertTrue(any(h.role == "OPPOSING_COUNSEL" for h in out.hits))

    def test_normalized_name_match(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corp.")
        self.assertGreater(len(out.hits), 0)

    def test_multiple_matters_same_entity(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        matter_ids = {h.matter_id for h in out.hits}
        self.assertIn(self.case_client.id, matter_ids)
        self.assertIn(self.case_oppose.id, matter_ids)

    def test_same_entity_different_roles(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        roles = {h.role for h in out.hits if "ABC" in h.entity_name.upper()}
        self.assertTrue({"PLAINTIFF", "OPPOSING_PARTY"} <= roles or len(roles) >= 2)

    def test_no_results(self):
        out = search_conflicts(cabinet=self.cab_a, query="ZZZ Nobody Exists")
        self.assertEqual(out.hits, [])

    def test_empty_query(self):
        out = search_conflicts(cabinet=self.cab_a, query=" ")
        self.assertEqual(out.hits, [])

    def test_cross_cabinet_isolation(self):
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        for h in out.hits:
            self.assertNotEqual(h.matter_title, "Secret Cabinet B Matter")
            case = Case.objects.get(pk=h.matter_id)
            self.assertEqual(case.cabinet_id, self.cab_a.id)

    def test_former_client_role_on_closed(self):
        closed = _create_case(
            self.cab_a,
            self.user_a,
            title="Closed Matter",
            client=self.org_a,
            status=Case.CaseStatus.CLOSED,
        )
        out = search_conflicts(cabinet=self.cab_a, query="ABC Corporation")
        self.assertTrue(
            any(h.matter_id == closed.id and h.role == "FORMER_CLIENT" for h in out.hits)
        )


class ConflictCheckAPITests(APITestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_user("api-a@jure.test")
        self.user_b, self.cab_b = _create_cabinet_user("api-b@jure.test")
        self.client_a = _create_client(
            self.cab_a, first_name="Globex", last_name="Industries", company=True
        )
        self.case_a = _create_case(
            self.cab_a,
            self.user_a,
            title="Globex Matter",
            client=self.client_a,
            data={"opposingParty": "Initech LLC"},
        )
        self.client_b = _create_client(
            self.cab_b, first_name="Globex", last_name="Industries", company=True
        )
        self.case_b = _create_case(
            self.cab_b,
            self.user_b,
            title="Cabinet B Globex",
            client=self.client_b,
        )
        self.api = APIClient()

    def test_search_persists_and_returns_matches(self):
        self.api.force_authenticate(self.user_a)
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex Industries"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(res.data["result_count"], 1)
        self.assertIn("disclaimer", res.data)
        self.assertTrue(
            ConflictCheck.objects.filter(cabinet=self.cab_a, search_query="Globex Industries").exists()
        )
        self.assertTrue(
            ActivityLog.objects.filter(cabinet=self.cab_a, kind="conflict_check").exists()
        )

    def test_cross_cabinet_api_isolation(self):
        self.api.force_authenticate(self.user_a)
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex Industries"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        matter_ids = {m["matter"] for m in res.data["matches"]}
        self.assertIn(self.case_a.id, matter_ids)
        self.assertNotIn(self.case_b.id, matter_ids)

    def test_cannot_attach_foreign_matter_id(self):
        self.api.force_authenticate(self.user_a)
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex", "matter_id": self.case_b.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_viewer_can_search(self):
        self.user_a.role = "VIEWER"
        self.user_a.save(update_fields=["role"])
        self.api.force_authenticate(self.user_a)
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_denied(self):
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex"},
            format="json",
        )
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_review_persistence(self):
        self.api.force_authenticate(self.user_a)
        created = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Initech LLC", "matter_id": self.case_a.id},
            format="json",
        )
        check_id = created.data["id"]
        res = self.api.patch(
            f"/api/v1/conflict-checks/{check_id}/review/",
            {"status": "REVIEWED_NO_CONFLICT", "notes": "Cleared after review"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        check = ConflictCheck.objects.get(pk=check_id)
        self.assertEqual(check.status, ConflictCheck.ReviewStatus.REVIEWED_NO_CONFLICT)
        self.assertEqual(check.reviewed_by_id, self.user_a.id)
        self.assertIsNotNone(check.reviewed_at)

    def test_list_scoped_to_cabinet(self):
        self.api.force_authenticate(self.user_a)
        self.api.post("/api/v1/conflict-checks/search/", {"query": "Globex"}, format="json")
        self.api.force_authenticate(self.user_b)
        self.api.post("/api/v1/conflict-checks/search/", {"query": "Globex"}, format="json")
        self.api.force_authenticate(self.user_a)
        res = self.api.get("/api/v1/conflict-checks/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        for row in results:
            self.assertTrue(
                ConflictCheck.objects.filter(pk=row["id"], cabinet=self.cab_a).exists()
            )

    def test_cannot_retrieve_other_cabinet_check(self):
        self.api.force_authenticate(self.user_b)
        created = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex"},
            format="json",
        )
        foreign_id = created.data["id"]
        self.api.force_authenticate(self.user_a)
        res = self.api.get(f"/api/v1/conflict-checks/{foreign_id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        reviewed = self.api.patch(
            f"/api/v1/conflict-checks/{foreign_id}/review/",
            {"status": "DISMISSED", "notes": "Hacked"},
            format="json",
        )
        self.assertEqual(reviewed.status_code, status.HTTP_404_NOT_FOUND)
        from conflict_checks.models import ConflictCheck

        check = ConflictCheck.objects.get(pk=foreign_id)
        self.assertEqual(check.status, ConflictCheck.ReviewStatus.PENDING_REVIEW)
        self.assertNotEqual((check.notes or "").strip(), "Hacked")
        matches = created.data.get("matches") or []
        if matches:
            match_id = matches[0]["id"]
            reviewed_match = self.api.patch(
                f"/api/v1/conflict-checks/{foreign_id}/matches/{match_id}/review/",
                {"review_status": "DISMISSED", "notes": "Hacked"},
                format="json",
            )
            self.assertEqual(reviewed_match.status_code, status.HTTP_404_NOT_FOUND)
            match = PotentialMatch.objects.get(pk=match_id)
            self.assertEqual(match.review_status, PotentialMatch.ReviewStatus.PENDING)

        own = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Globex"},
            format="json",
        )
        self.assertEqual(own.status_code, status.HTTP_201_CREATED, own.data)
        if matches:
            mixed = self.api.patch(
                f"/api/v1/conflict-checks/{own.data['id']}/matches/{matches[0]['id']}/review/",
                {"review_status": "DISMISSED"},
                format="json",
            )
            self.assertEqual(mixed.status_code, status.HTTP_404_NOT_FOUND)
            match = PotentialMatch.objects.get(pk=matches[0]["id"])
            self.assertEqual(match.review_status, PotentialMatch.ReviewStatus.PENDING)

    def test_short_query_rejected(self):
        self.api.force_authenticate(self.user_a)
        res = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "A"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_match_review(self):
        self.api.force_authenticate(self.user_a)
        created = self.api.post(
            "/api/v1/conflict-checks/search/",
            {"query": "Initech LLC"},
            format="json",
        )
        check_id = created.data["id"]
        match_id = created.data["matches"][0]["id"]
        res = self.api.patch(
            f"/api/v1/conflict-checks/{check_id}/matches/{match_id}/review/",
            {"review_status": "NO_CONFLICT", "notes": "Different entity"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        m = PotentialMatch.objects.get(pk=match_id)
        self.assertEqual(m.review_status, PotentialMatch.ReviewStatus.NO_CONFLICT)
