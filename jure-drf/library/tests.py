import os

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.testing import api_client_for

from cabinets.models import Cabinet
from lawyers.models import LawyerProfile

from .models import Document
from .serializers import DocumentSerializer

User = get_user_model()


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


def _auth_client(user) -> APIClient:
    return api_client_for(user)


def _pdf(name="brief.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 test", content_type="application/pdf")


class DocumentSerializerMissingFileTests(TestCase):
    def test_missing_blob_does_not_raise(self):
        upload = _pdf()
        doc = Document.objects.create(
            title="Brief",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=upload,
        )
        path = doc.file.path
        self.assertTrue(os.path.exists(path))
        os.remove(path)

        data = DocumentSerializer(doc).data
        self.assertEqual(data["id"], doc.pk)
        self.assertEqual(data["title"], "Brief")
        self.assertEqual(data["size"], 0)
        self.assertIn("file", data)
        self.assertFalse(data["is_shared"])


class SharedLibraryApiTests(APITestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_lawyer(
            "lib-a@test.com", "+33641000001", "Cabinet A"
        )
        self.user_b, self.cab_b = _create_cabinet_lawyer(
            "lib-b@test.com", "+33641000002", "Cabinet B"
        )
        self.client_a = _auth_client(self.user_a)
        self.client_b = _auth_client(self.user_b)
        self.list_url = "/api/v1/library/documents/"

        self.private_a = Document.objects.create(
            title="Cabinet A private",
            category=Document.DocumentCategory.CONTRACTS_AGREEMENTS,
            file=_pdf("a-private.pdf"),
            cabinet=self.cab_a,
            created_by=self.user_a,
            is_shared=False,
        )
        self.shared = Document.objects.create(
            title="JURE template",
            category=Document.DocumentCategory.FORMS_TEMPLATES,
            file=_pdf("shared.pdf"),
            is_shared=True,
        )

    def test_shared_save_clears_cabinet(self):
        doc = Document.objects.create(
            title="Should be global",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=_pdf("global.pdf"),
            cabinet=self.cab_a,
            is_shared=True,
        )
        doc.refresh_from_db()
        self.assertIsNone(doc.cabinet_id)
        self.assertTrue(doc.is_shared)

    def test_list_includes_own_and_shared_not_other_cabinet(self):
        response = self.client_a.get(self.list_url, {"all": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("Cabinet A private", titles)
        self.assertIn("JURE template", titles)
        self.assertNotIn("Cabinet B private", titles)

        private_b = Document.objects.create(
            title="Cabinet B private",
            category=Document.DocumentCategory.CONTRACTS_AGREEMENTS,
            file=_pdf("b-private.pdf"),
            cabinet=self.cab_b,
            created_by=self.user_b,
        )
        response_b = self.client_b.get(self.list_url, {"all": "true"})
        titles_b = {item["title"] for item in response_b.data}
        self.assertIn("Cabinet B private", titles_b)
        self.assertIn("JURE template", titles_b)
        self.assertNotIn("Cabinet A private", titles_b)
        self.assertTrue(any(item["is_shared"] for item in response_b.data if item["title"] == "JURE template"))
        self.assertFalse(any(item["is_shared"] for item in response_b.data if item["id"] == private_b.pk))

    def test_cabinet_cannot_edit_or_delete_shared(self):
        url = f"{self.list_url}{self.shared.pk}/"
        patch = self.client_a.patch(url, {"title": "Hacked"}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_403_FORBIDDEN)
        delete = self.client_a.delete(url)
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)
        self.shared.refresh_from_db()
        self.assertEqual(self.shared.title, "JURE template")
        self.assertTrue(Document.objects.filter(pk=self.shared.pk).exists())

    def test_create_via_api_is_never_shared(self):
        response = self.client_a.post(
            self.list_url,
            {
                "title": "My upload",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "file": _pdf("mine.pdf"),
                "is_shared": True,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_shared"])
        created = Document.objects.get(pk=response.data["id"])
        self.assertFalse(created.is_shared)
        self.assertEqual(created.cabinet_id, self.cab_a.pk)

    def test_copy_shared_into_cabinet(self):
        url = f"{self.list_url}{self.shared.pk}/copy-to-cabinet/"
        response = self.client_a.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["id"], self.shared.pk)
        self.assertTrue(response.data["is_in_my_library"])
        from library.models import LibrarySave
        self.assertTrue(
            LibrarySave.objects.filter(cabinet=self.cab_a, document=self.shared).exists()
        )

    def test_cannot_copy_private_document(self):
        url = f"{self.list_url}{self.private_a.pk}/copy-to-cabinet/"
        response = self.client_a.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.private_a.pk)

    def test_other_cabinet_cannot_see_private_copy(self):
        copy_url = f"{self.list_url}{self.shared.pk}/copy-to-cabinet/"
        copied = self.client_a.post(copy_url)
        self.assertEqual(copied.status_code, status.HTTP_201_CREATED)
        listed = self.client_b.get("/api/v1/library/my/", {"all": "true"})
        ids = {item["id"] for item in listed.data["results"]}
        self.assertNotIn(copied.data["id"], ids)
        shared_list = self.client_b.get(self.list_url, {"all": "true"})
        shared_ids = {item["id"] for item in shared_list.data}
        self.assertIn(self.shared.pk, shared_ids)

    def test_cannot_retrieve_or_mutate_foreign_private_document(self):
        url = f"{self.list_url}{self.private_a.pk}/"
        retrieved = self.client_b.get(url)
        self.assertIn(
            retrieved.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        patched = self.client_b.patch(url, {"title": "Hijacked"}, format="json")
        self.assertIn(
            patched.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        deleted = self.client_b.delete(url)
        self.assertIn(
            deleted.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.private_a.refresh_from_db()
        self.assertEqual(self.private_a.title, "Cabinet A private")
        self.assertTrue(Document.objects.filter(pk=self.private_a.pk).exists())
        favorite = self.client_b.post(f"{url}favorite/")
        self.assertIn(
            favorite.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        added = self.client_b.post(f"{url}add-to-my-library/")
        self.assertIn(
            added.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        from library.models import LibraryFavorite, LibrarySave

        self.assertFalse(
            LibraryFavorite.objects.filter(user=self.user_b, document=self.private_a).exists()
        )
        self.assertFalse(
            LibrarySave.objects.filter(cabinet=self.cab_b, document=self.private_a).exists()
        )


class DocumentAdminFormTests(TestCase):
    def _form(self, **data):
        from library.admin import DocumentAdminForm

        payload = {
            "title": "Shared template",
            "category": Document.DocumentCategory.FORMS_TEMPLATES,
            "visibility_scope": "GLOBAL",
            "is_shared": True,
            "tags_input": "",
            **data,
        }
        return DocumentAdminForm(data=payload, files={"file": _pdf("admin.pdf")})

    def test_tags_input_creates_missing_tags(self):
        form = self._form(tags_input="Contrat, Modele, formation")
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["tags_input"], ["contrat", "modele", "formation"])

    def test_tags_are_optional(self):
        form = self._form(tags_input="")
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["tags_input"], [])


class DocumentBulkUploadTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="bulk-admin@test.com",
            password="adminpass123",
            first_name="Bulk",
            last_name="Admin",
            phone="+33641000099",
            country="FR",
        )
        self.client = APIClient()
        self.client.force_login(self.admin)

    def test_title_from_filename(self):
        from library.admin import title_from_filename

        self.assertEqual(title_from_filename("NDA_Microsoft.pdf"), "NDA Microsoft")
        self.assertEqual(title_from_filename("contrat-type.docx"), "contrat type")

    def test_create_many_shared_documents(self):
        from library.admin import create_documents_from_uploads

        created = create_documents_from_uploads(
            files=[_pdf("Modele_NDA.pdf"), _pdf("contrat-travail.pdf")],
            category=Document.DocumentCategory.FORMS_TEMPLATES,
            is_shared=True,
            description="JURE pack",
            tag_slugs=["modele"],
            created_by=self.admin,
        )
        self.assertEqual(len(created), 2)
        titles = {doc.title for doc in created}
        self.assertEqual(titles, {"Modele NDA", "contrat travail"})
        for doc in created:
            self.assertTrue(doc.is_shared)
            self.assertIsNone(doc.cabinet_id)
            self.assertEqual(list(doc.tags.values_list("slug", flat=True)), ["modele"])

    def test_bulk_upload_page_loads(self):
        url = reverse("admin:library_document_bulk_upload")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Upload multiple")

    def test_bulk_upload_post_creates_documents(self):
        url = reverse("admin:library_document_bulk_upload")
        response = self.client.post(
            url,
            {
                "category": Document.DocumentCategory.FORMS_TEMPLATES,
                "visibility_scope": "GLOBAL",
                "is_shared": "on",
                "tags_input": "modele, contrat",
                "files": [_pdf("one.pdf"), _pdf("two.pdf")],
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            Document.objects.filter(is_shared=True, title__in=["one", "two"]).count(),
            2,
        )


class CanonicalCategoryTests(APITestCase):
    def setUp(self):
        self.user, self.cabinet = _create_cabinet_lawyer(
            "cat@test.com", "+33641000011", "Category Cabinet"
        )
        self.api = _auth_client(self.user)
        self.list_url = "/api/v1/library/documents/"

    def test_legacy_category_is_remapped_on_create(self):
        response = self.api.post(
            self.list_url,
            {
                "title": "Old law slug",
                "category": "law",
                "file": _pdf("legacy.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "legislation_regulations")
        created = Document.objects.get(pk=response.data["id"])
        self.assertEqual(created.category, Document.DocumentCategory.LEGISLATION_REGULATIONS)

    def test_legacy_legal_forms_maps_to_forms_templates(self):
        response = self.api.post(
            self.list_url,
            {
                "title": "POA template",
                "category": "legal_forms",
                "file": _pdf("poa.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "forms_templates")

    def test_canonical_category_accepted(self):
        response = self.api.post(
            self.list_url,
            {
                "title": "Employment Agreement",
                "category": Document.DocumentCategory.CONTRACTS_AGREEMENTS,
                "file": _pdf("contract.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "contracts_agreements")

    def test_unknown_category_rejected_on_create(self):
        response = self.api.post(
            self.list_url,
            {
                "title": "Unclassified",
                "category": "other",
                "file": _pdf("other.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_existing_category_preserved_on_update(self):
        doc = Document.objects.create(
            title="Manual other",
            category="other",
            file=_pdf("manual.pdf"),
            cabinet=self.cabinet,
            created_by=self.user,
        )
        response = self.api.patch(
            f"{self.list_url}{doc.pk}/",
            {"title": "Manual other updated"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        doc.refresh_from_db()
        self.assertEqual(doc.title, "Manual other updated")
        self.assertEqual(doc.category, "other")

    def test_filter_by_canonical_category(self):
        Document.objects.create(
            title="NDA",
            category=Document.DocumentCategory.CONTRACTS_AGREEMENTS,
            file=_pdf("nda.pdf"),
            cabinet=self.cabinet,
            created_by=self.user,
        )
        Document.objects.create(
            title="Judgment",
            category=Document.DocumentCategory.CASE_LAW_JURISPRUDENCE,
            file=_pdf("judgment.pdf"),
            cabinet=self.cabinet,
            created_by=self.user,
        )
        response = self.api.get(
            self.list_url,
            {"all": "true", "category": "contracts_agreements"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("NDA", titles)
        self.assertNotIn("Judgment", titles)


class LibraryDocumentStatusTests(APITestCase):
    def setUp(self):
        self.user, self.cabinet = _create_cabinet_lawyer(
            "lib-status@test.com", "+33641000021", "Status Cabinet"
        )
        self.api = _auth_client(self.user)
        self.list_url = "/api/v1/library/documents/"
        self.doc = Document.objects.create(
            title="Commercial Code",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=_pdf("code.pdf"),
            cabinet=self.cabinet,
            created_by=self.user,
        )

    def test_archived_documents_hidden_from_default_list(self):
        self.doc.status = Document.DocumentStatus.ARCHIVED
        self.doc.save(update_fields=["status"])
        response = self.api.get(self.list_url, {"all": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertNotIn("Commercial Code", titles)

    def test_owner_can_archive_and_restore(self):
        archive = self.api.post(f"{self.list_url}{self.doc.id}/archive/")
        self.assertEqual(archive.status_code, status.HTTP_200_OK)
        self.assertEqual(archive.data["status"], "archived")
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.status, Document.DocumentStatus.ARCHIVED)

        restore = self.api.post(f"{self.list_url}{self.doc.id}/restore/")
        self.assertEqual(restore.status_code, status.HTTP_200_OK)
        self.assertEqual(restore.data["status"], "published")

    def test_list_includes_created_by_name(self):
        response = self.api.get(self.list_url, {"all": "true"})
        item = next(x for x in response.data if x["id"] == self.doc.id)
        self.assertIn("created_by_name", item)
        self.assertTrue(item["created_by_name"])


class LibraryHubScopeTests(APITestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        from jurisdictions.constants import VisibilityScope
        from jurisdictions.models import Jurisdiction
        from library.models import LibraryFavorite, LibrarySave

        self.LibraryFavorite = LibraryFavorite
        self.LibrarySave = LibrarySave
        self.ma, _ = Jurisdiction.objects.get_or_create(
            code="MA",
            defaults={
                "name": "Morocco",
                "country_code": "MA",
                "legal_system": "civil_law",
                "default_language": "fr",
                "status": "ACTIVE",
            },
        )
        self.qa, _ = Jurisdiction.objects.get_or_create(
            code="QA",
            defaults={
                "name": "Qatar",
                "country_code": "QA",
                "legal_system": "mixed",
                "default_language": "ar",
                "status": "ACTIVE",
            },
        )
        self.user_ma, self.cab_ma = _create_cabinet_lawyer(
            "hub-ma@test.com", "+33641003001", "Hub MA"
        )
        self.cab_ma.jurisdiction = self.ma
        self.cab_ma.save(update_fields=["jurisdiction"])
        self.user_qa, self.cab_qa = _create_cabinet_lawyer(
            "hub-qa@test.com", "+33641003002", "Hub QA"
        )
        self.cab_qa.jurisdiction = self.qa
        self.cab_qa.save(update_fields=["jurisdiction"])
        self.staff = User.objects.create_user(
            email="hub-staff@test.com",
            password="testpass123",
            first_name="Platform",
            last_name="Admin",
            phone="+33641003003",
            country="MA",
            is_staff=True,
        )
        self.client_ma = _auth_client(self.user_ma)
        self.client_qa = _auth_client(self.user_qa)
        self.client_staff = _auth_client(self.staff)

        self.personal = Document.objects.create(
            title="Cabinet memo",
            category=Document.DocumentCategory.LEGAL_RESEARCH_OPINIONS,
            file=_pdf("memo.pdf"),
            visibility_scope=VisibilityScope.CABINET,
            cabinet=self.cab_ma,
            created_by=self.user_ma,
        )
        self.local_ma = Document.objects.create(
            title="Moroccan Commercial Code",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            resource_type=Document.ResourceType.CODE,
            file=_pdf("ma-code.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.ma,
            is_shared=True,
            language="fr",
            country="MA",
        )
        self.local_qa = Document.objects.create(
            title="Qatar Labour Law",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            resource_type=Document.ResourceType.LAW,
            file=_pdf("qa-law.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.qa,
            is_shared=True,
            language="ar",
            country="QA",
        )
        self.international = Document.objects.create(
            title="CISG Convention",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            resource_type=Document.ResourceType.CONVENTION,
            file=_pdf("cisg.pdf"),
            visibility_scope=VisibilityScope.GLOBAL,
            is_shared=True,
            language="en",
        )
        stale = Document.objects.create(
            title="Old Moroccan circular",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            resource_type=Document.ResourceType.CIRCULAR,
            file=_pdf("old.pdf"),
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction=self.ma,
            is_shared=True,
        )
        Document.objects.filter(pk=stale.pk).update(created=timezone.now() - timedelta(days=8))
        self.stale_local = Document.objects.get(pk=stale.pk)

    def _titles(self, response, key="results"):
        payload = response.data
        rows = payload[key] if isinstance(payload, dict) else payload
        return {item["title"] for item in rows}

    def test_my_library_is_cabinet_only_until_saved(self):
        response = self.client_ma.get("/api/v1/library/my/", {"all": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = self._titles(response)
        self.assertIn("Cabinet memo", titles)
        self.assertNotIn("Moroccan Commercial Code", titles)
        self.assertNotIn("CISG Convention", titles)

    def test_local_library_is_jurisdiction_isolated(self):
        ma = self.client_ma.get("/api/v1/library/local/", {"all": "true"})
        qa = self.client_qa.get("/api/v1/library/local/", {"all": "true"})
        self.assertEqual(ma.status_code, status.HTTP_200_OK)
        self.assertEqual(qa.status_code, status.HTTP_200_OK)
        ma_titles = self._titles(ma)
        qa_titles = self._titles(qa)
        self.assertIn("Moroccan Commercial Code", ma_titles)
        self.assertIn("Old Moroccan circular", ma_titles)
        self.assertNotIn("Qatar Labour Law", ma_titles)
        self.assertNotIn("Cabinet memo", ma_titles)
        self.assertIn("Qatar Labour Law", qa_titles)
        self.assertNotIn("Moroccan Commercial Code", qa_titles)

    def test_morocco_cannot_retrieve_qatar_local_resource(self):
        response = self.client_ma.get(f"/api/v1/library/documents/{self.local_qa.pk}/")
        self.assertIn(response.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

    def test_international_visible_to_all_cabinets(self):
        ma = self.client_ma.get("/api/v1/library/international/", {"all": "true"})
        qa = self.client_qa.get("/api/v1/library/international/", {"all": "true"})
        self.assertIn("CISG Convention", self._titles(ma))
        self.assertIn("CISG Convention", self._titles(qa))
        self.assertNotIn("Moroccan Commercial Code", self._titles(ma))

    def test_last_added_is_seven_days_and_does_not_delete(self):
        response = self.client_ma.get("/api/v1/library/local/", {"all": "true"})
        recent_titles = {item["title"] for item in response.data["recent"]}
        self.assertIn("Moroccan Commercial Code", recent_titles)
        self.assertNotIn("Old Moroccan circular", recent_titles)
        all_titles = self._titles(response)
        self.assertIn("Old Moroccan circular", all_titles)
        self.assertTrue(Document.objects.filter(pk=self.stale_local.pk).exists())
        recent_item = next(x for x in response.data["results"] if x["title"] == "Moroccan Commercial Code")
        self.assertTrue(recent_item["is_recent"])
        stale_item = next(x for x in response.data["results"] if x["title"] == "Old Moroccan circular")
        self.assertFalse(stale_item["is_recent"])

    def test_regular_user_cannot_publish_local_or_international(self):
        local = self.client_ma.post(
            "/api/v1/library/admin/local/",
            {
                "title": "Unauthorized local",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "resource_type": Document.ResourceType.LAW,
                "file": _pdf("nope.pdf"),
                "language": "fr",
                "jurisdiction": self.ma.pk,
            },
            format="multipart",
        )
        international = self.client_ma.post(
            "/api/v1/library/admin/international/",
            {
                "title": "Unauthorized intl",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "file": _pdf("nope2.pdf"),
                "language": "en",
            },
            format="multipart",
        )
        self.assertEqual(local.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(international.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_admin_can_publish_local_and_international(self):
        local = self.client_staff.post(
            "/api/v1/library/admin/local/",
            {
                "title": "Dahir on companies",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "resource_type": Document.ResourceType.DECREE,
                "description": "Official text",
                "file": _pdf("dahir.pdf"),
                "language": "fr",
                "jurisdiction": self.ma.pk,
            },
            format="multipart",
        )
        self.assertEqual(local.status_code, status.HTTP_201_CREATED, local.data)
        self.assertEqual(local.data["scope"], "LOCAL")
        self.assertTrue(local.data["is_recent"])
        self.assertEqual(local.data["jurisdiction"], self.ma.pk)

        intl = self.client_staff.post(
            "/api/v1/library/admin/international/",
            {
                "title": "UNCITRAL Model Law",
                "category": Document.DocumentCategory.LEGAL_RESEARCH_OPINIONS,
                "resource_type": Document.ResourceType.LEGAL_GUIDE,
                "file": _pdf("uncitral.pdf"),
                "language": "en",
                "country": "International",
            },
            format="multipart",
        )
        self.assertEqual(intl.status_code, status.HTTP_201_CREATED, intl.data)
        self.assertEqual(intl.data["scope"], "INTERNATIONAL")
        self.assertTrue(intl.data["is_recent"])

        ma_local = self.client_ma.get("/api/v1/library/local/", {"all": "true"})
        qa_local = self.client_qa.get("/api/v1/library/local/", {"all": "true"})
        self.assertIn("Dahir on companies", self._titles(ma_local))
        self.assertNotIn("Dahir on companies", self._titles(qa_local))
        intl_list = self.client_qa.get("/api/v1/library/international/", {"all": "true"})
        self.assertIn("UNCITRAL Model Law", self._titles(intl_list))

    def test_favorite_and_add_to_my_library_are_references(self):
        fav = self.client_ma.post(f"/api/v1/library/documents/{self.local_ma.pk}/favorite/")
        self.assertEqual(fav.status_code, status.HTTP_200_OK)
        self.assertTrue(fav.data["is_favorited"])
        self.assertEqual(self.LibraryFavorite.objects.filter(user=self.user_ma, document=self.local_ma).count(), 1)

        add = self.client_ma.post(f"/api/v1/library/documents/{self.local_ma.pk}/add-to-my-library/")
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)
        self.assertTrue(add.data["is_in_my_library"])
        self.assertEqual(Document.objects.filter(title="Moroccan Commercial Code").count(), 1)
        self.assertTrue(self.LibrarySave.objects.filter(cabinet=self.cab_ma, document=self.local_ma).exists())

        favorites = self.client_ma.get("/api/v1/library/favorites/", {"all": "true"})
        self.assertEqual(favorites.status_code, status.HTTP_200_OK)
        self.assertIn("Moroccan Commercial Code", self._titles(favorites))
        qa_favorites = self.client_qa.get("/api/v1/library/favorites/", {"all": "true"})
        self.assertNotIn("Moroccan Commercial Code", self._titles(qa_favorites))

        unfav = self.client_ma.delete(f"/api/v1/library/documents/{self.local_ma.pk}/favorite/")
        self.assertEqual(unfav.status_code, status.HTTP_200_OK)
        self.assertFalse(unfav.data["is_favorited"])
        favorites_after = self.client_ma.get("/api/v1/library/favorites/", {"all": "true"})
        self.assertNotIn("Moroccan Commercial Code", self._titles(favorites_after))

        my_lib = self.client_ma.get("/api/v1/library/my/", {"all": "true"})
        self.assertIn("Moroccan Commercial Code", self._titles(my_lib))
        saved = next(x for x in my_lib.data["results"] if x["title"] == "Moroccan Commercial Code")
        self.assertIn("Local Library", saved["source_library"])

    def test_personal_create_stays_cabinet_scoped(self):
        response = self.client_ma.post(
            "/api/v1/library/my/",
            {
                "title": "Internal checklist",
                "category": Document.DocumentCategory.FORMS_TEMPLATES,
                "resource_type": Document.ResourceType.TEMPLATE,
                "file": _pdf("check.pdf"),
                "language": "fr",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["scope"], "PERSONAL")
        self.assertFalse(response.data["is_shared"])
        qa = self.client_qa.get("/api/v1/library/my/", {"all": "true"})
        self.assertNotIn("Internal checklist", self._titles(qa))




