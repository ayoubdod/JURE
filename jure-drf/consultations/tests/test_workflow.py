from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from chat.models import ConversationMembership
from consultations.models import ConsultationComment, ConsultationRequest
from core.testing import api_client_for, create_cabinet_member, create_cabinet_owner, unique_test_phone
from notifications.models import Notification

User = get_user_model()


class ConsultationRequestWorkflowTests(APITestCase):
    def setUp(self):
        self.owner, self.cabinet = create_cabinet_owner(
            email="owner-portal@example.com", trade_name="Portal Firm"
        )
        self.lawyer = create_cabinet_member(
            self.cabinet, email="lawyer-portal@example.com", role="LAWYER"
        )
        self.client_user = User.objects.create_user(
            email="client-portal@example.com",
            password="testpass123",
            first_name="Client",
            last_name="One",
            phone=unique_test_phone(),
            country="FR",
        )
        self.client_user.cabinet = self.cabinet
        self.client_user.is_cabinet_member = False
        self.client_user.save(update_fields=["cabinet", "is_cabinet_member"])

        self.other_owner, self.other_cabinet = create_cabinet_owner(
            email="other-owner@example.com", trade_name="Other Firm"
        )
        self.other_client = User.objects.create_user(
            email="other-client@example.com",
            password="testpass123",
            first_name="Other",
            last_name="Client",
            phone=unique_test_phone(),
            country="FR",
        )
        self.other_client.cabinet = self.other_cabinet
        self.other_client.is_cabinet_member = False
        self.other_client.save(update_fields=["cabinet", "is_cabinet_member"])

        self.case = Case.objects.create(
            title="Commercial dispute",
            reference="L-2026-0001",
            description="Test case",
            court="Tribunal",
            cabinet=self.cabinet,
            client=self.client_user,
            case_type=Case.CaseType.LITIGATION,
            assigned_to=self.lawyer,
            created_by=self.owner,
        )

    def _create_request(self, api, **overrides):
        payload = {
            "subject": "Litige concernant un contrat commercial",
            "legalArea": "COMMERCIAL",
            "description": "Besoin d'avis sur un contrat fournisseur.",
            "preferredFormat": "CHAT",
            "preferredDatetime": "Semaine prochaine",
        }
        payload.update(overrides)
        return api.post("/api/v1/consultations/", payload, format="json")

    def test_client_creates_consultation_request(self):
        api = api_client_for(self.client_user)
        res = self._create_request(api)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["status"], "SUBMITTED")
        self.assertTrue(res.data["reference"].startswith("CR-"))
        self.assertFalse(res.data["chatAvailable"])

    def test_client_cannot_see_other_client_request(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]

        other_api = api_client_for(self.other_client)
        res = other_api.get(f"/api/v1/consultations/{pk}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_cannot_see_other_cabinet_requests(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]

        other_staff = api_client_for(self.other_owner)
        res = other_staff.get(f"/api/v1/consultations/{pk}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_internal_comments_hidden_from_client(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]

        staff = api_client_for(self.owner)
        staff.post(
            f"/api/v1/consultations/{pk}/comments/",
            {"content": "Internal note about supplier", "visibility": "INTERNAL"},
            format="json",
        )
        staff.post(
            f"/api/v1/consultations/{pk}/comments/",
            {"content": "We received your request.", "visibility": "CLIENT"},
            format="json",
        )

        res = api.get(f"/api/v1/consultations/{pk}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        contents = [c["content"] for c in res.data["comments"]]
        self.assertIn("We received your request.", contents)
        self.assertNotIn("Internal note about supplier", contents)

        staff_res = staff.get(f"/api/v1/consultations/{pk}/")
        staff_contents = [c["content"] for c in staff_res.data["comments"]]
        self.assertIn("Internal note about supplier", staff_contents)

    def test_assign_and_confirm_creates_chat(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]

        staff = api_client_for(self.owner)
        assign = staff.post(
            f"/api/v1/consultations/{pk}/assign/",
            {"lawyerId": self.lawyer.id},
            format="json",
        )
        self.assertEqual(assign.status_code, status.HTTP_200_OK, assign.data)
        self.assertEqual(assign.data["status"], "ASSIGNED")

        # Client must not have chat yet
        detail = api.get(f"/api/v1/consultations/{pk}/")
        self.assertFalse(detail.data["chatAvailable"])
        self.assertIsNone(detail.data["conversationId"])

        confirm = staff.post(f"/api/v1/consultations/{pk}/confirm/", {}, format="json")
        self.assertEqual(confirm.status_code, status.HTTP_200_OK, confirm.data)
        self.assertEqual(confirm.data["status"], "CONFIRMED")
        self.assertTrue(confirm.data["chatAvailable"])
        conv_id = confirm.data["conversationId"]
        self.assertIsNotNone(conv_id)

        self.assertTrue(
            ConversationMembership.objects.filter(
                conversation_id=conv_id, user=self.client_user, is_deleted=False
            ).exists()
        )
        self.assertTrue(
            ConversationMembership.objects.filter(
                conversation_id=conv_id, user=self.lawyer, is_deleted=False
            ).exists()
        )

        # Client can list the conversation
        chats = api.get("/api/v1/chat/conversations/")
        self.assertEqual(chats.status_code, status.HTTP_200_OK)
        raw = chats.data
        if isinstance(raw, dict) and "results" in raw:
            ids = [c["id"] for c in raw["results"]]
        else:
            ids = [c["id"] for c in raw]
        self.assertIn(conv_id, ids)

        # Notifications fired
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.client_user,
                notification_type="CONSULTATION_CONFIRMED",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.lawyer,
                notification_type="CONSULTATION_ASSIGNED",
            ).exists()
        )

    def test_client_cannot_create_conversation_directly(self):
        api = api_client_for(self.client_user)
        res = api.post(
            "/api/v1/chat/conversations/",
            {"type": "direct", "participants": [self.lawyer.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_status_transition(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]
        staff = api_client_for(self.owner)
        res = staff.post(
            f"/api/v1/consultations/{pk}/set-status/",
            {"status": "COMPLETED"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_portal_cases_scoped_to_client(self):
        api = api_client_for(self.client_user)
        res = api.get("/api/v1/portal/cases/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in res.data]
        self.assertIn(self.case.id, ids)

        other = api_client_for(self.other_client)
        res2 = other.get(f"/api/v1/portal/cases/{self.case.id}/")
        self.assertEqual(res2.status_code, status.HTTP_404_NOT_FOUND)

    def test_portal_dashboard(self):
        api = api_client_for(self.client_user)
        self._create_request(api)
        res = api.get("/api/v1/portal/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["activeCasesCount"], 1)
        self.assertGreaterEqual(res.data["pendingConsultationsCount"], 1)

    def test_attachment_upload(self):
        api = api_client_for(self.client_user)
        created = self._create_request(api)
        pk = created.data["id"]
        upload = SimpleUploadedFile("contrat.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        res = api.post(
            f"/api/v1/consultations/{pk}/attachments/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(ConsultationRequest.objects.get(pk=pk).attachments.count(), 1)
