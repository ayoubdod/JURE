from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import Contact
from .views import ContactViewSet


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CONTACT_INBOX="contact@jure.ma",
    DEFAULT_FROM_EMAIL="noreply@jure.ma",
)
class ContactViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("contact-list")
        self._throttles = ContactViewSet.throttle_classes
        ContactViewSet.throttle_classes = []
        self.valid_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+8801717171717",
            "message": "This is a test message that is long enough to pass validation.",
        }

    def tearDown(self):
        ContactViewSet.throttle_classes = self._throttles

    def test_create_contact_success(self):
        response = self.client.post(self.url, self.valid_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
        contact = Contact.objects.first()
        self.assertEqual(contact.name, self.valid_data["name"])
        self.assertEqual(contact.email, self.valid_data["email"])
        self.assertEqual(str(contact.phone), self.valid_data["phone"])
        self.assertEqual(contact.message, self.valid_data["message"])

    def test_create_contact_without_phone(self):
        data = {k: v for k, v in self.valid_data.items() if k != "phone"}
        data["company"] = "Acme Cabinet"
        data["subject"] = "Early access"
        data["source"] = "contact"
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contact = Contact.objects.get()
        self.assertEqual(contact.company, "Acme Cabinet")
        self.assertEqual(contact.subject, "Early access")
        self.assertIsNone(contact.phone)

    def test_emails_inbox(self):
        response = self.client.post(self.url, self.valid_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.to, ["contact@jure.ma"])
        self.assertEqual(sent.reply_to, ["john@example.com"])
        self.assertIn("John Doe", sent.body)
        self.assertIn(self.valid_data["message"], sent.body)

    def test_create_contact_invalid_name(self):
        data = self.valid_data.copy()
        data["name"] = "J"
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_contact_invalid_email(self):
        data = self.valid_data.copy()
        data["email"] = "invalid-email"
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_create_contact_invalid_phone(self):
        data = self.valid_data.copy()
        data["phone"] = "invalid-phone"
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_create_contact_invalid_message(self):
        data = self.valid_data.copy()
        data["message"] = "Too short"
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)

    def test_create_contact_missing_required_fields(self):
        for field in ["name", "email", "message"]:
            data = self.valid_data.copy()
            del data[field]
            response = self.client.post(self.url, data, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(field, response.data)
