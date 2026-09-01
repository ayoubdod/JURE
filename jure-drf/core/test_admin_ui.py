from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from cabinets.models import Cabinet
from cases.models import Case
from library.models import Document

User = get_user_model()


class JureAdminInterfaceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin-ui@test.com",
            password="adminpass123",
            first_name="Amina",
            last_name="Benali",
            phone="+33641000999",
            country="FR",
        )
        self.client.force_login(self.admin)
        self.cabinet = Cabinet.objects.create(
            owner=self.admin,
            trade_name="Cabinet Atlas",
            business_address="1 Rue Test",
        )
        Case.objects.create(
            title="Dossier test",
            description="Matter created for admin UI tests.",
            reference="L-2026-0001",
            court="Tribunal de commerce",
            cabinet=self.cabinet,
            status=Case.CaseStatus.OPEN,
            created_by=self.admin,
        )
        Document.objects.create(
            title="Code de commerce",
            category=Document.DocumentCategory.LEGISLATION_REGULATIONS,
            external_url="https://example.com/code",
            created_by=self.admin,
        )

    def test_dashboard_renders_real_kpis(self):
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertTrue(
            any(token in content for token in ("Good morning", "Good afternoon", "Good evening"))
        )
        self.assertIn("Amina Benali", content)
        self.assertIn("Total Users", content)
        self.assertIn("Cabinets", content)
        self.assertIn("Active Cases", content)
        self.assertIn("Documents", content)
        self.assertIn("Revenue", content)
        self.assertIn("AI Usage", content)
        self.assertIn("Recent Activity", content)
        self.assertIn("Cabinet Atlas", content)
        self.assertNotIn("10,398", content)

    def test_core_changelists_load(self):
        routes = [
            "admin:users_user_changelist",
            "admin:cabinets_cabinet_changelist",
            "admin:cases_case_changelist",
            "admin:library_document_changelist",
            "admin:dashboard_announcement_changelist",
            "admin:finance_invoice_changelist",
            "admin:finance_payment_changelist",
            "admin:finance_fee_changelist",
            "admin:clients_client_changelist",
            "admin:jurisdictions_jurisdiction_changelist",
        ]
        for name in routes:
            with self.subTest(name=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, 200)

    def test_library_bulk_upload_page_loads(self):
        response = self.client.get(reverse("admin:library_document_bulk_upload"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Drag and drop files here")

    def test_user_change_page_loads(self):
        response = self.client.get(
            reverse("admin:users_user_change", args=[self.admin.pk])
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "General information")
