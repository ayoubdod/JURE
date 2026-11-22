"""End-to-end checks for lifecycle, add-ons, isolation, and storage enforcement."""

from datetime import timedelta
from decimal import Decimal
from threading import Thread
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connections, transaction
from django.db.utils import OperationalError
from django.test import Client, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from core.testing import api_client_for, create_cabinet_member, create_cabinet_owner
from juria.constants import ProjectRole
from juria.models import JuriaFile, JuriaProject, JuriaProjectMember
from library.models import Document
from subscriptions.exceptions import EntitlementDenied
from subscriptions.models import (
    AddonPurchase,
    CreditLot,
    Plan,
    StorageEntitlement,
    StoragePackage,
    Subscription,
    SubscriptionInvoice,
)
from subscriptions.services.bank_transfer import record_bank_transfer
from subscriptions.services.catalog import seed_catalog
from subscriptions.services.credits import release_reservation, reserve_for_operation
from subscriptions.services.entitlements import assert_storage, storage_limit_bytes, storage_used_bytes
from subscriptions.services.lifecycle import activate_from_verified_payment, mark_verified, provision_trial
from subscriptions.services.resources import verify_addon_purchase
from users.models import User


def _pdf(name="brief.pdf", payload=b"%PDF-1.4 test"):
    return SimpleUploadedFile(name, payload, content_type="application/pdf")


class BillingQaTests(APITestCase):
    def setUp(self):
        seed_catalog()
        self.owner, self.cabinet = create_cabinet_owner(email="qa-owner@example.com", trade_name="Cabinet QA")
        provision_trial(cabinet=self.cabinet, plan_code="cabinet", billing_cycle="monthly")
        mark_verified(self.owner)
        self.client = api_client_for(self.owner)
        self.staff = User.objects.create_superuser(
            email="qa-staff@example.com",
            password="testpass123",
            phone="+212600000071",
            first_name="QA",
            last_name="Staff",
        )
        StoragePackage.objects.filter(code="storage_s").update(price=Decimal("50.00"))

    def _activate(self):
        subscription = self.cabinet.subscription
        subscription.status = Subscription.Status.ACTIVE
        subscription.current_period_start = timezone.now()
        subscription.current_period_end = timezone.now() + timedelta(days=30)
        subscription.save(update_fields=["status", "current_period_start", "current_period_end"])
        return subscription

    def test_webhook_without_secret_returns_503(self):
        with override_settings(JURE_BILLING_WEBHOOK_SECRET=""):
            response = self.client.post(
                "/api/v1/subscriptions/payment-events/",
                {"event_id": "evt-empty", "event_type": "payment_succeeded", "cabinet_id": self.cabinet.id},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.cabinet.subscription.refresh_from_db()
        self.assertEqual(self.cabinet.subscription.status, Subscription.Status.TRIALING)

    def test_trial_plan_change_does_not_charge_or_grant_credits(self):
        response = self.client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "business", "billing_cycle": "annual", "monthly_price": "1", "storage_bytes": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "business", "billing_cycle": "annual"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(response.data["payment_required"])
        self.cabinet.subscription.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.subscription.status, Subscription.Status.TRIALING)
        self.assertEqual(self.cabinet.subscription.plan.code, "business")
        self.assertEqual(self.cabinet.credit_wallet.balance, 100)
        self.assertFalse(SubscriptionInvoice.objects.filter(cabinet=self.cabinet).exists())

    def test_active_upgrade_waits_for_payment_and_downgrade_is_scheduled(self):
        subscription = self._activate()
        self.cabinet.credit_wallet.refresh_from_db()
        before = self.cabinet.credit_wallet.balance
        self.assertEqual(before, 100)
        upgrade = self.client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "business", "billing_cycle": "monthly"},
            format="json",
        )
        self.assertEqual(upgrade.status_code, status.HTTP_200_OK, upgrade.data)
        self.assertTrue(upgrade.data["payment_required"])
        self.assertEqual(upgrade.data["status"], Subscription.Status.ACTIVE)
        self.assertIsNotNone(upgrade.data["payment_instructions"]["reference"])
        subscription.refresh_from_db()
        self.assertEqual(subscription.plan.code, "cabinet")
        self.assertEqual(subscription.pending_plan.code, "business")
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, before)
        subscription.pending_plan = None
        subscription.pending_billing_cycle = ""
        subscription.save(update_fields=["pending_plan", "pending_billing_cycle"])
        downgrade = self.client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "solo", "billing_cycle": "monthly"},
            format="json",
        )
        self.assertEqual(downgrade.status_code, status.HTTP_200_OK, downgrade.data)
        self.assertFalse(downgrade.data["payment_required"])
        self.assertEqual(downgrade.data["effective"], "period_end")
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.ACTIVE)
        self.assertEqual(subscription.plan.code, "cabinet")
        self.assertEqual(subscription.pending_plan.code, "solo")

    def test_cancel_at_period_end_keeps_the_paid_status(self):
        subscription = self._activate()
        response = self.client.post("/api/v1/subscriptions/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        subscription.refresh_from_db()
        self.assertTrue(subscription.cancel_at_period_end)
        self.assertEqual(subscription.status, Subscription.Status.ACTIVE)
        reading = self.client.get("/api/v1/subscriptions/current/")
        self.assertEqual(reading.status_code, status.HTTP_200_OK)

    def test_past_due_blocks_writes_and_legacy_cabinet_does_not(self):
        subscription = self._activate()
        subscription.status = Subscription.Status.PAST_DUE
        subscription.save(update_fields=["status"])
        blocked = self.client.post("/api/v1/cases/", {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(blocked.json()["code"], "subscription_inactive")
        legacy, _cabinet = create_cabinet_owner(email="qa-legacy@example.com")
        open_write = api_client_for(legacy).post("/api/v1/cases/", {}, format="json")
        self.assertNotEqual(open_write.json().get("code"), "subscription_inactive")

    def test_purchase_ignores_client_price_and_capacity(self):
        created = self.client.post(
            "/api/v1/subscriptions/storage/purchase/",
            {
                "package_code": "storage_s",
                "price": "1.00",
                "subtotal": "1.00",
                "capacity_bytes": 1,
                "cabinet_id": 999999,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data["subtotal"], "50.00")
        self.assertGreater(created.data["capacity_bytes"], 1)
        self.assertEqual(AddonPurchase.objects.get(pk=created.data["id"]).cabinet_id, self.cabinet.id)
        StoragePackage.objects.filter(code="storage_m").update(price=Decimal("80.00"), billing_type="recurring")
        recurring = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_m"}, format="json")
        self.assertEqual(recurring.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_and_reject_grant_no_storage_and_admin_verify_grants_once(self):
        created = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_s"}, format="json")
        purchase_id = created.data["id"]
        limit_before = storage_limit_bytes(self.cabinet.subscription)
        cancelled = self.client.post(f"/api/v1/subscriptions/purchases/{purchase_id}/cancel/")
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK, cancelled.data)
        self.assertEqual(cancelled.data["status"], AddonPurchase.Status.CANCELLED)
        self.assertEqual(storage_limit_bytes(self.cabinet.subscription), limit_before)
        self.assertFalse(StorageEntitlement.objects.filter(purchase_id=purchase_id).exists())

        created = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_s"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        admin = Client()
        admin.force_login(self.staff)
        rejected = admin.post(
            reverse("admin:subscriptions_addonpurchase_reject_addon_action", args=[purchase.pk]),
            {"note": "transfer missing", "_form_submitted": "true"},
        )
        self.assertEqual(rejected.status_code, 302, rejected.content[:400])
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, AddonPurchase.Status.FAILED)
        self.assertFalse(StorageEntitlement.objects.filter(cabinet=self.cabinet).exists())

        created = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_s"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        verified = admin.post(
            reverse("admin:subscriptions_addonpurchase_verify_addon_action", args=[purchase.pk]),
            {"bank_reference": "QA-STO-1", "note": "seen", "_form_submitted": "true"},
        )
        self.assertEqual(verified.status_code, 302, verified.content[:400])
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, AddonPurchase.Status.PAID)
        self.assertEqual(StorageEntitlement.objects.filter(cabinet=self.cabinet).count(), 1)
        again = admin.post(
            reverse("admin:subscriptions_addonpurchase_verify_addon_action", args=[purchase.pk]),
            {"bank_reference": "QA-STO-2", "note": "again", "_form_submitted": "true"},
        )
        self.assertEqual(again.status_code, 302)
        self.assertEqual(StorageEntitlement.objects.filter(cabinet=self.cabinet).count(), 1)

    def test_bank_reference_cannot_be_shared_with_a_subscription_transfer(self):
        record_bank_transfer(
            subscription=self.cabinet.subscription,
            reference="QA-SHARED",
            amount=Decimal("1198.80"),
            received_on=timezone.localdate(),
        )
        created = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_s"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        with self.assertRaises(Exception):
            verify_addon_purchase(purchase=purchase, bank_reference="QA-SHARED", note="", verified_by=self.staff)
        self.assertFalse(StorageEntitlement.objects.filter(purchase=purchase).exists())

    def test_billing_history_is_isolated_and_hidden_from_members(self):
        self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_s"}, format="json")
        own = self.client.get("/api/v1/subscriptions/billing/")
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(len(own.data["purchases"]), 1)
        member = create_cabinet_member(self.cabinet, email="qa-lawyer@example.com", role="LAWYER")
        hidden = api_client_for(member).get("/api/v1/subscriptions/billing/")
        self.assertEqual(hidden.status_code, status.HTTP_403_FORBIDDEN)
        usage = api_client_for(member).get("/api/v1/subscriptions/storage/")
        self.assertEqual(usage.status_code, status.HTTP_200_OK)
        self.assertEqual(usage.data.get("pending_purchases"), [])
        other, _other_cabinet = create_cabinet_owner(email="qa-other@example.com")
        foreign = api_client_for(other).get("/api/v1/subscriptions/billing/")
        self.assertEqual(foreign.data["purchases"], [])
        current = api_client_for(member).get("/api/v1/subscriptions/current/")
        self.assertNotIn("invoices", current.data)

    def test_active_wallet_spends_monthly_credits_before_purchased_lots(self):
        activate_from_verified_payment(self.cabinet.subscription, event_id="qa-activate")
        created = self.client.post("/api/v1/subscriptions/credits/purchase/", {"package_code": "ai_starter"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 500)
        verify_addon_purchase(purchase=purchase, bank_reference="QA-AIC-1", note="", verified_by=self.staff)
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 750)
        usage = reserve_for_operation(
            user=self.owner,
            cabinet=self.cabinet,
            operation="legal_question",
            idempotency_key="qa-monthly-first",
        )
        lot = CreditLot.objects.get(purchase=purchase)
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(lot.remaining, 250)
        self.assertEqual(self.cabinet.credit_wallet.balance, 749)
        release_reservation(usage)
        lot.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(lot.remaining, 250)
        self.assertEqual(self.cabinet.credit_wallet.balance, 750)
        Plan.objects.filter(code="cabinet").update(monthly_juria_credits=500)
        self.cabinet.credit_wallet.balance = 0
        self.cabinet.credit_wallet.save(update_fields=["balance"])
        with self.assertRaises(EntitlementDenied):
            reserve_for_operation(
                user=self.owner,
                cabinet=self.cabinet,
                operation="legal_question",
                idempotency_key="qa-empty",
            )

    def test_uploads_stop_at_the_limit_and_existing_files_stay_readable(self):
        plan = self.cabinet.subscription.plan
        plan.storage_bytes = 10 ** 6
        plan.save(update_fields=["storage_bytes"])
        created = self.client.post(
            "/api/v1/library/documents/",
            {
                "title": "Kept",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "file": _pdf("kept.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        kept = self.client.get(f"/api/v1/library/documents/{created.data['id']}/")
        self.assertEqual(kept.status_code, status.HTTP_200_OK)
        plan.storage_bytes = 1
        plan.save(update_fields=["storage_bytes"])
        blocked = self.client.post(
            "/api/v1/library/documents/",
            {
                "title": "Too big",
                "category": Document.DocumentCategory.LEGISLATION_REGULATIONS,
                "file": _pdf("big.pdf", b"%PDF-1.4 " + b"x" * 40),
            },
            format="multipart",
        )
        self.assertEqual(blocked.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn("storage", str(blocked.data.get("detail", "")).lower())
        still = self.client.get(f"/api/v1/library/documents/{created.data['id']}/")
        self.assertEqual(still.status_code, status.HTTP_200_OK)

        case = Case.objects.create(
            case_type=Case.CaseType.LITIGATION,
            cabinet=self.cabinet,
            assigned_to=self.owner,
            created_by=self.owner,
            title="Matter",
            description="Notes",
            court="Court",
            reference="QA-CASE-1",
        )
        case_upload = self.client.post(
            f"/api/v1/cases/{case.pk}/attachments/",
            {"file": _pdf("matter.pdf", b"%PDF-1.4 " + b"y" * 40)},
            format="multipart",
        )
        self.assertEqual(case_upload.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(self.client.get(f"/api/v1/cases/{case.pk}/").status_code, status.HTTP_200_OK)

    @override_settings(JURIA_ENABLED=True)
    @patch("juria.views.mixins.provider_configured", return_value=True)
    def test_juria_project_upload_respects_the_storage_limit(self, _configured):
        plan = self.cabinet.subscription.plan
        plan.storage_bytes = 1
        plan.save(update_fields=["storage_bytes"])
        project = JuriaProject.objects.create(cabinet=self.cabinet, owner=self.owner, name="QA")
        JuriaProjectMember.objects.create(project=project, user=self.owner, role=ProjectRole.OWNER)
        removed = JuriaFile.objects.create(
            project=project,
            file=_pdf("gone.pdf", b"%PDF-1.4 gone"),
            original_name="gone.pdf",
            file_kind="pdf",
            size_bytes=500,
            is_removed=True,
            uploaded_by=self.owner,
        )
        self.assertEqual(storage_used_bytes(self.cabinet), 0)
        response = self.client.post(
            f"/api/v1/juria/projects/{project.id}/files/",
            {"file": _pdf("extra.pdf", b"%PDF-1.4 " + b"z" * 40)},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED, response.data)
        self.assertFalse(JuriaFile.objects.filter(project=project, is_removed=False).exclude(pk=removed.pk).exists())


class ConcurrentStorageTests(TransactionTestCase):
    def test_concurrent_uploads_cannot_pass_the_limit(self):
        seed_catalog()
        owner, cabinet = create_cabinet_owner(email="qa-race@example.com")
        provision_trial(cabinet=cabinet, plan_code="solo", billing_cycle="monthly")
        plan = cabinet.subscription.plan
        plan.storage_bytes = 100
        plan.save(update_fields=["storage_bytes"])
        project = JuriaProject.objects.create(cabinet=cabinet, owner=owner, name="Race")
        results = []

        def worker(index):
            try:
                for _attempt in range(6):
                    try:
                        with transaction.atomic():
                            assert_storage(cabinet, 80)
                            JuriaFile.objects.create(
                                project=project,
                                file=_pdf(f"race-{index}.pdf", b"x" * 80),
                                original_name=f"race-{index}.pdf",
                                file_kind="pdf",
                                size_bytes=80,
                                uploaded_by=owner,
                            )
                        results.append("ok")
                        return
                    except EntitlementDenied:
                        results.append("denied")
                        return
                    except OperationalError:
                        connections.close_all()
            finally:
                connections.close_all()

        connections.close_all()
        threads = [Thread(target=worker, args=(index,)) for index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(results.count("ok"), 1)
        self.assertLessEqual(storage_used_bytes(cabinet), 100)
