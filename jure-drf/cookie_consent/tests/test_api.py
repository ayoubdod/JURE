"""Cookie consent storage, access control, and CSRF."""

from __future__ import annotations

import uuid

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import RequestFactory, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from cookie_consent.constants import ConsentAction
from cookie_consent.models import CookieConsent, CookieConsentEvent
from core.testing import unique_test_phone

User = get_user_model()
URL = "/api/v1/cookie-consent/"


def _user(email: str):
    return User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=unique_test_phone(),
        country="MA",
    )


@override_settings(COOKIE_ANALYTICS_CONFIGURED=True)
class CookieConsentAPITests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

    def put_consent(self, client, payload):
        client.get(URL)
        token = client.cookies["csrftoken"].value
        return client.put(URL, payload, format="json", HTTP_X_CSRFTOKEN=token)

    def test_anonymous_accept_sets_httponly_cookie_and_one_event(self):
        preview = self.client.get(URL)
        self.assertIsNone(preview.data["decision"])
        self.assertNotIn("jure-consent", preview.cookies)
        response = self.put_consent(self.client, {"action": "accept_all"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["subject"], "anonymous")
        self.assertEqual(response.data["decision"]["action"], "accept_all")
        self.assertTrue(response.data["decision"]["functional"])
        self.assertTrue(response.data["decision"]["analytics"])
        self.assertFalse(response.data["decision"]["stale"])
        self.assertTrue(response.data["decision"]["effective_analytics"])
        cookie = response.cookies["jure-consent"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertFalse(cookie["secure"])
        anonymous_id = uuid.UUID(cookie.value)
        self.assertNotIn(str(anonymous_id), str(response.data))
        self.assertEqual(CookieConsent.objects.count(), 1)
        self.assertEqual(CookieConsentEvent.objects.count(), 1)
        row = CookieConsent.objects.get()
        self.assertEqual(row.anonymous_id, anonymous_id)
        self.assertIsNone(row.user_id)

    def test_repeat_choice_does_not_append_another_event(self):
        first = self.put_consent(self.client, {"action": "reject_non_essential"})
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.put_consent(self.client, {"action": "reject_non_essential"})
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(CookieConsent.objects.count(), 1)
        self.assertEqual(CookieConsentEvent.objects.count(), 1)
        row = CookieConsent.objects.get()
        self.assertFalse(row.functional)
        self.assertFalse(row.analytics)

    def test_custom_withdrawal_and_contradictory_payloads(self):
        custom = self.put_consent(
            self.client,
            {"action": "custom", "functional": True, "analytics": False},
        )
        self.assertEqual(custom.status_code, status.HTTP_201_CREATED)
        self.assertTrue(custom.data["decision"]["functional"])
        self.assertFalse(custom.data["decision"]["effective_analytics"])

        withdrawn = self.put_consent(self.client, {"action": "withdraw"})
        self.assertEqual(withdrawn.status_code, status.HTTP_200_OK)
        self.assertEqual(withdrawn.data["decision"]["action"], "withdraw")
        self.assertFalse(withdrawn.data["decision"]["effective_functional"])
        self.assertFalse(withdrawn.data["decision"]["effective_analytics"])
        self.assertEqual(CookieConsentEvent.objects.count(), 2)

        missing = self.put_consent(self.client, {"action": "custom", "functional": True})
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        conflict = self.put_consent(
            self.client,
            {"action": "reject_non_essential", "analytics": True},
        )
        self.assertEqual(conflict.status_code, status.HTTP_400_BAD_REQUEST)
        marketing = self.put_consent(
            self.client,
            {"action": "custom", "functional": False, "analytics": False, "marketing": True},
        )
        self.assertEqual(marketing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CookieConsent.objects.get().action, ConsentAction.WITHDRAW)

    def test_returning_visitor_reads_only_their_cookie(self):
        created = self.put_consent(self.client, {"action": "accept_all"})
        cookie_value = created.cookies["jure-consent"].value
        again = self.client.get(URL)
        self.assertEqual(again.data["decision"]["action"], "accept_all")

        other = self.client_class()
        empty = other.get(URL)
        self.assertIsNone(empty.data["decision"])
        self.put_consent(other, {"action": "reject_non_essential"})
        self.assertEqual(CookieConsent.objects.count(), 2)
        original = CookieConsent.objects.get(anonymous_id=uuid.UUID(cookie_value))
        self.assertEqual(original.action, ConsentAction.ACCEPT_ALL)

        forged = self.put_consent(
            self.client,
            {"action": "reject_non_essential", "anonymous_id": cookie_value},
        )
        self.assertEqual(forged.status_code, status.HTTP_400_BAD_REQUEST)
        original.refresh_from_db()
        self.assertEqual(original.action, ConsentAction.ACCEPT_ALL)

    def test_policy_version_change_marks_decision_stale(self):
        self.put_consent(self.client, {"action": "accept_all"})
        with override_settings(COOKIE_CONSENT_POLICY_VERSION="2.0"):
            response = self.client.get(URL)
        self.assertEqual(response.data["policy_version"], "2.0")
        self.assertTrue(response.data["decision"]["stale"])
        self.assertEqual(response.data["decision"]["policy_version"], "1.0")
        self.assertTrue(response.data["decision"]["analytics"])
        self.assertFalse(response.data["decision"]["effective_analytics"])
        self.assertFalse(response.data["decision"]["effective_functional"])

    def test_authenticated_users_are_isolated_and_adopt_anonymous_choice(self):
        owner = _user("consent-owner@jure.test")
        other = _user("consent-other@jure.test")
        anon = self.put_consent(
            self.client,
            {"action": "custom", "functional": True, "analytics": False},
        )
        self.client.force_authenticate(user=owner)
        adopted = self.client.get(URL)
        self.assertEqual(adopted.status_code, status.HTTP_200_OK)
        self.assertEqual(adopted.data["subject"], "user")
        self.assertEqual(adopted.data["decision"]["action"], "custom")
        self.assertEqual(adopted.cookies["jure-consent"]["max-age"], 0)
        row = CookieConsent.objects.get()
        self.assertEqual(row.user_id, owner.id)
        self.assertIsNone(row.anonymous_id)
        self.assertNotIn(owner.email, str(adopted.data))

        self.client.force_authenticate(user=other)
        hidden = self.client.get(URL)
        self.assertIsNone(hidden.data["decision"])
        self.assertEqual(CookieConsent.objects.filter(user=owner).count(), 1)

    def test_existing_user_decision_wins_over_anonymous_row(self):
        owner = _user("consent-keep@jure.test")
        self.client.force_authenticate(user=owner)
        saved = self.put_consent(self.client, {"action": "reject_non_essential"})
        self.assertEqual(saved.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("jure-consent", saved.cookies)

        stranger = self.client_class()
        self.put_consent(stranger, {"action": "accept_all"})
        stranger.force_authenticate(user=owner)
        seen = stranger.get(URL)
        self.assertEqual(seen.data["decision"]["action"], "reject_non_essential")
        self.assertFalse(CookieConsent.objects.filter(anonymous_id__isnull=False).exists())
        self.assertEqual(CookieConsentEvent.objects.count(), 2)
        self.assertEqual(CookieConsent.objects.get(user=owner).action, ConsentAction.REJECT_NON_ESSENTIAL)

    def test_put_requires_csrf_and_secure_cookie_follows_session_flag(self):
        # Django's test client skips CSRF unless enforcement is turned on.
        # Production requests do not set that skip flag.
        enforced = self.client_class(enforce_csrf_checks=True)
        bare = enforced.put(URL, {"action": "reject_non_essential"}, format="json")
        self.assertEqual(bare.status_code, status.HTTP_403_FORBIDDEN)

        with override_settings(SESSION_COOKIE_SECURE=True, SESSION_COOKIE_SAMESITE="None"):
            secured = self.put_consent(
                self.client_class(enforce_csrf_checks=True),
                {"action": "reject_non_essential"},
            )
        self.assertEqual(secured.cookies["jure-consent"]["samesite"], "None")
        self.assertEqual(secured.status_code, status.HTTP_201_CREATED)
        self.assertTrue(secured.cookies["jure-consent"]["secure"])
        self.assertTrue(secured.cookies["jure-consent"]["httponly"])

    def test_analytics_grant_is_refused_when_analytics_is_not_configured(self):
        with override_settings(COOKIE_ANALYTICS_CONFIGURED=False):
            refused = self.put_consent(
                self.client_class(),
                {"action": "custom", "functional": True, "analytics": True},
            )
            accepted = self.put_consent(self.client_class(), {"action": "accept_all"})
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertFalse(accepted.data["decision"]["analytics"])
        self.assertFalse(accepted.data["analytics_configured"])
        self.assertTrue(accepted.data["decision"]["functional"])

    def test_database_rejects_inconsistent_or_subjectless_rows(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CookieConsent.objects.create(
                    anonymous_id=uuid.uuid4(),
                    action=ConsentAction.ACCEPT_ALL,
                    functional=False,
                    analytics=True,
                    policy_version="1.0",
                )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CookieConsent.objects.create(
                    action=ConsentAction.REJECT_NON_ESSENTIAL,
                    functional=False,
                    analytics=False,
                    policy_version="1.0",
                )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CookieConsent.objects.create(
                    user=_user("both-subjects@jure.test"),
                    anonymous_id=uuid.uuid4(),
                    action=ConsentAction.WITHDRAW,
                    functional=False,
                    analytics=False,
                    policy_version="1.0",
                )

    def test_admin_is_read_only_except_superuser_delete(self):
        self.assertEqual(reverse("cookie-consent"), "/api/v1/cookie-consent/")
        staff = _user("consent-staff@jure.test")
        staff.is_staff = True
        staff.save(update_fields=["is_staff"])
        superuser = _user("consent-root@jure.test")
        superuser.is_staff = True
        superuser.is_superuser = True
        superuser.save(update_fields=["is_staff", "is_superuser"])
        request = RequestFactory().get("/admin/cookie_consent/cookieconsent/")
        request.user = staff
        admin_obj = admin.site._registry[CookieConsent]
        self.assertFalse(admin_obj.has_add_permission(request))
        self.assertFalse(admin_obj.has_change_permission(request))
        self.assertFalse(admin_obj.has_delete_permission(request))
        request.user = superuser
        self.assertTrue(admin_obj.has_delete_permission(request))
