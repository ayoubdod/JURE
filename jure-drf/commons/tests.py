from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Contact
from phonenumber_field.phonenumber import PhoneNumber

class ContactViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('contact-list')
        self.valid_data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'phone': '+8801717171717',
            'message': 'This is a test message that is long enough to pass validation.'
        }

    def test_create_contact_success(self):
        """Test successful contact creation with valid data"""
        response = self.client.post(self.url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
        contact = Contact.objects.first()
        self.assertEqual(contact.name, self.valid_data['name'])
        self.assertEqual(contact.email, self.valid_data['email'])
        self.assertEqual(str(contact.phone), self.valid_data['phone'])
        self.assertEqual(contact.message, self.valid_data['message'])

    def test_create_contact_invalid_name(self):
        """Test contact creation with invalid name (too short)"""
        data = self.valid_data.copy()
        data['name'] = 'J'  # Too short
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_create_contact_invalid_email(self):
        """Test contact creation with invalid email format"""
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_create_contact_invalid_phone(self):
        """Test contact creation with invalid phone number"""
        data = self.valid_data.copy()
        data['phone'] = 'invalid-phone'
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', response.data)

    def test_create_contact_invalid_message(self):
        """Test contact creation with invalid message (too short)"""
        data = self.valid_data.copy()
        data['message'] = 'Too short'  # Less than 10 characters
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('message', response.data)

    def test_create_contact_missing_required_fields(self):
        """Test contact creation with missing required fields"""
        for field in ['name', 'email', 'phone', 'message']:
            data = self.valid_data.copy()
            del data[field]
            response = self.client.post(self.url, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(field, response.data)
