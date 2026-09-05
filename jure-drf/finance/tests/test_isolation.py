"""Fee and expense rows are cabinet-scoped on the firm finance URLs."""

from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from cases.tests import _create_cabinet_user, _create_consultation, _create_firm_client
from finance.models import Expense, Fee, Invoice, InvoiceItem, Payment
from finance.services.case_finance_service import get_or_create_firm_client


class FinanceRecordCabinetIsolationTests(APITestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_user(email="fin-iso-a@test.com")
        self.user_b, self.cab_b = _create_cabinet_user(email="fin-iso-b@test.com")
        self.matter_b = _create_consultation(self.cab_b, self.user_b, title="Theirs matter")
        self.fee_b = Fee.objects.create(
            case=self.matter_b,
            fee_type=Fee.FeeType.FIXED,
            amount_expected=Decimal("1000.00"),
            created_by=self.user_b,
        )
        self.expense_b = Expense.objects.create(
            cabinet=self.cab_b,
            case=self.matter_b,
            description="Secret frais",
            amount=Decimal("50.00"),
            expense_date=date(2026, 1, 15),
            created_by=self.user_b,
        )
        client_user = _create_firm_client(self.cab_b, email="fin-client-b@test.com")
        self.matter_b.client = client_user
        self.matter_b.save(update_fields=["client"])
        profile = get_or_create_firm_client(client_user)
        self.invoice_b = Invoice.objects.create(
            cabinet=self.cab_b,
            invoice_number="INV-B-SECRET",
            case=self.matter_b,
            client=profile,
            amount_ht=Decimal("999.00"),
            notes="Secret invoice",
            created_by=self.user_b,
        )
        self.payment_b = Payment.objects.create(
            case=self.matter_b,
            client=profile,
            invoice=self.invoice_b,
            amount=Decimal("100.00"),
            payment_method=Payment.PaymentMethod.CASH,
            payment_date=date(2026, 1, 20),
            notes="Secret payment",
            created_by=self.user_b,
        )
        self.client.force_authenticate(self.user_a)

    def test_cannot_get_patch_or_delete_foreign_fee(self):
        url = f"/api/v1/finance/fees/{self.fee_b.pk}/"
        got = self.client.get(url)
        self.assertEqual(got.status_code, status.HTTP_404_NOT_FOUND)
        patched = self.client.patch(url, {"notes": "Hacked"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_404_NOT_FOUND)
        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_404_NOT_FOUND)
        self.fee_b.refresh_from_db()
        self.assertEqual(self.fee_b.notes, "")
        self.assertTrue(Fee.objects.filter(pk=self.fee_b.pk).exists())

    def test_cannot_get_patch_or_delete_foreign_expense(self):
        url = f"/api/v1/finance/expenses/{self.expense_b.pk}/"
        got = self.client.get(url)
        self.assertEqual(got.status_code, status.HTTP_404_NOT_FOUND)
        patched = self.client.patch(url, {"description": "Hacked"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_404_NOT_FOUND)
        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_404_NOT_FOUND)
        self.expense_b.refresh_from_db()
        self.assertEqual(self.expense_b.description, "Secret frais")
        self.assertTrue(Expense.objects.filter(pk=self.expense_b.pk).exists())

    def test_dashboard_and_lists_exclude_other_cabinet(self):
        dash = self.client.get("/api/v1/finance/dashboard/")
        self.assertEqual(dash.status_code, status.HTTP_200_OK, dash.data)
        self.assertEqual(dash.data["kpis"]["total_expenses"], 0)

        recv = self.client.get("/api/v1/finance/receivables/")
        self.assertEqual(recv.status_code, status.HTTP_200_OK, recv.data)

        invoices = self.client.get("/api/v1/finance/invoices/")
        self.assertEqual(invoices.status_code, status.HTTP_200_OK, invoices.data)
        inv_rows = invoices.data["results"] if isinstance(invoices.data, dict) else invoices.data
        self.assertNotIn(self.invoice_b.pk, [row["id"] for row in inv_rows])

        payments = self.client.get("/api/v1/finance/payments/")
        self.assertEqual(payments.status_code, status.HTTP_200_OK, payments.data)
        pay_rows = payments.data["results"] if isinstance(payments.data, dict) else payments.data
        self.assertNotIn(self.payment_b.pk, [row["id"] for row in pay_rows])

        self.assertEqual(list(recv.data.get("invoices") or []), [])

        tva = self.client.get("/api/v1/finance/tva-status/")
        self.assertEqual(tva.status_code, status.HTTP_200_OK, tva.data)
        self.assertNotIn("INV-B-SECRET", str(tva.data))

    def test_cannot_get_patch_or_delete_foreign_invoice(self):
        url = f"/api/v1/finance/invoices/{self.invoice_b.pk}/"
        got = self.client.get(url)
        self.assertEqual(got.status_code, status.HTTP_404_NOT_FOUND)
        patched = self.client.patch(url, {"notes": "Hacked"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_404_NOT_FOUND)
        status_patch = self.client.patch(
            f"{url}status/",
            {"status": "SENT"},
            format="json",
        )
        self.assertEqual(status_patch.status_code, status.HTTP_404_NOT_FOUND)
        pdf = self.client.get(f"{url}pdf/")
        self.assertEqual(pdf.status_code, status.HTTP_404_NOT_FOUND)
        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_404_NOT_FOUND)
        self.invoice_b.refresh_from_db()
        self.assertEqual(self.invoice_b.notes, "Secret invoice")
        self.assertEqual(self.invoice_b.status, Invoice.Status.DRAFT)
        self.assertTrue(Invoice.objects.filter(pk=self.invoice_b.pk).exists())

    def test_cannot_get_patch_or_delete_foreign_payment(self):
        url = f"/api/v1/finance/payments/{self.payment_b.pk}/"
        got = self.client.get(url)
        self.assertEqual(got.status_code, status.HTTP_404_NOT_FOUND)
        cancelled = self.client.patch(url, {"status": "CANCELLED"}, format="json")
        self.assertEqual(cancelled.status_code, status.HTTP_404_NOT_FOUND)
        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_404_NOT_FOUND)
        self.payment_b.refresh_from_db()
        self.assertEqual(self.payment_b.status, Payment.Status.CONFIRMED)
        self.assertEqual(self.payment_b.notes, "Secret payment")
        self.assertTrue(Payment.objects.filter(pk=self.payment_b.pk).exists())

    def test_cannot_attach_foreign_finance_rows_to_own_matter(self):
        matter_a = _create_consultation(self.cab_a, self.user_a, title="Ours matter")
        client_a = _create_firm_client(self.cab_a, email="fin-client-a@test.com")
        matter_a.client = client_a
        matter_a.save(update_fields=["client"])
        profile_a = get_or_create_firm_client(client_a)
        invoice_a = Invoice.objects.create(
            cabinet=self.cab_a,
            invoice_number="INV-A-OWN",
            case=matter_a,
            client=profile_a,
            amount_ht=Decimal("50.00"),
            created_by=self.user_a,
        )

        lawyer = self.client.post(
            f"/api/v1/cases/{matter_a.pk}/fees/",
            {
                "fee_type": "FIXED",
                "planned_amount": "100.00",
                "lawyer_id": self.user_b.id,
            },
            format="json",
        )
        self.assertEqual(lawyer.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Fee.objects.filter(case=matter_a).exists())

        invoiced = self.client.post(
            f"/api/v1/cases/{matter_a.pk}/invoices/",
            {"amount_ht": "10.00", "fee_id": self.fee_b.pk},
            format="json",
        )
        self.assertEqual(invoiced.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            Invoice.objects.filter(case=matter_a).exclude(pk=invoice_a.pk).exists()
        )

        paid = self.client.post(
            f"/api/v1/cases/{matter_a.pk}/payments/",
            {
                "amount": "10.00",
                "payment_method": "CASH",
                "payment_date": "2026-01-20",
                "invoice_id": self.invoice_b.pk,
            },
            format="json",
        )
        self.assertEqual(paid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payment.objects.filter(case=matter_a).exists())

        patched = self.client.patch(
            f"/api/v1/finance/invoices/{invoice_a.pk}/",
            {
                "items": [
                    {
                        "description": "Hijack fee",
                        "quantity": "1",
                        "unit_price": "50.00",
                        "fee_id": self.fee_b.pk,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(patched.status_code, status.HTTP_400_BAD_REQUEST, patched.data)
        self.assertFalse(InvoiceItem.objects.filter(invoice=invoice_a, fee=self.fee_b).exists())
        expense_line = self.client.patch(
            f"/api/v1/finance/invoices/{invoice_a.pk}/",
            {
                "items": [
                    {
                        "description": "Hijack expense",
                        "quantity": "1",
                        "unit_price": "50.00",
                        "expense_id": self.expense_b.pk,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(expense_line.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            InvoiceItem.objects.filter(invoice=invoice_a, expense=self.expense_b).exists()
        )
