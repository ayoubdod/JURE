from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from cabinets.models import Cabinet
from core.testing import api_client_for, unique_test_phone

from .models import Conversation, ConversationMembership, Message, ReadReceipt
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


def _direct_conversation(creator, other):
    conv = Conversation.objects.create(
        type=Conversation.Type.DIRECT,
        created_by=creator,
    )
    ConversationMembership.objects.get_or_create(conversation=conv, user=creator)
    ConversationMembership.objects.get_or_create(conversation=conv, user=other)
    return conv


def _make_user(email, first_name="User", last_name="One", *, with_cabinet=False):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name=first_name,
        last_name=last_name,
        phone=unique_test_phone(),
        country="MA",
    )
    if with_cabinet:
        cabinet = Cabinet.objects.create(
            owner=user,
            trade_name=f"{email} cabinet",
            business_address="Casablanca",
        )
        user.cabinet = cabinet
        user.is_cabinet_member = True
        user.role = User.Role.OWNER
        user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user


class ChatModelsTest(TestCase):
    def setUp(self):
        self.user1 = _make_user("user1@test.com", "User", "One")
        self.user2 = _make_user("user2@test.com", "User", "Two")

    def test_create_direct_conversation(self):
        conv = _direct_conversation(self.user1, self.user2)
        self.assertEqual(conv.type, Conversation.Type.DIRECT)
        self.assertEqual(conv.memberships.count(), 2)

    def test_create_group_conversation(self):
        conv = Conversation.objects.create(
            type=Conversation.Type.GROUP,
            title="Test Group",
            created_by=self.user1,
        )
        ConversationMembership.objects.create(
            conversation=conv, user=self.user1, is_admin=True
        )
        ConversationMembership.objects.create(
            conversation=conv, user=self.user2, is_admin=False
        )
        self.assertEqual(conv.memberships.count(), 2)
        self.assertEqual(conv.type, Conversation.Type.GROUP)

    def test_message_creation(self):
        conv = _direct_conversation(self.user1, self.user2)
        message = Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body="Test message",
        )
        receipt = ReadReceipt.objects.create(message=message, user=self.user2)
        self.assertEqual(receipt.message, message)
        self.assertEqual(receipt.user, self.user2)


class ChatAPITest(APITestCase):
    def setUp(self):
        self.user1 = _make_user("user1@test.com", "User", "One", with_cabinet=True)
        self.user2 = _make_user("user2@test.com", "User", "Two", with_cabinet=True)
        self.client = api_client_for(self.user1)

    def test_list_conversations(self):
        conv = _direct_conversation(self.user1, self.user2)
        url = reverse("chat-conversations-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], conv.id)

    def test_create_direct_conversation(self):
        url = reverse("chat-conversations-list")
        response = self.client.post(
            url,
            {"type": "direct", "participants": [self.user2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["type"], "direct")
        self.assertEqual(response.data["other_participant"]["id"], self.user2.id)

    def test_create_group_conversation(self):
        url = reverse("chat-conversations-list")
        response = self.client.post(
            url,
            {
                "type": "group",
                "title": "Test Group",
                "participants": [self.user2.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["type"], "group")
        self.assertEqual(response.data["title"], "Test Group")

    def test_send_message(self):
        conv = _direct_conversation(self.user1, self.user2)
        url = reverse("chat-messages-list")
        response = self.client.post(
            url,
            {"conversation": conv.id, "body": "Hello from API!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["body"], "Hello from API!")
        self.assertEqual(response.data["conversation"], conv.id)

    def test_get_messages(self):
        conv = _direct_conversation(self.user1, self.user2)
        Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body="Test message",
        )
        url = reverse("chat-conversations-messages", kwargs={"pk": conv.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = response.data if isinstance(response.data, list) else response.data.get("results", response.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["body"], "Test message")

    def test_mark_conversation_read(self):
        conv = _direct_conversation(self.user1, self.user2)
        message = Message.objects.create(
            conversation=conv,
            sender=self.user2,
            body="Unread message",
        )
        url = reverse("chat-conversations-mark-read", kwargs={"pk": conv.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(message.read_by.filter(pk=self.user1.pk).exists())

    def test_unauthorized_access(self):
        user3 = _make_user("user3@test.com", "User", "Three", with_cabinet=True)
        conv = _direct_conversation(self.user2, user3)
        url = reverse("chat-conversations-detail", kwargs={"pk": conv.id})
        response = self.client.get(url)
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))


class ChatSerializersTest(TestCase):
    def setUp(self):
        self.user1 = _make_user("user1@test.com", "User", "One")
        self.user2 = _make_user("user2@test.com", "User", "Two")

    def test_conversation_serializer(self):
        conv = _direct_conversation(self.user1, self.user2)
        request = APIRequestFactory().get("/")
        request.user = self.user1
        serializer = ConversationSerializer(conv, context={"request": request})
        data = serializer.data
        self.assertEqual(data["id"], conv.id)
        self.assertEqual(data["type"], "direct")
        self.assertEqual(data["other_participant"]["id"], self.user2.id)
        self.assertIn("latest_message", data)
        self.assertIn("unread_count", data)

    def test_message_serializer(self):
        conv = _direct_conversation(self.user1, self.user2)
        message = Message.objects.create(
            conversation=conv,
            sender=self.user1,
            body="Test message",
        )
        request = APIRequestFactory().get("/")
        request.user = self.user1
        serializer = MessageSerializer(message, context={"request": request})
        data = serializer.data
        self.assertEqual(data["id"], message.id)
        self.assertEqual(data["body"], "Test message")
        self.assertEqual(data["conversation"], conv.id)


class DirectConversationReuseTests(TestCase):
    def setUp(self):
        self.user1 = _make_user("reuse1@test.com", "User", "One")
        self.user2 = _make_user("reuse2@test.com", "User", "Two")

    def _save_direct(self, creator, other):
        request = APIRequestFactory().post("/")
        request.user = creator
        serializer = ConversationSerializer(
            data={
                "type": Conversation.Type.DIRECT,
                "participants": [other.id],
                "title": f"{other.first_name} {other.last_name}",
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save()

    def test_second_direct_create_reuses_existing(self):
        first = self._save_direct(self.user1, self.user2)
        second = self._save_direct(self.user1, self.user2)
        self.assertEqual(first.id, second.id)
        self.assertEqual(Conversation.objects.filter(type=Conversation.Type.DIRECT).count(), 1)
