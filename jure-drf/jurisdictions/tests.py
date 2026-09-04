from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.testing import api_client_for

from cabinets.models import Cabinet
from dashboard.models import Announcement
from jurisdictions.constants import VisibilityScope
from jurisdictions.models import Jurisdiction
from lawyers.models import LawyerProfile
from library.models import Document

User = get_user_model()


def _pdf(name="brief.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 test", content_type="application/pdf")


def _seed_jurisdictions():
    ma, _ = Jurisdiction.objects.get_or_create(
        code="MA",
        defaults={
            "name": "Morocco",
            "country_code": "MA",
            "legal_system": "civil_law",
            "default_language": "fr",
            "status": Jurisdiction.Status.ACTIVE,
        },
    )
    qa, _ = Jurisdiction.objects.get_or_create(
        code="QA",
        defaults={
            "name": "Qatar",
            "country_code": "QA",
            "legal_system": "mixed",
            "default_language": "ar",
            "status": Jurisdiction.Status.ACTIVE,
        },
    )
    return ma, qa


def _create_cabinet(email, phone, trade_name, jurisdiction, practice_type=Cabinet.PracticeType.LAW_FIRM):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone,
        country="MA" if jurisdiction and jurisdiction.code == "MA" else "QA",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name,
        business_address="123 Test St",
        jurisdiction=jurisdiction,
        practice_type=practice_type,
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name=f"{user.first_name} {user.last_name}")
    return user, cabinet


def _auth_client(user) -> APIClient:
    return api_client_for(user)


class JurisdictionApiTests(APITestCase):
    def setUp(self):
        self.ma, self.qa = _seed_jurisdictions()

    def test_public_list_returns_active_jurisdictions(self):
        response = self.client.get("/api/v1/jurisdictions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = {row["code"] for row in response.data}
        self.assertEqual(codes, {"MA", "QA"})
        names = {row["code"]: row["name"] for row in response.data}
        self.assertEqual(names["MA"], "Morocco")

    def test_inactive_jurisdiction_hidden_from_signup(self):
        self.qa.status = Jurisdiction.Status.INACTIVE
        self.qa.save(update_fields=["status"])
        response = self.client.get("/api/v1/jurisdictions/")
        codes = {row["code"] for row in response.data}
        self.assertIn("MA", codes)
        self.assertNotIn("QA", codes)


class LibraryJurisdictionScopeTests(APITestCase):
    def setUp(self):
        self.ma, self.qa = _seed_jurisdictions()
        self.user_ma, self.cab_ma = _create_cabinet(
            "ma@test.com", "+33641001001", "Cabinet MA", self.ma
        )
        self.user_qa, self.cab_qa = _create_cabinet(
            "qa@test.com", "+33641001002", "Cabinet QA", self.qa
        )
        self.client_ma = _auth_client(self.user_ma)
        self.client_qa = _auth_client(self.user_qa)
        self.list_url = "/api/v1/library/documents/"

        self.global_doc = Document.objects.create(
            title="JURE Legal Research Guide",
            category=Document.DocumentCategory.TRAINING_KNOWLEDGE,
            file=_pdf("global.pdf"),
            visibility_scope=VisibilityScope.GLOBAL,
            is_shared=True,
        )
        self.ma_doc = Document.objects.create(
            title="Moroccan Commercial Code",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=_pdf("ma.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.ma,
            is_shared=True,
        )
        self.qa_doc = Document.objects.create(
            title="Qatar Labour Law",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=_pdf("qa.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.qa,
            is_shared=True,
        )
        self.private_ma = Document.objects.create(
            title="ABC Legal Internal Template",
            category=Document.DocumentCategory.FORMS_TEMPLATES,
            file=_pdf("private.pdf"),
            visibility_scope=VisibilityScope.CABINET,
            cabinet=self.cab_ma,
            created_by=self.user_ma,
        )

    def test_morocco_sees_global_and_morocco_not_qatar(self):
        response = self.client_ma.get(self.list_url, {"all": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("JURE Legal Research Guide", titles)
        self.assertIn("Moroccan Commercial Code", titles)
        self.assertIn("ABC Legal Internal Template", titles)
        self.assertNotIn("Qatar Labour Law", titles)

    def test_qatar_sees_global_and_qatar_not_morocco(self):
        response = self.client_qa.get(self.list_url, {"all": "true"})
        titles = {item["title"] for item in response.data}
        self.assertIn("JURE Legal Research Guide", titles)
        self.assertIn("Qatar Labour Law", titles)
        self.assertNotIn("Moroccan Commercial Code", titles)
        self.assertNotIn("ABC Legal Internal Template", titles)

    def test_morocco_cannot_retrieve_qatar_document_by_id(self):
        url = f"{self.list_url}{self.qa_doc.pk}/"
        response = self.client_ma.get(url)
        self.assertIn(response.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

    def test_global_document_has_null_jurisdiction(self):
        self.global_doc.refresh_from_db()
        self.assertEqual(self.global_doc.visibility_scope, VisibilityScope.GLOBAL)
        self.assertIsNone(self.global_doc.jurisdiction_id)
        self.assertTrue(self.global_doc.is_shared)


class AnnouncementJurisdictionScopeTests(APITestCase):
    def setUp(self):
        self.ma, self.qa = _seed_jurisdictions()
        self.user_ma, self.cab_ma = _create_cabinet(
            "ann-ma@test.com", "+33641002001", "Ann MA", self.ma
        )
        self.user_qa, self.cab_qa = _create_cabinet(
            "ann-qa@test.com", "+33641002002", "Ann QA", self.qa
        )
        self.client_ma = _auth_client(self.user_ma)
        self.client_qa = _auth_client(self.user_qa)

        self.global_ann = Announcement.objects.create(
            title="JURE AI Assistant is now available",
            message="Global",
            status=Announcement.Status.PUBLISHED,
            visibility_scope=VisibilityScope.GLOBAL,
        )
        self.ma_ann = Announcement.objects.create(
            title="New Moroccan Labour Law Update",
            message="MA",
            status=Announcement.Status.PUBLISHED,
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.ma,
        )
        self.qa_ann = Announcement.objects.create(
            title="Qatar regulatory update",
            message="QA",
            status=Announcement.Status.PUBLISHED,
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.qa,
        )

    def test_morocco_dashboard_does_not_show_qatar_announcement(self):
        picked = Announcement.pick_for_cabinet(self.cab_ma)
        self.assertIsNotNone(picked)
        self.assertNotEqual(picked.id, self.qa_ann.id)
        titles = set(
            Announcement.active_for_cabinet(self.cab_ma).values_list("title", flat=True)
        )
        self.assertIn("JURE AI Assistant is now available", titles)
        self.assertIn("New Moroccan Labour Law Update", titles)
        self.assertNotIn("Qatar regulatory update", titles)

    def test_qatar_does_not_see_morocco_announcement(self):
        titles = set(
            Announcement.active_for_cabinet(self.cab_qa).values_list("title", flat=True)
        )
        self.assertIn("JURE AI Assistant is now available", titles)
        self.assertIn("Qatar regulatory update", titles)
        self.assertNotIn("New Moroccan Labour Law Update", titles)

    def test_morocco_cannot_retrieve_qatar_announcement_by_id(self):
        response = self.client_ma.get(f"/api/v1/announcements/{self.qa_ann.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_announcement_list_is_scoped(self):
        response = self.client_ma.get("/api/v1/announcements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("JURE AI Assistant is now available", titles)
        self.assertNotIn("Qatar regulatory update", titles)


class ContentScopeValidationTests(TestCase):
    def setUp(self):
        self.ma, _ = _seed_jurisdictions()

    def test_global_document_rejects_jurisdiction(self):
        doc = Document(
            title="Bad global",
            category=Document.DocumentCategory.TRAINING_KNOWLEDGE,
            file=_pdf("bad.pdf"),
            visibility_scope=VisibilityScope.GLOBAL,
            jurisdiction=self.ma,
            is_shared=True,
        )
        with self.assertRaises(Exception):
            doc.clean()

    def test_jurisdiction_document_requires_jurisdiction(self):
        doc = Document(
            title="Missing jur",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=_pdf("miss.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            is_shared=True,
        )
        with self.assertRaises(Exception):
            doc.clean()
