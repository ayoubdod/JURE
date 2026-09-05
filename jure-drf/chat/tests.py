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

    def test_list_excludes_conversations_without_membership(self):
        mine = _direct_conversation(self.user1, self.user2)
        outsider = _make_user("outsider@test.com", "Out", "Sider", with_cabinet=True)
        foreign = _direct_conversation(self.user2, outsider)
        response = self.client.get(reverse("chat-conversations-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        ids = {row["id"] for row in rows}
        self.assertIn(mine.id, ids)
        self.assertNotIn(foreign.id, ids)

    def test_cannot_send_message_to_foreign_conversation(self):
        outsider = _make_user("msg-out@test.com", "Out", "Sider", with_cabinet=True)
        conv = _direct_conversation(self.user2, outsider)
        response = self.client.post(
            reverse("chat-messages-list"),
            {"conversation": conv.id, "body": "Should not land"},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.assertFalse(
            Message.objects.filter(conversation=conv, body="Should not land").exists()
        )

    def test_cannot_read_or_archive_foreign_conversation(self):
        outsider = _make_user("archive-out@test.com", "Out", "Sider", with_cabinet=True)
        conv = _direct_conversation(self.user2, outsider)
        Message.objects.create(conversation=conv, sender=self.user2, body="Secret")
        messages = self.client.get(
            reverse("chat-conversations-messages", kwargs={"pk": conv.id})
        )
        self.assertIn(
            messages.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        listed = self.client.get(
            reverse("chat-messages-list"),
            {"conversation_id": conv.id},
        )
        self.assertIn(
            listed.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        archived = self.client.post(
            reverse("conversations-archive-bulk"),
            {"conversation_id": conv.id, "archived": True},
            format="json",
        )
        self.assertIn(
            archived.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        membership = ConversationMembership.objects.get(conversation=conv, user=self.user2)
        self.assertFalse(membership.archived)

    def test_cannot_link_foreign_case_to_group(self):
        from cases.tests import _create_consultation

        group = Conversation.objects.create(
            type=Conversation.Type.GROUP,
            title="Team",
            created_by=self.user1,
        )
        ConversationMembership.objects.create(
            conversation=group, user=self.user1, is_admin=True
        )
        foreign_case = _create_consultation(
            self.user2.cabinet, self.user2, title="Theirs matter"
        )
        response = self.client.post(
            reverse("chat-conversations-link-case", kwargs={"pk": group.id}),
            {"caseId": foreign_case.pk},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        group.refresh_from_db()
        self.assertIsNone(group.linked_case_id)

    def test_cannot_forward_foreign_message(self):
        outsider = _make_user("fwd-out@test.com", "Out", "Sider", with_cabinet=True)
        foreign = _direct_conversation(self.user2, outsider)
        secret = Message.objects.create(
            conversation=foreign, sender=self.user2, body="Secret"
        )
        mine = _direct_conversation(self.user1, self.user2)
        response = self.client.post(
            reverse("chat-messages-forward", kwargs={"pk": secret.id}),
            {"target_conversation_id": mine.id},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.assertFalse(
            Message.objects.filter(conversation=mine, forwarded_from=secret).exists()
        )

    def test_cannot_list_pinned_messages_of_foreign_conversation(self):
        outsider = _make_user("pin-out@test.com", "Out", "Sider", with_cabinet=True)
        conv = _direct_conversation(self.user2, outsider)
        response = self.client.get(
            reverse("chat-conversations-pinned-messages", kwargs={"pk": conv.id})
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )

    def test_cannot_edit_delete_or_mark_read_foreign_message(self):
        outsider = _make_user("msg-mut@test.com", "Out", "Sider", with_cabinet=True)
        conv = _direct_conversation(self.user2, outsider)
        secret = Message.objects.create(
            conversation=conv, sender=self.user2, body="Secret"
        )
        patched = self.client.patch(
            reverse("chat-messages-detail", kwargs={"pk": secret.id}),
            {"body": "Hacked"},
            format="json",
        )
        self.assertIn(
            patched.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        deleted = self.client.delete(
            reverse("chat-messages-detail", kwargs={"pk": secret.id})
        )
        self.assertIn(
            deleted.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        marked = self.client.post(
            reverse("chat-messages-mark-read", kwargs={"pk": secret.id})
        )
        self.assertIn(
            marked.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        secret.refresh_from_db()
        self.assertEqual(secret.body, "Secret")
        self.assertFalse(secret.is_deleted)
        self.assertFalse(secret.read_by.filter(pk=self.user1.pk).exists())

    def test_cannot_rename_pin_or_delete_foreign_conversation(self):
        outsider = _make_user("conv-mut@test.com", "Out", "Sider", with_cabinet=True)
        conv = _direct_conversation(self.user2, outsider)
        renamed = self.client.post(
            reverse("chat-conversations-rename", kwargs={"pk": conv.id}),
            {"title": "Hacked"},
            format="json",
        )
        self.assertIn(
            renamed.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        pinned = self.client.post(
            reverse("conversations-pin-bulk"),
            {"conversation_id": conv.id, "pinned": True},
            format="json",
        )
        self.assertIn(
            pinned.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        detail_pin = self.client.post(
            reverse("chat-conversations-pin", kwargs={"pk": conv.id}),
            {"pinned": True},
            format="json",
        )
        self.assertIn(
            detail_pin.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        detail_archive = self.client.post(
            reverse("chat-conversations-archive", kwargs={"pk": conv.id}),
            {"archived": True},
            format="json",
        )
        self.assertIn(
            detail_archive.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        deleted = self.client.delete(
            reverse("chat-conversations-detail", kwargs={"pk": conv.id})
        )
        self.assertIn(
            deleted.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )
        self.assertTrue(Conversation.objects.filter(pk=conv.id).exists())
        membership = ConversationMembership.objects.get(conversation=conv, user=self.user2)
        self.assertFalse(membership.is_deleted)
        self.assertFalse(membership.is_pinned)


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
