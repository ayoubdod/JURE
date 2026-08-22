"""Tests for cabinet-targeted, schedule-aware announcements."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from cabinets.models import Cabinet
from lawyers.models import LawyerProfile

from .announcements import DISMISSED_ANNOUNCEMENT_SESSION_KEY
from .models import Announcement

User = get_user_model()


def _create_cabinet_lawyer(email: str, phone: str, trade_name: str = "Cabinet"):
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


def _auth_client(user) -> APIClient:
    api = APIClient()
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api


def _make_announcement(*, title, cabinets, **kwargs):
    is_active = kwargs.pop("is_active", True)
    status = kwargs.pop(
        "status",
        Announcement.Status.PUBLISHED if is_active else Announcement.Status.DRAFT,
    )
    ann = Announcement.objects.create(
        title=title,
        message=kwargs.pop("message", "Test message"),
        announcement_type=kwargs.pop(
            "announcement_type", Announcement.AnnouncementType.INFO
        ),
        is_active=is_active,
        status=status,
        priority=kwargs.pop("priority", Announcement.Priority.NORMAL),
        link_url=kwargs.pop("link_url", ""),
        link_label=kwargs.pop("link_label", ""),
        start_date=kwargs.pop("start_date", None),
        end_date=kwargs.pop("end_date", None),
        created_by=kwargs.pop("created_by", None),
    )
    if cabinets:
        ann.target_cabinets.set(cabinets)
    return ann


class AnnouncementModelTest(TestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_lawyer(
            "ann-a@test.com", "+33640000001", "Cabinet A"
        )
        self.user_b, self.cab_b = _create_cabinet_lawyer(
            "ann-b@test.com", "+33640000002", "Cabinet B"
        )
        self.now = timezone.now()

    def test_admin_can_create_announcement_targeting_cabinet(self):
        admin = User.objects.create_superuser(
            email="platform-admin@test.com",
            password="adminpass123",
            first_name="Platform",
            last_name="Admin",
            phone="+33640000099",
            country="FR",
        )
        ann = _make_announcement(
            title="New feature",
            cabinets=[self.cab_a],
            created_by=admin,
            message="Juria can now assist with research.",
        )
        self.assertEqual(ann.created_by_id, admin.id)
        self.assertEqual(list(ann.target_cabinets.all()), [self.cab_a])

    def test_unauthorized_user_cannot_access_announcement_admin(self):
        client = APIClient()
        client.force_login(self.user_a)
        url = reverse("admin:dashboard_announcement_add")
        response = client.get(url)
        # Non-staff cabinet users are redirected away from admin
        self.assertIn(response.status_code, (302, 403))

    def test_staff_admin_can_access_announcement_admin(self):
        admin = User.objects.create_superuser(
            email="staff-admin@test.com",
            password="adminpass123",
            first_name="Staff",
            last_name="Admin",
            phone="+33640000098",
            country="FR",
        )
        client = APIClient()
        client.force_login(admin)
        url = reverse("admin:dashboard_announcement_changelist")
        response = client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_announcement_add_form_includes_learn_more_fields(self):
        admin = User.objects.create_superuser(
            email="link-admin@test.com",
            password="adminpass123",
            first_name="Link",
            last_name="Admin",
            phone="+33640000097",
            country="FR",
        )
        client = APIClient()
        client.force_login(admin)
        response = client.get(reverse("admin:dashboard_announcement_add"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="link_url"')
        self.assertContains(response, 'name="link_label"')
        self.assertContains(response, "Learn more URL")
        self.assertContains(response, "Learn more button text")

    def test_cabinet_a_receives_targeted_announcement(self):
        _make_announcement(title="For A", cabinets=[self.cab_a])
        picked = Announcement.pick_for_cabinet(self.cab_a)
        self.assertIsNotNone(picked)
        self.assertEqual(picked.title, "For A")

    def test_cabinet_b_does_not_receive_cabinet_a_announcement(self):
        _make_announcement(title="For A only", cabinets=[self.cab_a])
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_b))

    def test_multiple_cabinet_targeting(self):
        ann = _make_announcement(
            title="For A and B",
            cabinets=[self.cab_a, self.cab_b],
        )
        self.assertEqual(
            Announcement.pick_for_cabinet(self.cab_a).id, ann.id
        )
        self.assertEqual(
            Announcement.pick_for_cabinet(self.cab_b).id, ann.id
        )

    def test_empty_targets_visible_to_nobody(self):
        _make_announcement(title="Orphan", cabinets=[])
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_b))

    def test_inactive_not_displayed(self):
        _make_announcement(
            title="Off", cabinets=[self.cab_a], is_active=False
        )
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))

    def test_before_start_date_not_displayed(self):
        _make_announcement(
            title="Future",
            cabinets=[self.cab_a],
            start_date=self.now + timedelta(days=2),
        )
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))

    def test_expired_not_displayed(self):
        _make_announcement(
            title="Expired",
            cabinets=[self.cab_a],
            end_date=self.now - timedelta(hours=1),
        )
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))

    def test_null_start_is_immediately_eligible(self):
        ann = _make_announcement(
            title="Now",
            cabinets=[self.cab_a],
            start_date=None,
            end_date=self.now + timedelta(days=1),
        )
        self.assertEqual(Announcement.pick_for_cabinet(self.cab_a).id, ann.id)

    def test_null_end_never_expires(self):
        ann = _make_announcement(
            title="Forever",
            cabinets=[self.cab_a],
            start_date=self.now - timedelta(days=30),
            end_date=None,
        )
        self.assertEqual(Announcement.pick_for_cabinet(self.cab_a).id, ann.id)

    def test_priority_ordering_prefers_important(self):
        _make_announcement(
            title="Info",
            cabinets=[self.cab_a],
            announcement_type=Announcement.AnnouncementType.INFO,
        )
        important = _make_announcement(
            title="Important",
            cabinets=[self.cab_a],
            announcement_type=Announcement.AnnouncementType.IMPORTANT,
        )
        self.assertEqual(
            Announcement.pick_for_cabinet(self.cab_a).id, important.id
        )

    def test_priority_then_start_date_ordering(self):
        older = _make_announcement(
            title="Older high",
            cabinets=[self.cab_a],
            priority=Announcement.Priority.HIGH,
            start_date=self.now - timedelta(days=2),
        )
        newer = _make_announcement(
            title="Newer high",
            cabinets=[self.cab_a],
            priority=Announcement.Priority.HIGH,
            start_date=self.now - timedelta(hours=1),
        )
        _make_announcement(
            title="Low",
            cabinets=[self.cab_a],
            priority=Announcement.Priority.LOW,
            start_date=self.now,
        )
        picked = Announcement.pick_for_cabinet(self.cab_a)
        self.assertEqual(picked.id, newer.id)
        self.assertNotEqual(picked.id, older.id)

    def test_draft_not_visible_until_published(self):
        draft = _make_announcement(
            title="Draft JURIA notice",
            cabinets=[self.cab_a],
            status=Announcement.Status.DRAFT,
            is_active=False,
            link_url="/dashboard/juria",
            link_label="Learn more",
        )
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))
        draft.status = Announcement.Status.PUBLISHED
        draft.save()
        picked = Announcement.pick_for_cabinet(self.cab_a)
        self.assertEqual(picked.id, draft.id)

    def test_rejects_javascript_link(self):
        ann = Announcement(
            title="Unsafe",
            message="No",
            link_url="javascript:alert(1)",
        )
        with self.assertRaises(ValidationError):
            ann.full_clean()

    def test_rejects_http_external_link(self):
        ann = Announcement(
            title="Http",
            message="No",
            link_url="http://example.com",
        )
        with self.assertRaises(ValidationError):
            ann.full_clean()

    def test_accepts_https_and_internal_links(self):
        https = Announcement(
            title="Https",
            message="Yes",
            status=Announcement.Status.DRAFT,
            link_url="https://example.com/announcement",
            link_label="Read announcement",
        )
        https.full_clean()
        self.assertEqual(https.link_url, "https://example.com/announcement")

        internal = Announcement(
            title="Internal",
            message="Yes",
            status=Announcement.Status.DRAFT,
            link_url="/dashboard/juria",
            link_label="Learn more",
        )
        internal.full_clean()
        self.assertEqual(internal.link_url, "/dashboard/juria")

    def test_learn_more_label_requires_url(self):
        ann = Announcement(
            title="Label only",
            message="No url",
            status=Announcement.Status.DRAFT,
            link_label="Learn more",
        )
        with self.assertRaises(ValidationError):
            ann.full_clean()

    def test_deleted_announcement_no_longer_returned(self):
        ann = _make_announcement(title="Gone", cabinets=[self.cab_a])
        ann_id = ann.id
        ann.delete()
        self.assertIsNone(Announcement.pick_for_cabinet(self.cab_a))
        self.assertFalse(Announcement.objects.filter(pk=ann_id).exists())


class AnnouncementAPITest(APITestCase):
    def setUp(self):
        self.user_a, self.cab_a = _create_cabinet_lawyer(
            "api-ann-a@test.com", "+33641000001", "API Cabinet A"
        )
        self.user_b, self.cab_b = _create_cabinet_lawyer(
            "api-ann-b@test.com", "+33641000002", "API Cabinet B"
        )
        self.api_a = _auth_client(self.user_a)
        self.api_b = _auth_client(self.user_b)
        self.overview_url = reverse("dashboard-overview")

    def test_overview_returns_targeted_announcement_for_cabinet_a(self):
        ann = _make_announcement(
            title="Hello A",
            cabinets=[self.cab_a],
            message="Feature drop",
            announcement_type=Announcement.AnnouncementType.SUCCESS,
        )
        response = self.api_a.get(self.overview_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()["announcement"]
        self.assertIsNotNone(payload)
        self.assertEqual(payload["id"], ann.id)
        self.assertEqual(payload["title"], "Hello A")
        self.assertEqual(payload["message"], "Feature drop")
        self.assertEqual(payload["type"], "SUCCESS")
        self.assertIsNone(payload.get("media_url"))
        self.assertIsNone(payload.get("media_kind"))
        self.assertNotIn("Welcome to Jure", payload.get("message", ""))

    def test_overview_includes_learn_more_link(self):
        _make_announcement(
            title="JURIA is available",
            cabinets=[self.cab_a],
            message="Faster legal research.",
            announcement_type=Announcement.AnnouncementType.PRODUCT_UPDATE,
            link_url="/dashboard/juria",
            link_label="Learn more",
        )
        payload = self.api_a.get(self.overview_url).json()["announcement"]
        self.assertEqual(payload["link_url"], "/dashboard/juria")
        self.assertEqual(payload["link_label"], "Learn more")
        self.assertEqual(payload["type"], "PRODUCT_UPDATE")

    def test_overview_cabinet_b_does_not_see_cabinet_a_announcement(self):
        _make_announcement(title="Secret A", cabinets=[self.cab_a])
        response = self.api_b.get(self.overview_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["announcement"])

    def test_overview_no_fake_fallback_when_empty(self):
        response = self.api_a.get(self.overview_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["announcement"])

    def test_inactive_not_returned_via_api(self):
        _make_announcement(
            title="Inactive", cabinets=[self.cab_a], is_active=False
        )
        response = self.api_a.get(self.overview_url)
        self.assertIsNone(response.json()["announcement"])

    def test_outside_schedule_not_returned_via_api(self):
        now = timezone.now()
        _make_announcement(
            title="Future",
            cabinets=[self.cab_a],
            start_date=now + timedelta(days=5),
        )
        _make_announcement(
            title="Past",
            cabinets=[self.cab_a],
            end_date=now - timedelta(days=1),
        )
        response = self.api_a.get(self.overview_url)
        self.assertIsNone(response.json()["announcement"])

    def test_user_can_hide_announcement_for_session(self):
        ann = _make_announcement(title="Hide me", cabinets=[self.cab_a])
        dismiss_url = reverse(
            "announcement-dismiss", kwargs={"announcement_id": ann.id}
        )
        dismiss = self.api_a.post(dismiss_url)
        self.assertEqual(dismiss.status_code, status.HTTP_200_OK)

        session = self.api_a.session
        self.assertIn(ann.id, session.get(DISMISSED_ANNOUNCEMENT_SESSION_KEY, []))

        overview = self.api_a.get(self.overview_url)
        self.assertIsNone(overview.json()["announcement"])

    def test_hidden_announcement_reappears_on_new_session(self):
        ann = _make_announcement(title="Return", cabinets=[self.cab_a])
        dismiss_url = reverse(
            "announcement-dismiss", kwargs={"announcement_id": ann.id}
        )
        self.assertEqual(self.api_a.post(dismiss_url).status_code, 200)
        self.assertIsNone(self.api_a.get(self.overview_url).json()["announcement"])

        # New connection/session (fresh client, same user credentials)
        fresh = _auth_client(self.user_a)
        payload = fresh.get(self.overview_url).json()["announcement"]
        self.assertIsNotNone(payload)
        self.assertEqual(payload["id"], ann.id)

    def test_cannot_dismiss_other_cabinet_announcement(self):
        ann = _make_announcement(title="B only", cabinets=[self.cab_b])
        dismiss_url = reverse(
            "announcement-dismiss", kwargs={"announcement_id": ann.id}
        )
        response = self.api_a.post(dismiss_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Cabinet B still receives it
        payload = self.api_b.get(self.overview_url).json()["announcement"]
        self.assertIsNotNone(payload)
        self.assertEqual(payload["id"], ann.id)

    def test_tenant_isolation_preserved(self):
        _make_announcement(title="A", cabinets=[self.cab_a])
        _make_announcement(title="B", cabinets=[self.cab_b])
        a_payload = self.api_a.get(self.overview_url).json()["announcement"]
        b_payload = self.api_b.get(self.overview_url).json()["announcement"]
        self.assertEqual(a_payload["title"], "A")
        self.assertEqual(b_payload["title"], "B")

    def test_unauthenticated_cannot_get_overview(self):
        client = APIClient()
        response = client.get(self.overview_url)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_unauthenticated_cannot_dismiss(self):
        ann = _make_announcement(title="Auth", cabinets=[self.cab_a])
        client = APIClient()
        url = reverse(
            "announcement-dismiss", kwargs={"announcement_id": ann.id}
        )
        response = client.post(url)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class AnnouncementMediaTest(TestCase):
    def setUp(self):
        self.user, self.cabinet = _create_cabinet_lawyer(
            "media-ann@test.com", "+33642000001", "Media Cabinet"
        )
        self.api = _auth_client(self.user)
        self.overview_url = reverse("dashboard-overview")

    def test_detect_media_kind_image_and_video(self):
        self.assertEqual(
            Announcement.detect_media_kind("banner.PNG"),
            Announcement.MediaKind.IMAGE,
        )
        self.assertEqual(
            Announcement.detect_media_kind("clip.mp4"),
            Announcement.MediaKind.VIDEO,
        )
        self.assertEqual(Announcement.detect_media_kind("notes.pdf"), "")

    def test_overview_includes_image_media(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        ann = _make_announcement(title="With image", cabinets=[self.cabinet])
        ann.media = SimpleUploadedFile(
            "promo.jpg",
            b"\xff\xd8\xff\xe0" + b"\x00" * 32,
            content_type="image/jpeg",
        )
        ann.save()
        self.assertEqual(ann.media_kind, Announcement.MediaKind.IMAGE)

        payload = self.api.get(self.overview_url).json()["announcement"]
        self.assertIsNotNone(payload)
        self.assertEqual(payload["media_kind"], "IMAGE")
        self.assertTrue(payload["media_url"])
        self.assertIn("announcements/", payload["media_url"])

    def test_overview_includes_video_media(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        ann = _make_announcement(title="With video", cabinets=[self.cabinet])
        ann.media = SimpleUploadedFile(
            "intro.mp4",
            b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 32,
            content_type="video/mp4",
        )
        ann.save()
        self.assertEqual(ann.media_kind, Announcement.MediaKind.VIDEO)

        payload = self.api.get(self.overview_url).json()["announcement"]
        self.assertEqual(payload["media_kind"], "VIDEO")
        self.assertTrue(payload["media_url"])

    def test_rejects_unsupported_media_extension(self):
        from django.core.exceptions import ValidationError
        from django.core.files.uploadedfile import SimpleUploadedFile

        ann = Announcement(
            title="Bad media",
            message="x",
            media=SimpleUploadedFile(
                "notes.pdf", b"%PDF-1.4", content_type="application/pdf"
            ),
        )
        with self.assertRaises(ValidationError):
            ann.full_clean()
