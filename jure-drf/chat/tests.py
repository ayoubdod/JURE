# chat/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Conversation, ConversationMembership, Message, ReadReceipt
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


class ChatModelsTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            password='testpass123',
            first_name='User',
            last_name='One'
        )
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )

    def test_create_direct_conversation(self):
        """Test creating a direct conversation between two users"""
        conv, created = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        self.assertTrue(created)
        self.assertEqual(conv.type, Conversation.Type.DIRECT)
        self.assertEqual(conv.memberships.count(), 2)
        
        # Test that the same conversation is returned for the same users
        conv2, created2 = Conversation.get_or_create_direct(
            created_by=self.user2,
            other_user=self.user1
        )
        
        self.assertFalse(created2)
        self.assertEqual(conv.id, conv2.id)

    def test_create_group_conversation(self):
        """Test creating a group conversation"""
        conv = Conversation.objects.create(
            type=Conversation.Type.GROUP,
            title='Test Group',
            created_by=self.user1
        )
        
        # Add members
        ConversationMembership.objects.create(
            conversation=conv,
            user=self.user1,
            is_admin=True
        )
        ConversationMembership.objects.create(
            conversation=conv,
            user=self.user2,
            is_admin=False
        )
        
        self.assertEqual(conv.memberships.count(), 2)
        self.assertEqual(conv.type, Conversation.Type.GROUP)

    def test_message_creation(self):
        """Test creating messages in a conversation"""
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        message = Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body='Hello, world!'
        )
        
        self.assertEqual(message.conversation, conv)
        self.assertEqual(message.sender, self.user1)
        self.assertEqual(message.body, 'Hello, world!')

    def test_read_receipt(self):
        """Test read receipts"""
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        message = Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body='Test message'
        )
        
        receipt = ReadReceipt.objects.create(
            message=message,
            user=self.user2
        )
        
        self.assertEqual(receipt.message, message)
        self.assertEqual(receipt.user, self.user2)


class ChatAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            password='testpass123',
            first_name='User',
            last_name='One'
        )
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )
        
        # Get JWT token for authentication
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_list_conversations(self):
        """Test listing user conversations"""
        # Create a conversation
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        url = reverse('chat-conversations-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], conv.id)

    def test_create_direct_conversation(self):
        """Test creating a direct conversation via API"""
        url = reverse('chat-conversations-list')
        data = {
            'type': 'direct',
            'peerId': self.user2.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['type'], 'direct')
        self.assertEqual(len(response.data['participants']), 2)

    def test_create_group_conversation(self):
        """Test creating a group conversation via API"""
        url = reverse('chat-conversations-list')
        data = {
            'type': 'group',
            'title': 'Test Group',
            'memberIds': [self.user2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['type'], 'group')
        self.assertEqual(response.data['title'], 'Test Group')

    def test_send_message(self):
        """Test sending a message via API"""
        # Create conversation first
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        url = reverse('chat-messages-list')
        data = {
            'conversationId': conv.id,
            'content': 'Hello from API!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], 'Hello from API!')
        self.assertEqual(response.data['senderId'], self.user1.id)

    def test_get_messages(self):
        """Test getting messages from a conversation"""
        # Create conversation and message
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body='Test message'
        )
        
        url = reverse('chat-conversations-messages', kwargs={'pk': conv.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['content'], 'Test message')

    def test_mark_conversation_read(self):
        """Test marking a conversation as read"""
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        # Create a message from user2
        message = Message.objects.create(
            conversation=conv,
            sender=self.user2,
            body='Unread message'
        )
        
        url = reverse('chat-conversations-mark-read', kwargs={'pk': conv.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that read receipt was created
        receipt = ReadReceipt.objects.filter(
            message=message,
            user=self.user1
        ).first()
        self.assertIsNotNone(receipt)

    def test_unauthorized_access(self):
        """Test that users can't access conversations they're not part of"""
        # Create conversation between user2 and another user
        user3 = User.objects.create_user(
            email='user3@test.com',
            password='testpass123'
        )
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user2,
            other_user=user3
        )
        
        # Try to access with user1 (should fail)
        url = reverse('chat-conversations-detail', kwargs={'pk': conv.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ChatSerializersTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            password='testpass123',
            first_name='User',
            last_name='One'
        )
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )

    def test_conversation_serializer(self):
        """Test conversation serializer"""
        from .serializers import ConversationSerializer
        
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        serializer = ConversationSerializer(conv)
        data = serializer.data
        
        self.assertEqual(data['id'], conv.id)
        self.assertEqual(data['type'], 'direct')
        self.assertEqual(len(data['participants']), 2)
        self.assertTrue('latest_message' in data)
        self.assertTrue('unread_count' in data)

    def test_message_serializer(self):
        """Test message serializer"""
        from .serializers import MessageSerializer
        
        conv, _ = Conversation.get_or_create_direct(
            created_by=self.user1,
            other_user=self.user2
        )
        
        message = Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body='Test message'
        )
        
        serializer = MessageSerializer(message)
        data = serializer.data
        
        self.assertEqual(data['id'], message.id)
        self.assertEqual(data['content'], 'Test message')
        self.assertEqual(data['senderId'], self.user1.id)
        self.assertEqual(data['conversationId'], conv.id)


class DirectConversationReuseTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='reuse1@test.com',
            password='testpass123',
            first_name='User',
            last_name='One',
            phone='+212600000011',
            country='MA',
        )
        self.user2 = User.objects.create_user(
            email='reuse2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two',
            phone='+212600000012',
            country='MA',
        )

    def _save_direct(self, creator, other):
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().post('/')
        request.user = creator
        serializer = ConversationSerializer(
            data={
                'type': Conversation.Type.DIRECT,
                'participants': [other.id],
                'title': f'{other.first_name} {other.last_name}',
            },
            context={'request': request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save()

    def test_second_direct_create_reuses_existing(self):
        first = self._save_direct(self.user1, self.user2)
        second = self._save_direct(self.user1, self.user2)
        self.assertEqual(first.id, second.id)
        self.assertEqual(Conversation.objects.filter(type=Conversation.Type.DIRECT).count(), 1)

