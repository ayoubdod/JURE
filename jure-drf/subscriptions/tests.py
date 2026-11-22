import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal
from threading import Thread
from unittest.mock import patch

from django.db import connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cabinets.models import Cabinet
from core.testing import api_client_for, create_cabinet_member, create_cabinet_owner
from jurisdictions.models import Jurisdiction
from subscriptions.exceptions import EntitlementDenied
from subscriptions.models import (
    AddonPurchase,
    BankTransfer,
    CreditLedger,
    CreditLot,
    CreditPackage,
    CreditWallet,
    Plan,
    StoragePackage,
    Subscription,
    SubscriptionInvoice,
)
from subscriptions.services.bank_transfer import record_bank_transfer
from subscriptions.services.catalog import seed_catalog
from subscriptions.services.lifecycle import activate_from_verified_payment
from subscriptions.services.credits import grant, reserve_for_operation
from subscriptions.services.entitlements import assert_can_add_member, assert_storage
from subscriptions.services.lifecycle import load_subscription, mark_verified, provision_trial
from users.models import User
from users.tests import _register_payload, _seed_jurisdiction


class RegistrationSubscriptionTests(APITestCase):
    def setUp(self):
        _seed_jurisdiction()
        seed_catalog()
        self.url = reverse("rest_register")

    def test_registration_creates_trial_subscription_without_login(self):
        payload = _register_payload(email="solo@example.com", phone="+212661100001")
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        user = User.objects.get(email="solo@example.com")
        subscription = user.cabinet.subscription
        self.assertEqual(subscription.plan.code, "cabinet")
        self.assertEqual(subscription.billing_cycle, "annual")
        self.assertEqual(subscription.status, Subscription.Status.PENDING_VERIFICATION)
        self.assertEqual(subscription.trial_end - subscription.trial_start, timedelta(days=14))
        self.assertEqual(user.cabinet.credit_wallet.balance, 100)
        self.assertEqual(
            CreditLedger.objects.filter(cabinet=user.cabinet, movement_type=CreditLedger.Movement.TRIAL_GRANT).count(),
            1,
        )
        self.assertFalse(
            CreditLedger.objects.filter(cabinet=user.cabinet, movement_type=CreditLedger.Movement.INCLUDED_GRANT).exists()
        )
        self.assertEqual(subscription.status, Subscription.Status.PENDING_VERIFICATION)
        mark_verified(user)
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.TRIALING)
        self.assertEqual(user.cabinet.credit_wallet.balance, 100)

    def test_multipart_registration_accepts_dotted_subscription_fields(self):
        payload = _register_payload(email="multipart@example.com", phone="+212661100020", website="")
        selection = payload.pop("subscription")
        payload["subscription.plan_code"] = selection["plan_code"]
        payload["subscription.billing_cycle"] = selection["billing_cycle"]
        for key in ("accept_terms", "accept_data_processing"):
            payload[key] = "true"
        response = self.client.post(self.url, payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(email="multipart@example.com")
        self.assertEqual(user.cabinet.subscription.plan.code, "cabinet")
        self.assertEqual(user.cabinet.subscription.billing_cycle, "annual")

    def test_invalid_plan_and_cycle_and_enterprise_are_rejected(self):
        missing = _register_payload(email="nop@example.com", phone="+212661100002")
        missing.pop("subscription")
        self.assertEqual(self.client.post(self.url, missing, format="json").status_code, status.HTTP_400_BAD_REQUEST)

        bad_plan = _register_payload(
            email="badplan@example.com",
            phone="+212661100003",
            subscription={"plan_code": "nope", "billing_cycle": "monthly"},
        )
        self.assertEqual(self.client.post(self.url, bad_plan, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="badplan@example.com").exists())

        bad_cycle = _register_payload(
            email="badcycle@example.com",
            phone="+212661100004",
            subscription={"plan_code": "solo", "billing_cycle": "weekly"},
        )
        self.assertEqual(self.client.post(self.url, bad_cycle, format="json").status_code, status.HTTP_400_BAD_REQUEST)

        enterprise = _register_payload(
            email="ent@example.com",
            phone="+212661100005",
            subscription={"plan_code": "enterprise", "billing_cycle": "annual", "monthly_price": "1"},
        )
        response = self.client.post(self.url, enterprise, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="ent@example.com").exists())

    def test_registration_rolls_back_when_subscription_setup_fails(self):
        payload = _register_payload(email="rollback@example.com", phone="+212661100006")
        with patch(
            "subscriptions.services.lifecycle.CreditWallet.objects.create",
            side_effect=RuntimeError("wallet failed"),
        ):
            response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="rollback@example.com").exists())
        self.assertFalse(Cabinet.objects.filter(trade_name="Doe Law", owner__email="rollback@example.com").exists())


class TrialAndEntitlementTests(TestCase):
    def setUp(self):
        seed_catalog()
        self.owner, self.cabinet = create_cabinet_owner(email="owner@example.com")
        provision_trial(cabinet=self.cabinet, plan_code="business", billing_cycle="monthly")

    def test_trial_does_not_convert_itself_and_expires(self):
        subscription = self.cabinet.subscription
        subscription.trial_end = timezone.now() - timedelta(minutes=1)
        subscription.status = Subscription.Status.TRIALING
        subscription.save(update_fields=["trial_end", "status"])
        refreshed = load_subscription(self.cabinet)
        self.assertEqual(refreshed.status, Subscription.Status.EXPIRED)
        from subscriptions.services.lifecycle import blocks_writes

        self.assertTrue(blocks_writes(self.owner))

    def test_one_trial_grant_and_seat_cap(self):
        with self.assertRaises(Exception):
            provision_trial(cabinet=self.cabinet, plan_code="solo", billing_cycle="monthly")
        self.assertEqual(
            CreditLedger.objects.filter(cabinet=self.cabinet, movement_type=CreditLedger.Movement.TRIAL_GRANT).count(),
            1,
        )
        create_cabinet_member(self.cabinet, email="second@example.com")
        with self.assertRaises(EntitlementDenied):
            assert_can_add_member(self.cabinet)

    def test_storage_limit_is_enforced_from_the_catalogue(self):
        plan = self.cabinet.subscription.plan
        plan.storage_bytes = 100
        plan.save(update_fields=["storage_bytes"])
        with self.assertRaises(EntitlementDenied):
            assert_storage(self.cabinet, 101)
        assert_storage(self.cabinet, 50)

    def test_member_cannot_change_plan_and_other_cabinet_is_isolated(self):
        member = create_cabinet_member(self.cabinet, email="lawyer@example.com", role="LAWYER")
        other, other_cabinet = create_cabinet_owner(email="other@example.com", trade_name="Other")
        provision_trial(cabinet=other_cabinet, plan_code="solo", billing_cycle="monthly")
        client = api_client_for(member)
        denied = client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "solo", "billing_cycle": "monthly", "monthly_price": "1"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        owner_client = api_client_for(self.owner)
        own = owner_client.get("/api/v1/subscriptions/current/")
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(own.data["plan"]["code"], "business")
        self.assertIn("invoices", own.data)
        other_view = api_client_for(other).get("/api/v1/subscriptions/current/")
        self.assertEqual(other_view.data["plan"]["code"], "solo")
        priced = owner_client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "solo", "billing_cycle": "monthly", "monthly_price": "1"},
            format="json",
        )
        self.assertEqual(priced.status_code, status.HTTP_400_BAD_REQUEST)
        self.cabinet.subscription.refresh_from_db()
        self.assertEqual(self.cabinet.subscription.plan.code, "business")


class PaymentAndCreditTests(APITestCase):
    def setUp(self):
        seed_catalog()
        self.owner, self.cabinet = create_cabinet_owner(email="pay@example.com")
        provision_trial(cabinet=self.cabinet, plan_code="solo", billing_cycle="monthly")
        self.client = api_client_for(self.owner)

    def test_change_plan_does_not_activate_a_paid_subscription(self):
        subscription = self.cabinet.subscription
        subscription.status = Subscription.Status.EXPIRED
        subscription.save(update_fields=["status"])
        response = self.client.post(
            "/api/v1/subscriptions/change-plan/",
            {"plan_code": "cabinet", "billing_cycle": "annual"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["payment_required"])
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.PENDING_PAYMENT)
        self.assertNotEqual(subscription.list_price, 1)

    def test_unsigned_payment_event_does_not_activate(self):
        response = self.client.post(
            "/api/v1/subscriptions/payment-events/",
            {
                "event_id": "evt-forge",
                "event_type": "payment_succeeded",
                "cabinet_id": self.cabinet.id,
                "paid": True,
            },
            format="json",
        )
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_503_SERVICE_UNAVAILABLE))
        self.cabinet.subscription.refresh_from_db()
        self.assertNotEqual(self.cabinet.subscription.status, Subscription.Status.ACTIVE)

    @override_settings(JURE_BILLING_WEBHOOK_SECRET="test-secret")
    def test_verified_payment_is_idempotent_and_replaces_trial_credits(self):
        body = json.dumps(
            {
                "event_id": "evt-ok",
                "event_type": "payment_succeeded",
                "cabinet_id": self.cabinet.id,
            }
        ).encode()
        signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
        first = self.client.post(
            "/api/v1/subscriptions/payment-events/",
            data=body,
            content_type="application/json",
            HTTP_X_JURE_SIGNATURE=signature,
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.content)
        self.cabinet.subscription.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.subscription.status, Subscription.Status.ACTIVE)
        self.assertEqual(self.cabinet.credit_wallet.balance, 100)
        second = self.client.post(
            "/api/v1/subscriptions/payment-events/",
            data=body,
            content_type="application/json",
            HTTP_X_JURE_SIGNATURE=signature,
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data["duplicate"])
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 100)

    def test_expired_subscription_blocks_workspace_writes(self):
        subscription = self.cabinet.subscription
        subscription.status = Subscription.Status.EXPIRED
        subscription.save(update_fields=["status"])
        response = self.client.post("/api/v1/cases/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["code"], "subscription_inactive")
        reading = self.client.get("/api/v1/subscriptions/current/")
        self.assertEqual(reading.status_code, status.HTTP_200_OK)


class ConcurrentCreditTests(TransactionTestCase):
    def setUp(self):
        seed_catalog()
        Jurisdiction.objects.get_or_create(
            code="MA",
            defaults={
                "name": "Morocco",
                "country_code": "MA",
                "legal_system": "civil_law",
                "default_language": "fr",
                "status": Jurisdiction.Status.ACTIVE,
            },
        )
        self.owner, self.cabinet = create_cabinet_owner(email="race@example.com")
        CreditWallet.objects.create(cabinet=self.cabinet, balance=0)
        grant(
            cabinet=self.cabinet,
            movement=CreditLedger.Movement.TRIAL_GRANT,
            amount=5,
            description="race",
            idempotency_key="race-grant",
        )

    def test_concurrent_deductions_cannot_go_negative(self):
        results = []

        def worker(index):
            try:
                reserve_for_operation(
                    user=self.owner,
                    cabinet=self.cabinet,
                    operation="legal_drafting",
                    idempotency_key=f"race-{index}",
                )
                results.append("ok")
            except EntitlementDenied:
                results.append("denied")
            finally:
                connections.close_all()

        threads = [Thread(target=worker, args=(index,)) for index in range(4)]
        connections.close_all()
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertGreaterEqual(self.cabinet.credit_wallet.balance, 0)
        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(self.cabinet.credit_wallet.balance, 0)


class BankTransferAdminTests(TestCase):
    def setUp(self):
        seed_catalog()
        self.owner, self.cabinet = create_cabinet_owner(email="transfer-owner@example.com", trade_name="Cabinet Virement")
        provision_trial(cabinet=self.cabinet, plan_code="cabinet", billing_cycle="monthly")
        mark_verified(self.owner)
        self.staff = User.objects.create_superuser(
            email="billing-staff@example.com",
            password="testpass123",
            phone="+212600000091",
            first_name="Billing",
            last_name="Staff",
        )
        self.client.force_login(self.staff)

    def test_recording_a_transfer_activates_the_subscription(self):
        subscription = self.cabinet.subscription
        url = reverse("admin:subscriptions_subscription_record_bank_transfer_action", args=[subscription.pk])
        response = self.client.post(
            url,
            {
                "reference": "VIR-2026-001",
                "amount": "1198.80",
                "received_on": timezone.localdate().isoformat(),
                "plan": subscription.plan_id,
                "billing_cycle": "monthly",
                "note": "Attijariwafa",
                "_form_submitted": "true",
            },
        )
        self.assertEqual(response.status_code, 302, response.content[:500])
        subscription.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.ACTIVE)
        self.assertIsNotNone(subscription.current_period_end)
        self.assertEqual(self.cabinet.credit_wallet.balance, 500)
        self.assertTrue(BankTransfer.objects.filter(reference="VIR-2026-001", recorded_by=self.staff).exists())
        self.assertEqual(
            SubscriptionInvoice.objects.get(subscription=subscription).status,
            SubscriptionInvoice.Status.PAID,
        )
        self.assertEqual(
            CreditLedger.objects.filter(
                cabinet=self.cabinet,
                movement_type=CreditLedger.Movement.INCLUDED_GRANT,
            ).count(),
            1,
        )

    def test_a_second_transfer_is_refused_while_the_period_is_paid(self):
        from django.core.exceptions import ValidationError

        subscription = self.cabinet.subscription
        record_bank_transfer(
            subscription=subscription,
            reference="VIR-ONCE",
            amount=Decimal("1198.80"),
            received_on=timezone.localdate(),
        )
        with self.assertRaises(ValidationError):
            record_bank_transfer(
                subscription=subscription,
                reference="VIR-ONCE",
                amount=Decimal("1198.80"),
                received_on=timezone.localdate(),
            )
        with self.assertRaises(ValidationError):
            record_bank_transfer(
                subscription=subscription,
                reference="VIR-OTHER",
                amount=Decimal("1198.80"),
                received_on=timezone.localdate(),
            )
        self.assertEqual(
            CreditLedger.objects.filter(
                cabinet=self.cabinet,
                movement_type=CreditLedger.Movement.INCLUDED_GRANT,
            ).count(),
            1,
        )

    def test_enterprise_transfer_uses_the_credits_entered_by_staff(self):
        enterprise = Plan.objects.get(code="enterprise")
        transfer = record_bank_transfer(
            subscription=self.cabinet.subscription,
            reference="VIR-ENT",
            amount=Decimal("12000.00"),
            received_on=timezone.localdate(),
            plan=enterprise,
            billing_cycle="annual",
            credit_allowance=250,
        )
        transfer.subscription.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(transfer.subscription.plan, enterprise)
        self.assertEqual(transfer.subscription.status, Subscription.Status.ACTIVE)
        self.assertEqual(self.cabinet.credit_wallet.balance, 250)


class AddonPurchaseTests(APITestCase):
    def setUp(self):
        seed_catalog()
        self.owner, self.cabinet = create_cabinet_owner(email="addon@example.com", trade_name="Cabinet Addons")
        provision_trial(cabinet=self.cabinet, plan_code="cabinet", billing_cycle="monthly")
        mark_verified(self.owner)
        self.client = api_client_for(self.owner)
        self.staff = User.objects.create_superuser(
            email="addon-staff@example.com",
            password="testpass123",
            phone="+212600000081",
            first_name="Addon",
            last_name="Staff",
        )

    def test_unpriced_storage_cannot_be_purchased_and_priced_storage_waits_for_staff(self):
        from subscriptions.services.resources import verify_addon_purchase

        blocked = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_m"}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        StoragePackage.objects.filter(code="storage_m").update(price=Decimal("150.00"))
        created = self.client.post("/api/v1/subscriptions/storage/purchase/", {"package_code": "storage_m"}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data["status"], AddonPurchase.Status.PENDING_VERIFICATION)
        self.assertFalse(created.data["tax_confirmed"])
        plan_bytes = self.cabinet.subscription.plan.storage_bytes
        from subscriptions.services.entitlements import storage_limit_bytes

        self.assertEqual(storage_limit_bytes(self.cabinet.subscription), plan_bytes)
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        verify_addon_purchase(purchase=purchase, bank_reference="VIR-STO-1", note="", verified_by=self.staff)
        self.cabinet.subscription.refresh_from_db()
        self.assertEqual(storage_limit_bytes(self.cabinet.subscription), plan_bytes + purchase.capacity_bytes)
        with self.assertRaises(Exception):
            verify_addon_purchase(purchase=purchase, bank_reference="VIR-STO-2", note="", verified_by=self.staff)

    def test_member_cannot_purchase_and_other_cabinet_cannot_cancel(self):
        CreditPackage.objects.filter(code="ai_starter").update(price=Decimal("99.00"))
        member = create_cabinet_member(self.cabinet, email="addon-member@example.com", role="LAWYER")
        denied = api_client_for(member).post(
            "/api/v1/subscriptions/credits/purchase/",
            {"package_code": "ai_starter"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        created = self.client.post("/api/v1/subscriptions/credits/purchase/", {"package_code": "ai_starter"}, format="json")
        other, _other_cabinet = create_cabinet_owner(email="addon-other@example.com")
        stolen = api_client_for(other).post(f"/api/v1/subscriptions/purchases/{created.data['id']}/cancel/")
        self.assertEqual(stolen.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AddonPurchase.objects.get(pk=created.data["id"]).status, AddonPurchase.Status.PENDING_VERIFICATION)

    def test_credits_are_granted_once_and_survive_subscription_payment(self):
        from subscriptions.services.resources import reject_addon_purchase, verify_addon_purchase

        created = self.client.post("/api/v1/subscriptions/credits/purchase/", {"package_code": "ai_starter"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 100)
        reject = AddonPurchase.objects.get(pk=purchase.pk)
        # A rejected purchase grants nothing. Use a second request for the successful path.
        reject_addon_purchase(purchase=reject, note="not received", verified_by=self.staff)
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 100)

        created = self.client.post("/api/v1/subscriptions/credits/purchase/", {"package_code": "ai_starter"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        verify_addon_purchase(purchase=purchase, bank_reference="VIR-AIC-1", note="", verified_by=self.staff)
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(self.cabinet.credit_wallet.balance, 350)
        lot = CreditLot.objects.get(purchase=purchase)
        self.assertEqual(lot.remaining, 250)
        reserve_for_operation(
            user=self.owner,
            cabinet=self.cabinet,
            operation="legal_drafting",
            idempotency_key="addon-draft",
        )
        lot.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(lot.remaining, 245)
        self.assertEqual(self.cabinet.credit_wallet.balance, 345)
        activate_from_verified_payment(self.cabinet.subscription, event_id="evt-keep-purchased")
        self.cabinet.credit_wallet.refresh_from_db()
        lot.refresh_from_db()
        self.assertEqual(lot.remaining, 245)
        self.assertEqual(self.cabinet.credit_wallet.balance, 500 + 245)

    def test_expired_purchased_credits_are_not_spent(self):
        from subscriptions.services.resources import verify_addon_purchase

        created = self.client.post("/api/v1/subscriptions/credits/purchase/", {"package_code": "ai_starter"}, format="json")
        purchase = AddonPurchase.objects.get(pk=created.data["id"])
        verify_addon_purchase(purchase=purchase, bank_reference="VIR-AIC-EXP", note="", verified_by=self.staff)
        lot = CreditLot.objects.get(purchase=purchase)
        lot.expires_at = timezone.now() - timedelta(days=1)
        lot.save(update_fields=["expires_at"])
        reserve_for_operation(
            user=self.owner,
            cabinet=self.cabinet,
            operation="legal_question",
            idempotency_key="after-expiry",
        )
        lot.refresh_from_db()
        self.cabinet.credit_wallet.refresh_from_db()
        self.assertEqual(lot.remaining, 0)
        self.assertEqual(self.cabinet.credit_wallet.balance, 99)

    def test_legacy_cabinet_without_subscription_is_not_metered(self):
        legacy, legacy_cabinet = create_cabinet_owner(email="legacy-addon@example.com")
        self.assertFalse(hasattr(legacy_cabinet, "subscription") and Subscription.objects.filter(cabinet=legacy_cabinet).exists())
        assert_storage(legacy_cabinet, 10 ** 12)
        denied = api_client_for(legacy).post(
            "/api/v1/subscriptions/credits/purchase/",
            {"package_code": "ai_starter"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)

