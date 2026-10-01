"""Privacy Gateway automated tests."""

from __future__ import annotations

import base64
import re
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import api_client_for, create_cabinet_owner
from privacy.constants import EntityType, PrivacyMode
from privacy.models import PseudonymMapping, PseudonymMappingSession
from privacy.services.crypto import (
    clear_key_cache,
    decrypt_value,
    encrypt_value,
    value_hmac,
)
from privacy.services.detector import detect
from privacy.services.gateway import PrivacyGatewayError, sanitize_for_ai
from privacy.services.policy import resolve_privacy_mode
from privacy.services.pseudonymizer import pseudonymize_text

_TEST_KEY = base64.b64encode(b"0123456789abcdef0123456789abcdef").decode()


@override_settings(PRIVACY_MAPPING_KEY=_TEST_KEY, PRIVACY_DEFAULT_MODE="PSEUDONYMIZED")
class PrivacyCryptoTests(TestCase):
    def setUp(self):
        clear_key_cache()

    def tearDown(self):
        clear_key_cache()

    def test_encrypt_decrypt_roundtrip(self):
        ct = encrypt_value("Ahmed Benali")
        self.assertNotEqual(ct, "Ahmed Benali")
        self.assertEqual(decrypt_value(ct), "Ahmed Benali")

    def test_hmac_stable(self):
        a = value_hmac("ahmed benali", EntityType.PERSON)
        b = value_hmac("ahmed benali", EntityType.PERSON)
        self.assertEqual(a, b)
        self.assertNotEqual(a, value_hmac("sarah", EntityType.PERSON))


@override_settings(PRIVACY_MAPPING_KEY=_TEST_KEY)
class PrivacyDetectionTests(TestCase):
    def setUp(self):
        clear_key_cache()

    def test_detects_email_phone_cin_iban_person_company(self):
        text = (
            "Ahmed Benali, CIN AB123456, Managing Director of Atlas SARL, "
            "email ahmed.benali@example.ma, phone +212612345678, "
            "IBAN MA6400119000000123456789012, "
            "entered into an agreement with Sarah El Mansouri of Beta Industries SARL."
        )
        result = detect(text, jurisdiction="MA")
        types = {s.entity_type for s in result.spans}
        self.assertIn(EntityType.EMAIL, types)
        self.assertIn(EntityType.PHONE, types)
        self.assertIn(EntityType.IDENTIFIER, types)
        self.assertIn(EntityType.ORGANIZATION, types)
        self.assertTrue(
            any(s.entity_type == EntityType.PERSON for s in result.spans),
            msg=f"Expected PERSON in {[(s.entity_type, s.value) for s in result.spans]}",
        )

    def test_known_entity_boost(self):
        text = "Please contact Fatima Zahra regarding the matter."
        result = detect(
            text,
            jurisdiction="MA",
            known_entities=[(EntityType.PERSON, "Fatima Zahra")],
        )
        self.assertTrue(any(s.value == "Fatima Zahra" for s in result.spans))


@override_settings(PRIVACY_MAPPING_KEY=_TEST_KEY, PRIVACY_DEFAULT_MODE="PSEUDONYMIZED")
class PrivacyPseudonymizeTests(TestCase):
    def setUp(self):
        clear_key_cache()
        self.owner, self.cabinet = create_cabinet_owner(email="privacy-owner@test.jure")

    def test_stable_tokens_and_originals_absent(self):
        session = PseudonymMappingSession.objects.create(
            cabinet=self.cabinet,
            created_by=self.owner,
            jurisdiction_code="MA",
            mode=PrivacyMode.PSEUDONYMIZED,
        )
        original = (
            "Ahmed Benali, CIN AB123456, Managing Director of Atlas SARL, "
            "contact ahmed.benali@example.ma. "
            "Ahmed Benali signed with Sarah El Mansouri."
        )
        r1 = pseudonymize_text(original, session=session, jurisdiction="MA")
        self.assertNotIn("Ahmed Benali", r1.sanitized_text)
        self.assertNotIn("AB123456", r1.sanitized_text)
        self.assertNotIn("ahmed.benali@example.ma", r1.sanitized_text)
        self.assertIn("Managing Director", r1.sanitized_text)
        self.assertRegex(r1.sanitized_text, r"\[PERSON_\d{3}\]")

        r2 = pseudonymize_text("Ahmed Benali confirmed.", session=session, jurisdiction="MA")
        tokens1 = re.findall(r"\[PERSON_\d{3}\]", r1.sanitized_text)
        tokens2 = re.findall(r"\[PERSON_\d{3}\]", r2.sanitized_text)
        self.assertTrue(tokens1)
        self.assertTrue(tokens2)
        self.assertIn(tokens2[0], tokens1)

        mapping = PseudonymMapping.objects.filter(session=session).first()
        self.assertIsNotNone(mapping)
        self.assertNotEqual(mapping.encrypted_value, "Ahmed Benali")


@override_settings(
    PRIVACY_MAPPING_KEY=_TEST_KEY,
    PRIVACY_DEFAULT_MODE="PSEUDONYMIZED",
    PRIVACY_PRIVATE_AI_CONFIGURED=False,
)
class PrivacyGatewayTests(TestCase):
    def setUp(self):
        clear_key_cache()
        self.owner, self.cabinet = create_cabinet_owner(email="gw-owner@test.jure")

    def test_sanitize_removes_pii_from_message(self):
        out = sanitize_for_ai(
            user=self.owner,
            cabinet=self.cabinet,
            message_text="Contact Ahmed Benali at ahmed.benali@example.ma CIN AB123456",
            history=[],
            case_context={"description": "Client Ahmed Benali dispute"},
            has_documents=True,
        )
        self.assertTrue(out.privacy_meta["pseudonymized"])
        self.assertNotIn("Ahmed Benali", out.message_text)
        self.assertNotIn("ahmed.benali@example.ma", out.message_text)
        self.assertNotIn("AB123456", out.message_text)
        if out.case_context:
            self.assertNotIn("Ahmed Benali", str(out.case_context.get("description") or ""))
        self.assertIsNotNone(out.session)
        self.assertNotIn("mapping", out.privacy_meta)
        self.assertNotIn("encrypted_value", str(out.privacy_meta))

    def test_private_mode_blocks_without_config(self):
        from privacy.models import CabinetPrivacyPolicy

        CabinetPrivacyPolicy.objects.create(
            cabinet=self.cabinet,
            default_mode=PrivacyMode.PRIVATE,
        )
        with self.assertRaises(PrivacyGatewayError):
            sanitize_for_ai(
                user=self.owner,
                cabinet=self.cabinet,
                message_text="hello",
                has_documents=False,
            )

    def test_failure_closed_without_key(self):
        clear_key_cache()
        with override_settings(PRIVACY_MAPPING_KEY=""):
            clear_key_cache()
            with self.assertRaises(PrivacyGatewayError):
                sanitize_for_ai(
                    user=self.owner,
                    cabinet=self.cabinet,
                    message_text="Ahmed Benali",
                    has_documents=True,
                )
        clear_key_cache()


@override_settings(PRIVACY_MAPPING_KEY=_TEST_KEY, JURIA_ENABLED=True)
class PrivacyIsolationApiTests(APITestCase):
    def setUp(self):
        clear_key_cache()
        self.owner_a, self.cab_a = create_cabinet_owner(email="iso-a@test.jure", trade_name="Cab A")
        self.owner_b, self.cab_b = create_cabinet_owner(email="iso-b@test.jure", trade_name="Cab B")
        self.client_a = api_client_for(self.owner_a)
        self.client_b = api_client_for(self.owner_b)

        self.session_a = PseudonymMappingSession.objects.create(
            cabinet=self.cab_a,
            created_by=self.owner_a,
            jurisdiction_code="MA",
            mode=PrivacyMode.PSEUDONYMIZED,
        )
        PseudonymMapping.objects.create(
            session=self.session_a,
            cabinet=self.cab_a,
            token="[PERSON_001]",
            entity_type=EntityType.PERSON,
            value_hash=value_hmac("secret name", EntityType.PERSON),
            encrypted_value=encrypt_value("Secret Name"),
        )

    def test_cross_cabinet_reidentify_404(self):
        resp = self.client_b.post(
            "/api/v1/privacy/reidentify/",
            {"session_id": str(self.session_a.id), "text": "[PERSON_001] should review"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_authorized_reidentify(self):
        resp = self.client_a.post(
            "/api/v1/privacy/reidentify/",
            {"session_id": str(self.session_a.id), "text": "[PERSON_001] should review"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("Secret Name", resp.data["text"])
        self.assertNotIn("[PERSON_001]", resp.data["text"])

    def test_portal_client_denied_policy(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        portal = User.objects.create_user(
            email="portal@test.jure",
            password="testpass123",
            first_name="Portal",
            last_name="Client",
            phone="+33611111111",
            country="MA",
        )
        portal.cabinet = self.cab_a
        portal.is_cabinet_member = False
        portal.save(update_fields=["cabinet", "is_cabinet_member"])
        client = api_client_for(portal)
        resp = client.get("/api/v1/privacy/policies/")
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_policy_get_patch(self):
        resp = self.client_a.get("/api/v1/privacy/policies/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["default_mode"], PrivacyMode.PSEUDONYMIZED)
        resp2 = self.client_a.patch(
            "/api/v1/privacy/policies/",
            {"default_mode": PrivacyMode.STANDARD},
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["default_mode"], PrivacyMode.STANDARD)


@override_settings(
    PRIVACY_MAPPING_KEY=_TEST_KEY,
    PRIVACY_DEFAULT_MODE="PSEUDONYMIZED",
    PRIVACY_ENFORCE_EGRESS_TICKET=True,
    JURIA_PROVIDER="deepseek",
    DEEPSEEK_API_KEY="sk-test",
    DEEPSEEK_API_URL="https://api.deepseek.com",
    DEEPSEEK_MODEL="deepseek-chat",
    JURIA_MAX_TOKENS=400,
    JURIA_TIMEOUT_SECONDS=10,
    JURIA_ENABLED=True,
)
class PrivacyJuriaEgressTests(TestCase):
    """Demonstrate originals never reach the external AI provider."""

    def setUp(self):
        clear_key_cache()
        self.owner, self.cabinet = create_cabinet_owner(email="egress@test.jure")
        from juria.services.workspace import create_project

        self.project = create_project(
            cabinet=self.cabinet,
            owner=self.owner,
            name="Privacy test",
            privacy_mode=PrivacyMode.PSEUDONYMIZED,
            is_simple=True,
        )
        self.thread = self.project.threads.first()

    @patch("juria.services.juria_api_service.requests.post")
    def test_send_thread_message_sanitizes_outbound(self, post):
        post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "chatcmpl-priv",
                "choices": [{"message": {"content": "[PERSON_001] should review clause 8."}}],
                "usage": {"total_tokens": 10},
            },
        )
        from juria.services.chat import send_thread_message

        original = "Please advise Ahmed Benali CIN AB123456 email ahmed@example.com"
        _user_msg, assistant_msg, _ = send_thread_message(
            self.owner,
            self.thread,
            self.project,
            message_text=original,
        )
        self.assertIsNotNone(assistant_msg)
        _args, kwargs = post.call_args
        payload = kwargs["json"]
        blob = str(payload)
        self.assertNotIn("Ahmed Benali", blob)
        self.assertNotIn("AB123456", blob)
        self.assertNotIn("ahmed@example.com", blob)
        self.assertNotIn("encrypted_value", blob)
        self.assertNotIn("value_hash", blob)
        privacy = (assistant_msg.analysis or {}).get("privacy") or {}
        self.assertTrue(privacy.get("pseudonymized"))
        self.assertTrue(privacy.get("session_id"))

    @patch("privacy.services.gateway.pseudonymize_text", side_effect=RuntimeError("boom"))
    def test_detector_failure_does_not_call_provider(self, _pseudo):
        with patch("juria.services.juria_api_service.requests.post") as post:
            from juria.services.chat import send_thread_message
            from juria.services.juria_api_service import JuriaAPIError

            with self.assertRaises(JuriaAPIError):
                send_thread_message(
                    self.owner,
                    self.thread,
                    self.project,
                    message_text="Ahmed Benali secret",
                )
            post.assert_not_called()


@override_settings(PRIVACY_MAPPING_KEY=_TEST_KEY)
class PrivacyPolicyResolveTests(TestCase):
    def setUp(self):
        clear_key_cache()
        self.owner, self.cabinet = create_cabinet_owner(email="pol@test.jure")

    def test_document_forces_pseudonymized(self):
        from privacy.models import CabinetPrivacyPolicy

        CabinetPrivacyPolicy.objects.create(
            cabinet=self.cabinet,
            default_mode=PrivacyMode.STANDARD,
            require_pseudonymization_for_documents=True,
        )
        resolved = resolve_privacy_mode(
            cabinet=self.cabinet,
            has_documents=True,
        )
        self.assertEqual(resolved.mode, PrivacyMode.PSEUDONYMIZED)
