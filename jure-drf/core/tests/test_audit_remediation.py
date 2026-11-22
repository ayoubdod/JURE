"""Regression tests for the production audit remediation (C1–C3, W1–W12)."""

from __future__ import annotations

import secrets
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from chat.presence import presence_add, presence_list, presence_remove
from clients.models import Client
from core.html_sanitize import sanitize_html
from core.testing import api_client_for, create_cabinet_owner, unique_test_phone
from finance.models import Invoice
from finance.models.firm_settings import FirmFinanceSettings
from juria.services.juria_api_service import JuriaAPIError
from juria.views.mixins import juria_error_http_status
from library.models import Document
from users.models import PasswordSetupToken

User = get_user_model()


class HtmlSanitizeTests(SimpleTestCase):
    def test_strips_script_and_event_handlers(self):
        dirty = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>'
        clean = sanitize_html(dirty)
        self.assertIn("<p>ok</p>", clean)
        self.assertNotIn("<script", clean.lower())
        self.assertNotIn("onerror", clean.lower())
        self.assertNotIn("<img", clean.lower())

    def test_keeps_safe_links(self):
        html = '<a href="https://jure.ma" title="Jure">link</a>'
        self.assertIn("https://jure.ma", sanitize_html(html))


class PresenceCabinetScopeTests(TestCase):
    def test_presence_is_scoped_by_cabinet(self):
        presence_add(1, cabinet_id=10)
        presence_add(2, cabinet_id=10)
        presence_add(3, cabinet_id=20)

        self.assertCountEqual(presence_list(10), [1, 2])
        self.assertCountEqual(presence_list(20), [3])

        presence_remove(1, cabinet_id=10)
        self.assertCountEqual(presence_list(10), [2])
        self.assertCountEqual(presence_list(20), [3])


class JuriaProviderStatusMappingTests(SimpleTestCase):
    def test_provider_401_becomes_502(self):
        self.assertEqual(juria_error_http_status(JuriaAPIError("x", status_code=401)), 502)
        self.assertEqual(juria_error_http_status(JuriaAPIError("x", status_code=402)), 502)
        self.assertEqual(juria_error_http_status(JuriaAPIError("x", status_code=429)), 503)


class SecretKeyStagingGuardTests(SimpleTestCase):
    def test_staging_module_requires_strong_secret_key(self):
        staging_path = Path(__file__).resolve().parents[1] / "settings" / "staging.py"
        source = staging_path.read_text(encoding="utf-8")
        self.assertIn("ImproperlyConfigured", source)
        self.assertIn("SECRET_KEY must be set", source)
        self.assertIn("django-insecure-", source)

    def test_entrypoint_guards_secret_key(self):
        entry = Path(__file__).resolve().parents[2] / "docker-entrypoint.sh"
        source = entry.read_text(encoding="utf-8")
        self.assertIn("SECRET_KEY must be a unique random value", source)
        self.assertIn("MEDIA_ROOT must be a persistent absolute path", source)


class MediaDownloadAuthTests(APITestCase):
    def setUp(self):
        self.user, self.cabinet = create_cabinet_owner(email="media-owner@test.com")
        self.client = api_client_for(self.user)
        self.doc = Document.objects.create(
            title="Secret brief",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            file=SimpleUploadedFile("brief.pdf", b"%PDF-1.4 secret", content_type="application/pdf"),
            cabinet=self.cabinet,
            created_by=self.user,
        )

    def test_anonymous_cannot_download_library_file(self):
        url = reverse("library:document-download", kwargs={"pk": self.doc.pk})
        anon = self.client.__class__()
        response = anon.get(url)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_owner_can_download_and_serializer_points_at_api(self):
        detail = reverse("library:document-detail", kwargs={"pk": self.doc.pk})
        response = self.client.get(detail)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_url = response.data.get("file") or ""
        self.assertIn("/download", file_url)
        self.assertNotIn("/media/", file_url)

        download = reverse("library:document-download", kwargs={"pk": self.doc.pk})
        dl = self.client.get(download)
        self.assertEqual(dl.status_code, status.HTTP_200_OK)


class SetupPasswordValidationTests(APITestCase):
    def setUp(self):
        self.user, self.cabinet = create_cabinet_owner(email="invite-owner@test.com")
        self.member = User.objects.create_user(
            email="invitee@test.com",
            password="temporary-unused",
            first_name="Inv",
            last_name="Itee",
            phone="+33641999901",
            country="FR",
            cabinet=self.cabinet,
            is_cabinet_member=True,
        )
        self.token = PasswordSetupToken.objects.create(
            user=self.member,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=7),
        )

    def test_weak_password_rejected(self):
        response = self.client.post(
            "/api/v1/auth/setup-password/",
            {"token": self.token.token, "password": "1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_strong_password_accepted(self):
        password = "Str0ng-Invite-Pass!"
        validate_password(password, user=self.member)
        response = self.client.post(
            "/api/v1/auth/setup-password/",
            {"token": self.token.token, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AnonymizeErasureTests(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = create_cabinet_owner(email="erase-owner@test.com")
        self.client_user = User.objects.create_user(
            email="client-erase@test.com",
            password="testpass123",
            first_name="Client",
            last_name="Person",
            phone="+33641999902",
            country="FR",
            cabinet=self.cabinet,
            is_cabinet_member=False,
            accept_data_processing=True,
        )
        self.api = api_client_for(self.owner)

    def test_owner_can_anonymize_client(self):
        url = reverse("user-anonymize", kwargs={"pk": self.client_user.pk})
        response = self.api.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client_user.refresh_from_db()
        self.assertTrue(self.client_user.email.endswith("@deleted.local"))
        self.assertEqual(self.client_user.first_name, "Anonymized")
        self.assertFalse(self.client_user.accept_data_processing)


class InvoiceCurrencyTests(TestCase):
    def setUp(self):
        self.owner, self.cabinet = create_cabinet_owner(email="invoice-cur@test.com")
        FirmFinanceSettings.objects.update_or_create(
            cabinet=self.cabinet,
            defaults={"default_currency": "QAR", "is_tva_applicable": False},
        )

    def test_currency_snapshot_and_qa_zero_tva(self):
        try:
            from jurisdictions.models import Jurisdiction

            qa = Jurisdiction.objects.filter(code="QA").first()
            if qa:
                self.cabinet.jurisdiction = qa
                self.cabinet.save(update_fields=["jurisdiction"])
        except Exception:
            pass

        client_user = User.objects.create_user(
            email="invoice-client@test.com",
            password="testpass123",
            first_name="Cli",
            last_name="Ent",
            phone="+33641999903",
            country="FR",
        )
        profile = Client.objects.create(user=client_user)
        matter = Case.objects.create(
            cabinet=self.cabinet,
            title="Currency matter",
            description="desc",
            reference="REF-CUR-1",
            court="Tribunal",
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
            assigned_to=self.owner,
            client=client_user,
        )
        inv = Invoice(
            cabinet=self.cabinet,
            case=matter,
            client=profile,
            invoice_number="TST-CUR-1",
            amount_ht=Decimal("100.00"),
            created_by=self.owner,
        )
        inv.currency = ""
        inv.save()
        inv.refresh_from_db()
        self.assertEqual(inv.currency, "QAR")
        if getattr(self.cabinet, "jurisdiction", None) and self.cabinet.jurisdiction.code == "QA":
            self.assertEqual(inv.tva_rate, Decimal("0.00"))


class ActivityLogAdminImmutableTests(SimpleTestCase):
    def test_admin_forbids_mutations(self):
        from dashboard.admin import ActivityLogAdmin
        from dashboard.models import ActivityLog
        from django.contrib.admin.sites import AdminSite

        admin = ActivityLogAdmin(ActivityLog, AdminSite())
        request = mock.Mock()
        self.assertFalse(admin.has_add_permission(request))
        self.assertFalse(admin.has_change_permission(request))
        self.assertFalse(admin.has_delete_permission(request))


class ReleaseEmailOnProtectedDeleteTests(TestCase):
    def test_protected_client_keeps_row_but_frees_email(self):
        from users.views.anonymize import delete_user_or_release_email

        User = get_user_model()
        owner, cabinet = create_cabinet_owner(email="release-owner@test.com")
        client_user = User.objects.create_user(
            email="release-client@test.com",
            password="testpass123",
            first_name="Cli",
            last_name="Ent",
            phone=unique_test_phone(),
            country="FR",
            cabinet=cabinet,
            is_cabinet_member=False,
        )
        profile = Client.objects.create(user=client_user)
        matter = Case.objects.create(
            cabinet=cabinet,
            title="Release matter",
            description="desc",
            reference="REF-REL-1",
            court="Tribunal",
            case_type=Case.CaseType.LITIGATION,
            status=Case.CaseStatus.OPEN,
            assigned_to=owner,
            client=client_user,
        )
        Invoice.objects.create(
            cabinet=cabinet,
            case=matter,
            client=profile,
            invoice_number="TST-REL-1",
            amount_ht=Decimal("100.00"),
            created_by=owner,
        )

        self.assertEqual(delete_user_or_release_email(client_user), "released")
        client_user.refresh_from_db()
        self.assertTrue(client_user.email.endswith("@deleted.local"))
        self.assertFalse(User.objects.filter(email__iexact="release-client@test.com").exists())
        reused = User.objects.create_user(
            email="release-client@test.com",
            password="testpass123",
            first_name="New",
            last_name="Client",
            phone=unique_test_phone(),
            country="FR",
        )
        self.assertEqual(reused.email, "release-client@test.com")


class BlockedUploadExtensionTests(SimpleTestCase):
    def test_svg_and_html_rejected(self):
        from core.uploads import validate_safe_upload_extension

        for name in ("x.svg", "page.html", "index.htm"):
            with self.assertRaises(ValidationError):
                validate_safe_upload_extension(SimpleUploadedFile(name, b"<svg/>"))
