from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User
from .serializers import CustomRegisterSerializer
from phonenumber_field.phonenumber import PhoneNumber
from datetime import date
from django_countries.fields import Country
import tempfile
import os
from PIL import Image, ImageDraw
import io

# Create your tests here.

def create_colorful_image(filename, width=300, height=200):
    """Create a colorful test image and return a file object with proper name."""
    # Create a colorful image with gradients
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw colorful rectangles
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
    for i, color in enumerate(colors):
        x1 = i * (width // len(colors))
        x2 = (i + 1) * (width // len(colors))
        draw.rectangle([x1, 0, x2, height], fill=color)
    
    # Add some text
    draw.text((10, 10), "Test ID Card", fill='black')
    draw.text((10, height - 30), filename, fill='black')
    
    # Convert to binary data
    img_io = io.BytesIO()
    img.save(img_io, format='JPEG')
    img_io.seek(0)
    
    # Create a file object with proper name and extension
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile(f"{filename}.jpg", img_io.getvalue(), content_type="image/jpeg")

class CustomRegisterSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'email': 'test@example.com',
            'phone': '+8801712345678',
            # 'nid': '1234567890',
            # 'country': Country('BD'),
            # 'country': 'Bangladesh',
            'first_name': 'John',
            'last_name': 'Doe',
            'birthday': date(1990, 1, 1),
            'password1': 'testpass123',
            'password2': 'testpass123',
            'addresses': [
                {
                    'address': '123 Test Street',
                    'osm_id': '123456789',
                    'type': 'home',
                    'is_default': True
                }
            ]
        }

    def test_serializer_valid_data(self):
        serializer = CustomRegisterSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_missing_required_fields(self):
        # Test with missing email
        data = self.valid_data.copy()
        del data['email']
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_serializer_invalid_email(self):
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_serializer_invalid_phone(self):
        data = self.valid_data.copy()
        data['phone'] = 'invalid-phone'
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('phone', serializer.errors)

    def test_serializer_password_mismatch(self):
        data = self.valid_data.copy()
        data['password2'] = 'differentpass'
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


    def test_serializer_invalid_birthday(self):
        data = self.valid_data.copy()
        data['birthday'] = 'invalid-date'
        serializer = CustomRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('birthday', serializer.errors)

class RegistrationAPITest(APITestCase):
    def setUp(self):
        self.register_url = reverse('rest_register')
        self.valid_data = {
            'email': 'test@example.com',
            'phone': '+8801712345678',
            # 'nid': '1234567890',
            # 'country': 'BD',
            'first_name': 'John',
            'last_name': 'Doe',
            'birthday': date(1990, 1, 1),
            'password1': 'testpass123',
            'password2': 'testpass123',
            'addresses': [
                {
                    'address': '123 Test Street',
                    'osm_id': '123456789',
                    'type': 'home',
                    'is_default': True
                }
            ]
        }

    def test_registration_invalid_birthday(self):
        self.valid_data['birthday'] = date(2025, 1, 1)
        response = self.client.post(self.register_url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('birthday', response.data)
        
    def test_registration_success(self):
        response = self.client.post(self.register_url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=self.valid_data['email']).exists())
    
    # def test_registration_duplicate_country_and_nid(self):
    #     # self.valid_data['country'] = 'Bangladesh'
    #     self.client.post(self.register_url, self.valid_data, format='json')

    #     # try with the same country + nid
    #     self.valid_data['phone'] = '+8801712345679'
    #     self.valid_data['email'] = 'othertest@example.com'
    #     response = self.client.post(self.register_url, self.valid_data, format='json')
    #     self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    #     self.assertIn('nid', response.data)

    def test_registration_duplicate_email(self):
        # First registration
        self.client.post(self.register_url, self.valid_data, format='json')
        
        # Try to register with same email
        # self.valid_data['nid'] = 'othernid1234567890' # other nid
        self.valid_data['phone'] = '+8801712345679' # other phone
        response = self.client.post(self.register_url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_registration_invalid_data(self):
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_registration_empty_addresses_fail(self):
        data = self.valid_data.copy()
        data['addresses'] = []
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('addresses', response.data)

    def test_registration_missing_required_fields(self):
        data = self.valid_data.copy()
        del data['email']
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_registration_is_company_without_company_fields(self):
        data = self.valid_data.copy()
        data['is_company'] = True
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('company_name', response.data)
        self.assertIn('trade_register', response.data)
        self.assertIn('tax_id', response.data)
    

    def test_registration_is_company_with_company_fields(self):
        data = self.valid_data.copy()
        data['is_company'] = True
        data['company_name'] = 'Test Company'
        data['trade_register'] = '1234567890'
        data['tax_id'] = '1234567890'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=data['email']).exists())
        user = User.objects.get(email=data['email'])
        self.assertTrue(user.is_company)
        self.assertEqual(user.company_name, data['company_name'])
        self.assertEqual(user.trade_register, data['trade_register'])
        self.assertEqual(user.tax_id, data['tax_id'])
    

    def test_registration_type_is_provider_without_company_fields(self):
        data = self.valid_data.copy()
        data['is_provider'] = True
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('company_name', response.data)
        self.assertIn('trade_register', response.data)
        self.assertIn('tax_id', response.data)
    
    def test_registration_type_is_provider_with_company_fields(self):
        
        data = self.valid_data.copy()
        data['is_provider'] = True
        data['company_name'] = 'Test Company'
        data['trade_register'] = '1234567890'
        data['tax_id'] = '1234567890'

        response = self.client.post(self.register_url, data , format= 'json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email=data['email'])
        self.assertEqual(user.is_provider, True)
        self.assertEqual(user.company_name, data['company_name'])
        self.assertEqual(user.trade_register, data['trade_register'])
        self.assertEqual(user.tax_id, data['tax_id'])


    def test_registration_type_is_artisan_success(self):
        data = self.valid_data.copy()
        data['is_artisan'] = True
        data['national_identity_card_front'] = create_colorful_image('f1',300,400)
        data['national_identity_card_back'] = create_colorful_image('f2',300,400)

        addresses_data = data.pop('addresses')
        
        # For multipart form data with nested serializers, use bracket notation
        data['addresses[0]address'] = addresses_data[0]['address']
        data['addresses[0]osm_id'] = addresses_data[0]['osm_id']
        data['addresses[0]type'] = addresses_data[0]['type']
        data['addresses[0]is_default'] = addresses_data[0]['is_default']

        response = self.client.post(self.register_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_registration_type_is_artisan_with_company_fields(self):
        
        data = self.valid_data.copy()
        data['is_artisan'] = True
        data['national_identity_card_front'] = create_colorful_image('f1',300,400)
        data['national_identity_card_back'] = create_colorful_image('f2',300,400)

        data['is_campany'] = True
        data['company_name'] = 'Test Company'
        data['trade_register'] = '1234567890'
        data['tax_id'] = '1234567890'

        addresses_data = data.pop('addresses')
        
        # For multipart form data with nested serializers, use bracket notation
        data['addresses[0]address'] = addresses_data[0]['address']
        data['addresses[0]osm_id'] = addresses_data[0]['osm_id']
        data['addresses[0]type'] = addresses_data[0]['type']
        data['addresses[0]is_default'] = addresses_data[0]['is_default']

        response = self.client.post(self.register_url, data , format= 'multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email=data['email'])
        self.assertEqual(user.is_artisan, True)
        self.assertIsNotNone(user.national_identity_card_front)
        self.assertIsNotNone(user.national_identity_card_back)
        self.assertEqual(user.company_name, data['company_name'])
        self.assertEqual(user.trade_register, data['trade_register'])
        self.assertEqual(user.tax_id, data['tax_id'])


class MultiFieldsLoginAPITest(APITestCase):
    def setUp(self):
        self.login_url = reverse('rest_login')

        self.valid_data = {
            'email': 'test@example.com',
            'phone': '+8801712345678',
            # 'nid': '1234567890',
            # 'country': 'BD',
            'first_name': 'John',
            'last_name': 'Doe',
            'birthday': date(1990, 1, 1),
            'password': 'testpass123',
            # 'addresses': [
            #     {
            #         'address': '123 Test Street',
            #         'osm_id': '123456789',
            #     }
            # ]
        }

        User.objects.create_user(**self.valid_data)

        

    def test_login_with_phone_success(self):
        form_data = {
            'email': self.valid_data['phone'],
            'password': self.valid_data['password']
        }   
        response = self.client.post(self.login_url, form_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_login_with_email_success(self):
        form_data = {
            'email': self.valid_data['email'],
            'password': self.valid_data['password']
        }
        response = self.client.post(self.login_url, form_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    # def test_login_with_nid_success(self):
    #     form_data = {
    #         'email': f"{self.valid_data['country']}:{self.valid_data['nid']}",
    #         'password': self.valid_data['password']
    #     }
    #     response = self.client.post(self.login_url, form_data, format='json')
    #     self.assertEqual(response.status_code, status.HTTP_200_OK)

