"""Research note CRUD, tenancy, matter association, and persistence tests."""
from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from cabinets.models import Cabinet
from cases.models import Case
from dashboard.models import ActivityLog
from research_notes.models import ResearchNote

User = get_user_model()

_PHONE_SEQ = 0


def _phone():
    global _PHONE_SEQ
    _PHONE_SEQ += 1
    return f"+3362{_PHONE_SEQ:07d}"


def _create_cabinet_user(email: str, role: str = "OWNER"):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=f"Cabinet {email}",
        business_address="Casablanca",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = role
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


def _create_case(cabinet, user, *, title="Matter"):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=user,
        title=title,
        description="desc",
        court="TPI Casablanca",
        reference=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status=Case.CaseStatus.OPEN,
    )


class ResearchNoteAPITests(APITestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_user("notes-a@jure.test")
        self.user_b, self.cab_b = _create_cabinet_user("notes-b@jure.test")
        self.matter_a = _create_case(self.cab_a, self.user_a, title="Matter A")
        self.matter_b = _create_case(self.cab_b, self.user_b, title="Matter B")
        self.client.force_authenticate(user=self.user_a)

    def test_create_persists_in_database_with_cabinet_and_author(self):
        res = self.client.post(
            "/api/v1/research-notes/",
            {
                "title": "Article 230 CPC Research",
                "citation": "Art. 230 CPC",
                "content": "Initial research regarding procedural deadline…",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        note_id = res.data["id"]
        note = ResearchNote.objects.get(pk=note_id)
        self.assertEqual(note.cabinet_id, self.cab_a.id)
        self.assertEqual(note.author_id, self.user_a.id)
        self.assertEqual(note.title, "Article 230 CPC Research")
        self.assertIsNone(note.matter_id)
        self.assertTrue(
            ActivityLog.objects.filter(
                cabinet=self.cab_a, kind="research_note_created"
            ).exists()
        )

    def test_list_retrieves_after_create(self):
        ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="Persisted",
            content="still here",
        )
        res = self.client.get("/api/v1/research-notes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"] if isinstance(res.data, dict) else res.data
        titles = [n["title"] for n in results]
        self.assertIn("Persisted", titles)

    def test_update_persists(self):
        note = ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="Draft",
            content="v1",
        )
        res = self.client.patch(
            f"/api/v1/research-notes/{note.id}/",
            {"title": "Edited", "content": "v2"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        note.refresh_from_db()
        self.assertEqual(note.title, "Edited")
        self.assertEqual(note.content, "v2")
        self.assertTrue(
            ActivityLog.objects.filter(
                cabinet=self.cab_a, kind="research_note_updated"
            ).exists()
        )

    def test_delete_persists(self):
        note = ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="To delete",
        )
        res = self.client.delete(f"/api/v1/research-notes/{note.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ResearchNote.objects.filter(pk=note.id).exists())
        self.assertTrue(
            ActivityLog.objects.filter(
                cabinet=self.cab_a, kind="research_note_deleted"
            ).exists()
        )

    def test_cross_cabinet_isolation_list(self):
        ResearchNote.objects.create(
            cabinet=self.cab_b,
            author=self.user_b,
            title="Secret B",
            content="other cabinet",
        )
        res = self.client.get("/api/v1/research-notes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"] if isinstance(res.data, dict) else res.data
        titles = [n["title"] for n in results]
        self.assertNotIn("Secret B", titles)

    def test_cannot_retrieve_other_cabinet_note(self):
        other = ResearchNote.objects.create(
            cabinet=self.cab_b,
            author=self.user_b,
            title="Secret B",
        )
        res = self.client.get(f"/api/v1/research-notes/{other.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_update_other_cabinet_note(self):
        other = ResearchNote.objects.create(
            cabinet=self.cab_b,
            author=self.user_b,
            title="Secret B",
        )
        res = self.client.patch(
            f"/api/v1/research-notes/{other.id}/",
            {"title": "Hacked"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        other.refresh_from_db()
        self.assertEqual(other.title, "Secret B")

    def test_cannot_delete_other_cabinet_note(self):
        other = ResearchNote.objects.create(
            cabinet=self.cab_b,
            author=self.user_b,
            title="Secret B",
        )
        res = self.client.delete(f"/api/v1/research-notes/{other.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ResearchNote.objects.filter(pk=other.id).exists())

    def test_matter_association(self):
        res = self.client.post(
            "/api/v1/research-notes/",
            {
                "title": "Matter note",
                "content": "linked",
                "matter": self.matter_a.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["matter"], self.matter_a.id)
        note = ResearchNote.objects.get(pk=res.data["id"])
        self.assertEqual(note.matter_id, self.matter_a.id)

    def test_filter_by_matter(self):
        ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="For A",
            matter=self.matter_a,
        )
        ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="Global",
            matter=None,
        )
        res = self.client.get(
            "/api/v1/research-notes/", {"matter": self.matter_a.id}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"] if isinstance(res.data, dict) else res.data
        titles = [n["title"] for n in results]
        self.assertEqual(titles, ["For A"])

    def test_invalid_matter_from_other_cabinet_rejected(self):
        res = self.client.post(
            "/api/v1/research-notes/",
            {
                "title": "Bad matter",
                "matter": self.matter_b.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            ResearchNote.objects.filter(title="Bad matter").exists()
        )

    def test_viewer_cannot_create(self):
        viewer, _ = _create_cabinet_user("viewer-notes@jure.test", role="VIEWER")
        self.client.force_authenticate(user=viewer)
        res = self.client.post(
            "/api/v1/research-notes/",
            {"title": "Nope"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_rejected(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/v1/research-notes/")
        self.assertIn(
            res.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_ignores_client_supplied_cabinet_id(self):
        """Cabinet must come from the authenticated user, not the request body."""
        res = self.client.post(
            "/api/v1/research-notes/",
            {
                "title": "Owned by A",
                "cabinet": self.cab_b.id,
                "cabinet_id": self.cab_b.id,
                "author": self.user_b.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        note = ResearchNote.objects.get(pk=res.data["id"])
        self.assertEqual(note.cabinet_id, self.cab_a.id)
        self.assertEqual(note.author_id, self.user_a.id)

    def test_same_cabinet_colleague_cannot_see_or_mutate_notes(self):
        colleague = User.objects.create_user(
            email="notes-colleague@jure.test",
            password="testpass123",
            first_name="Cole",
            last_name="League",
            phone=_phone(),
            country="FR",
        )
        colleague.cabinet = self.cab_a
        colleague.is_cabinet_member = True
        colleague.role = User.Role.ADMIN
        colleague.save(update_fields=["cabinet", "is_cabinet_member", "role"])

        mine = ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=self.user_a,
            title="Ayoub private research",
            content="only for me",
        )
        theirs = ResearchNote.objects.create(
            cabinet=self.cab_a,
            author=colleague,
            title="Colleague research",
            content="not shared",
        )

        res = self.client.get("/api/v1/research-notes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"] if isinstance(res.data, dict) else res.data
        titles = [n["title"] for n in results]
        self.assertIn("Ayoub private research", titles)
        self.assertNotIn("Colleague research", titles)

        self.client.force_authenticate(user=colleague)
        res = self.client.get("/api/v1/research-notes/")
        results = res.data["results"] if isinstance(res.data, dict) else res.data
        titles = [n["title"] for n in results]
        self.assertIn("Colleague research", titles)
        self.assertNotIn("Ayoub private research", titles)

        self.assertEqual(
            self.client.get(f"/api/v1/research-notes/{mine.id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/research-notes/{mine.id}/",
                {"title": "Hacked"},
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(f"/api/v1/research-notes/{mine.id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        mine.refresh_from_db()
        self.assertEqual(mine.title, "Ayoub private research")
        self.assertTrue(ResearchNote.objects.filter(pk=theirs.id).exists())
