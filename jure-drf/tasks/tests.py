"""Tests for multi-assignee tasks, attachments, and appointment meeting types."""
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from core.testing import api_client_for, unique_test_phone

from cabinets.models import Cabinet
from chat.models import Conversation, ConversationMembership
from lawyers.models import LawyerProfile
from tasks.models import Appointment, Task, TaskAssignee, TaskAttachment

User = get_user_model()


def _create_cabinet_user(email: str, phone: str, trade_name: str = "Cabinet"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone,
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name,
        business_address="123 Test St",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    LawyerProfile.objects.create(user=user, name=f"{user.first_name} {user.last_name}")
    return user, cabinet


def _auth_client(user):
    return api_client_for(user)


def _add_member(cabinet, *, email: str, phone: str, first_name: str = "Member"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name=first_name,
        last_name="User",
        phone=phone,
        country="FR",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "LAWYER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user


class TaskAssigneesApiTest(TestCase):
    def setUp(self):
        self.owner, self.cabinet = _create_cabinet_user(
            f"owner-{uuid.uuid4().hex[:8]}@test.com", "+33610000001"
        )
        self.member_a = _add_member(
            self.cabinet, email=f"a-{uuid.uuid4().hex[:8]}@test.com", phone="+33610000011", first_name="Ayoub"
        )
        self.member_b = _add_member(
            self.cabinet, email=f"b-{uuid.uuid4().hex[:8]}@test.com", phone="+33610000012", first_name="Sara"
        )
        self.client = _auth_client(self.owner)

    def test_create_task_with_multiple_assignees(self):
        url = reverse("task-list")
        res = self.client.post(
            url,
            {
                "title": "Review Client Contract",
                "description": "Check NDA clauses",
                "priority": "high",
                "status": "todo",
                "due_date": (timezone.localdate() + timedelta(days=2)).isoformat(),
                "assignee_ids": [self.member_a.id, self.member_b.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        task = Task.objects.get(pk=res.data["id"])
        self.assertEqual(set(task.assignees.values_list("id", flat=True)), {self.member_a.id, self.member_b.id})
        self.assertEqual(task.assigned_to_id, self.member_a.id)
        self.assertEqual(len(res.data["assignees"]), 2)

    def test_task_requires_at_least_one_assignee(self):
        url = reverse("task-list")
        res = self.client.post(
            url,
            {
                "title": "No assignees",
                "description": "Should fail",
                "priority": "low",
                "status": "todo",
                "due_date": timezone.localdate().isoformat(),
                "assignee_ids": [],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_attachment_upload_download_delete(self):
        task = Task.objects.create(
            title="With file",
            description="desc",
            cabinet=self.cabinet,
            assigned_to=self.member_a,
            created_by=self.owner,
        )
        TaskAssignee.objects.create(task=task, user=self.member_a)
        upload_url = reverse("task-attachments", kwargs={"pk": task.pk})
        file_content = b"%PDF-1.4 fake"
        uploaded = SimpleUploadedFile("contract.pdf", file_content, content_type="application/pdf")
        res = self.client.post(upload_url, {"files": uploaded}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(len(res.data), 1)
        attachment_id = res.data[0]["id"]
        self.assertEqual(TaskAttachment.objects.filter(task=task).count(), 1)

        download_url = reverse(
            "task-download-attachment",
            kwargs={"pk": task.pk, "attachment_id": attachment_id},
        )
        dl = self.client.get(download_url)
        self.assertEqual(dl.status_code, status.HTTP_200_OK)
        # Consume/close streaming content so Windows releases the file lock.
        b"".join(dl.streaming_content)

        delete_url = reverse(
            "task-destroy-attachment",
            kwargs={"pk": task.pk, "attachment_id": attachment_id},
        )
        deleted = self.client.delete(delete_url)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TaskAttachment.objects.filter(task=task).count(), 0)


class AppointmentMeetingTypeApiTest(TestCase):
    def setUp(self):
        self.owner, self.cabinet = _create_cabinet_user(
            f"owner2-{uuid.uuid4().hex[:8]}@test.com", "+33610000002"
        )
        self.member = _add_member(
            self.cabinet, email=f"m-{uuid.uuid4().hex[:8]}@test.com", phone="+33610000021"
        )
        self.client = _auth_client(self.owner)
        self.group = Conversation.objects.create(
            type=Conversation.Type.GROUP,
            title="Legal Team",
            created_by=self.owner,
        )
        ConversationMembership.objects.create(conversation=self.group, user=self.owner, is_admin=True)
        ConversationMembership.objects.create(conversation=self.group, user=self.member)

        start = timezone.now() + timedelta(hours=2)
        self.start = start
        self.end = start + timedelta(hours=1)

    def test_in_person_requires_address(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Client Meeting",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "in_person",
                "location": "",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("location", res.data)

    def test_video_requires_conversation(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Video Meeting",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "video",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("conversation" in res.data or "conversation_mode" in res.data)

    def test_create_video_appointment(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Video Meeting",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "video",
                "conversation": self.group.id,
                "conversation_mode": "existing",
                "location": "should-be-cleared",
                "attendee_ids": [self.member.id],
                "participant_scope": "team",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        appt = Appointment.objects.get(pk=res.data["id"])
        self.assertEqual(appt.meeting_type, Appointment.MeetingType.VIDEO)
        self.assertEqual(appt.conversation_id, self.group.id)
        self.assertEqual(appt.location, "")
        self.assertIn(f"selected={self.group.id}", res.data["conference_url"] or "")
        self.assertNotIn("join=video", res.data["conference_url"] or "")
        self.assertEqual(set(appt.assignees.values_list("id", flat=True)) if False else set(appt.attendees.values_list("id", flat=True)), {self.member.id})

    def test_create_in_person_appointment(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Office Meeting",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "in_person",
                "location": "12 Avenue Mohammed V, Casablanca",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        appt = Appointment.objects.get(pk=res.data["id"])
        self.assertEqual(appt.meeting_type, Appointment.MeetingType.IN_PERSON)
        self.assertIsNone(appt.conversation_id)
        self.assertIn("Mohammed", appt.location)

    def test_create_appointment_defaults_meeting_type(self):
        """Legacy clients that omit meeting_type still create in-person appointments."""
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Legacy Create",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "location": "Tribunal de Commerce, Casablanca",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["meeting_type"], Appointment.MeetingType.IN_PERSON)
        appt = Appointment.objects.get(pk=res.data["id"])
        self.assertEqual(appt.meeting_type, Appointment.MeetingType.IN_PERSON)

    def test_switch_video_to_in_person_clears_conversation(self):
        appt = Appointment.objects.create(
            title="Switch me",
            start_at=self.start,
            end_at=self.end,
            cabinet=self.cabinet,
            created_by=self.owner,
            meeting_type=Appointment.MeetingType.VIDEO,
            conversation=self.group,
        )
        appt.attendees.set([self.member])
        url = reverse("appointment-detail", kwargs={"pk": appt.pk})
        res = self.client.patch(
            url,
            {
                "meeting_type": "in_person",
                "location": "Court House, Rabat",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        appt.refresh_from_db()
        self.assertEqual(appt.meeting_type, Appointment.MeetingType.IN_PERSON)
        self.assertIsNone(appt.conversation_id)
        self.assertEqual(appt.location, "Court House, Rabat")

    def test_create_temporary_video_chat(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Temp Video Sync",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "video",
                "conversation_mode": "create_temporary",
                "conversation_title": "Temp Sync Room",
                "attendee_ids": [self.member.id],
                "participant_scope": "team",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        appt = Appointment.objects.get(pk=res.data["id"])
        self.assertIsNotNone(appt.conversation_id)
        self.assertTrue(appt.conversation.is_temporary)
        self.assertEqual(appt.conversation.temporary_for_appointment_id, appt.id)
        member_ids = set(
            ConversationMembership.objects.filter(
                conversation=appt.conversation, is_deleted=False
            ).values_list("user_id", flat=True)
        )
        self.assertIn(self.owner.id, member_ids)
        self.assertIn(self.member.id, member_ids)

    def test_temp_chat_deleted_when_done(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Done cleans chat",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "video",
                "conversation_mode": "create_temporary",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        appt = Appointment.objects.get(pk=res.data["id"])
        convo_id = appt.conversation_id
        detail = reverse("appointment-detail", kwargs={"pk": appt.pk})
        patched = self.client.patch(detail, {"status": "done"}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK, patched.data)
        self.assertFalse(Conversation.objects.filter(pk=convo_id).exists())

    def test_with_client_requires_client(self):
        url = reverse("appointment-list")
        res = self.client.post(
            url,
            {
                "title": "Needs client",
                "start_at": self.start.isoformat(),
                "end_at": self.end.isoformat(),
                "meeting_type": "in_person",
                "location": "Office",
                "participant_scope": "with_client",
                "attendee_ids": [self.member.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("client", res.data)


def _list_rows(response):
    return response.data["results"] if isinstance(response.data, dict) else response.data


class TaskAppointmentCabinetIsolationTests(TestCase):
    """Cabinet A must not list or retrieve Cabinet B's work, including calendar."""

    def setUp(self):
        self.owner_a, self.cab_a = _create_cabinet_user(
            f"tasks-a-{uuid.uuid4().hex[:8]}@test.com",
            unique_test_phone(),
            "Cabinet A",
        )
        self.owner_b, self.cab_b = _create_cabinet_user(
            f"tasks-b-{uuid.uuid4().hex[:8]}@test.com",
            unique_test_phone(),
            "Cabinet B",
        )
        self.api_a = _auth_client(self.owner_a)
        self.api_b = _auth_client(self.owner_b)
        self.due = timezone.now().date()
        self.start = timezone.now() + timedelta(days=2)
        self.end = self.start + timedelta(hours=1)

        self.task_a = Task.objects.create(
            title="Ours task",
            cabinet=self.cab_a,
            created_by=self.owner_a,
            due_date=self.due,
        )
        self.task_b = Task.objects.create(
            title="Theirs task",
            cabinet=self.cab_b,
            created_by=self.owner_b,
            due_date=self.due,
        )
        self.appt_a = Appointment.objects.create(
            title="Ours meeting",
            start_at=self.start,
            end_at=self.end,
            cabinet=self.cab_a,
            created_by=self.owner_a,
        )
        self.appt_b = Appointment.objects.create(
            title="Theirs meeting",
            start_at=self.start,
            end_at=self.end,
            cabinet=self.cab_b,
            created_by=self.owner_b,
        )

    def test_task_list_excludes_other_cabinet(self):
        response = self.api_a.get(reverse("task-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        titles = {row["title"] for row in _list_rows(response)}
        self.assertIn("Ours task", titles)
        self.assertNotIn("Theirs task", titles)

    def test_cannot_retrieve_foreign_task(self):
        response = self.api_a.get(
            reverse("task-detail", kwargs={"pk": self.task_b.pk})
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )

    def test_appointment_list_excludes_other_cabinet(self):
        response = self.api_a.get(reverse("appointment-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        titles = {row["title"] for row in _list_rows(response)}
        self.assertIn("Ours meeting", titles)
        self.assertNotIn("Theirs meeting", titles)

    def test_cannot_retrieve_foreign_appointment(self):
        response = self.api_a.get(
            reverse("appointment-detail", kwargs={"pk": self.appt_b.pk})
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
        )

    def test_calendar_events_exclude_other_cabinet(self):
        window_start = timezone.now() - timedelta(days=1)
        window_end = timezone.now() + timedelta(days=14)
        response = self.api_a.get(
            reverse("calendar-events"),
            {
                "start": window_start.isoformat(),
                "end": window_end.isoformat(),
                "types": "tasks,appointments",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        titles = {row["title"] for row in response.data}
        self.assertIn("Ours task", titles)
        self.assertIn("Ours meeting", titles)
        self.assertNotIn("Theirs task", titles)
        self.assertNotIn("Theirs meeting", titles)
