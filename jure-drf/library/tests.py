import os

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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
    api = APIClient()
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api


def _pdf(name="brief.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 test", content_type="application/pdf")


class DocumentSerializerMissingFileTests(TestCase):
    def test_missing_blob_does_not_raise(self):
        upload = _pdf()
        doc = Document.objects.create(
            title="Brief",
            category=Document.DocumentCategory.LAW,
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
            category=Document.DocumentCategory.CONTRACTS,
            file=_pdf("a-private.pdf"),
            cabinet=self.cab_a,
            created_by=self.user_a,
            is_shared=False,
        )
        self.shared = Document.objects.create(
            title="JURE template",
            category=Document.DocumentCategory.TEMPLATES,
            file=_pdf("shared.pdf"),
            is_shared=True,
        )

    def test_shared_save_clears_cabinet(self):
        doc = Document.objects.create(
            title="Should be global",
            category=Document.DocumentCategory.LAW,
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
            category=Document.DocumentCategory.CONTRACTS,
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
                "category": Document.DocumentCategory.LAW,
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
        self.assertFalse(response.data["is_shared"])
        self.assertEqual(response.data["title"], "JURE template")
        copy = Document.objects.get(pk=response.data["id"])
        self.assertEqual(copy.cabinet_id, self.cab_a.pk)
        self.assertFalse(copy.is_shared)
        self.assertNotEqual(copy.pk, self.shared.pk)
        self.assertTrue(copy.file)
        self.assertNotEqual(copy.file.name, self.shared.file.name)

    def test_cannot_copy_private_document(self):
        url = f"{self.list_url}{self.private_a.pk}/copy-to-cabinet/"
        response = self.client_a.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_cabinet_cannot_see_private_copy(self):
        copy_url = f"{self.list_url}{self.shared.pk}/copy-to-cabinet/"
        copied = self.client_a.post(copy_url)
        self.assertEqual(copied.status_code, status.HTTP_201_CREATED)
        listed = self.client_b.get(self.list_url, {"all": "true"})
        ids = {item["id"] for item in listed.data}
        self.assertNotIn(copied.data["id"], ids)
        self.assertIn(self.shared.pk, ids)
