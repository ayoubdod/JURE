from allauth.account.models import EmailAddress
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from cabinets.models import Cabinet
from core.testing import api_client_for
from jurisdictions.models import Jurisdiction
from .models import User
from .serializers import CustomRegisterSerializer


def _seed_jurisdiction():
    jur, _ = Jurisdiction.objects.get_or_create(
        code="MA",
        defaults={
            "name": "Morocco",
            "country_code": "MA",
            "legal_system": "civil_law",
            "default_language": "fr",
            "status": Jurisdiction.Status.ACTIVE,
        },
    )
    return jur


def _register_payload(**overrides):
    data = {
        "email": "test@example.com",
        "phone": "+212661000001",
        "first_name": "John",
        "last_name": "Doe",
        "country": "MA",
        "password1": "testpass123",
        "password2": "testpass123",
        "trade_name": "Doe Law",
        "practice_type": Cabinet.PracticeType.LAW_FIRM,
        "jurisdiction": "MA",
        "business_address": "12 Rue Test, Casablanca",
        "team_size": 3,
        "accept_terms": True,
        "accept_data_processing": True,
    }
    data.update(overrides)
    return data


class CustomRegisterSerializerTest(TestCase):
    def setUp(self):
        _seed_jurisdiction()
        self.valid_data = _register_payload()

    def test_serializer_valid_data(self):
        serializer = CustomRegisterSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_missing_required_fields(self):
        data = self.valid_data.copy()
        del data["email"]
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_serializer_invalid_email(self):
        data = self.valid_data.copy()
        data["email"] = "invalid-email"
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_serializer_invalid_phone(self):
        data = self.valid_data.copy()
        data["phone"] = "invalid-phone"
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)

    def test_serializer_password_mismatch(self):
        data = self.valid_data.copy()
        data["password2"] = "differentpass"
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_serializer_requires_jurisdiction(self):
        data = self.valid_data.copy()
        del data["jurisdiction"]
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("jurisdiction", serializer.errors)

    def test_serializer_requires_accept_terms(self):
        data = self.valid_data.copy()
        data["accept_terms"] = False
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("accept_terms", serializer.errors)


class RegistrationAPITest(APITestCase):
    def setUp(self):
        _seed_jurisdiction()
        self.register_url = reverse("rest_register")
        self.valid_data = _register_payload()

    def test_registration_success(self):
        response = self.client.post(self.register_url, self.valid_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(email=self.valid_data["email"]).exists())
        user = User.objects.get(email=self.valid_data["email"])
        self.assertTrue(user.is_cabinet_member)
        self.assertEqual(user.role, User.Role.OWNER)
        self.assertEqual(user.cabinet.trade_name, "Doe Law")

    def test_registration_duplicate_email(self):
        self.client.post(self.register_url, self.valid_data, format="json")
        data = _register_payload(phone="+212661000002")
        response = self.client.post(self.register_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_registration_invalid_data(self):
        data = self.valid_data.copy()
        data["email"] = "invalid-email"
        response = self.client.post(self.register_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_registration_missing_required_fields(self):
        data = self.valid_data.copy()
        del data["email"]
        response = self.client.post(self.register_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)


class MultiFieldsLoginAPITest(APITestCase):
    def setUp(self):
        self.login_url = reverse("rest_login")
        self.user = User.objects.create_user(
            email="test@example.com",
            phone="+212661000001",
            first_name="John",
            last_name="Doe",
            country="MA",
            password="testpass123",
            phone_verified=True,
        )
        EmailAddress.objects.create(
            user=self.user,
            email=self.user.email,
            verified=True,
            primary=True,
        )

    def test_login_with_phone_success(self):
        response = self.client.post(
            self.login_url,
            {"email": str(self.user.phone), "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_login_with_email_success(self):
        response = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)


class SessionVersionJWTTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sv@example.com",
            phone="+212661000099",
            first_name="Sess",
            last_name="Ion",
            country="MA",
            password="testpass123",
        )
        cabinet = Cabinet.objects.create(
            owner=self.user,
            trade_name="SV Cabinet",
            business_address="Casablanca",
        )
        self.user.cabinet = cabinet
        self.user.is_cabinet_member = True
        self.user.role = User.Role.OWNER
        self.user.phone_verified = True
        self.user.save(
            update_fields=["cabinet", "is_cabinet_member", "role", "phone_verified"]
        )
        EmailAddress.objects.create(
            user=self.user,
            email=self.user.email,
            verified=True,
            primary=True,
        )

    def test_token_without_sv_is_rejected(self):
        client = APIClient()
        token = RefreshToken.for_user(self.user).access_token
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = client.get(reverse("my-cabinet"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(str(response.data.get("detail")), "session_replaced")

    def test_session_token_is_accepted(self):
        client = api_client_for(self.user)
        response = client.get(reverse("my-cabinet"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_login_invalidates_previous_access_token(self):
        old_client = api_client_for(self.user)
        probe = reverse("my-cabinet")
        self.assertEqual(old_client.get(probe).status_code, status.HTTP_200_OK)
        sv_before = User.objects.get(pk=self.user.pk).session_version

        login = self.client.post(
            reverse("rest_login"),
            {"email": self.user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)
        self.assertEqual(
            login.wsgi_request.resolver_match.func.view_class.__name__,
            "SingleSessionLoginView",
        )
        self.user.refresh_from_db(fields=["session_version"])
        self.assertGreater(self.user.session_version, sv_before)
        access = login.data.get("access") or login.data.get("access_token")
        self.assertTrue(access)

        previous = old_client.get(probe)
        self.assertEqual(previous.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(str(previous.data.get("detail")), "session_replaced")

        fresh = APIClient()
        fresh.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(fresh.get(probe).status_code, status.HTTP_200_OK)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("rest_password_reset")
        self.user = User.objects.create_user(
            email="reset@example.com",
            phone="+212661000088",
            first_name="Re",
            last_name="Set",
            country="MA",
            password="testpass123",
        )

    def test_unknown_email_does_not_leak_or_send(self):
        response = self.client.post(
            self.url, {"email": "nobody@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_known_email_sends_frontend_reset_link(self):
        response = self.client.post(
            self.url, {"email": self.user.email}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn("/password-reset-confirm/?uuid=", body)
        self.assertIn("&token=", body)
