from django.test import SimpleTestCase, TestCase, override_settings
from django.conf import settings
from pathlib import Path


@override_settings(DEBUG=False)
class RootEndpointTests(SimpleTestCase):
    def test_root_returns_service_discovery_payload(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "application": "JURE API",
                "version": "1.0",
                "environment": "production",
                "admin": "/admin/",
                "api": "/api/",
                "documentation": "/docs/",
            },
        )

    def test_root_rejects_non_get(self):
        response = self.client.post("/")
        self.assertEqual(response.status_code, 405)


@override_settings(DEBUG=False)
class HealthEndpointTests(SimpleTestCase):
    def test_health_returns_healthy(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    def test_health_rejects_non_get(self):
        response = self.client.post("/health/")
        self.assertEqual(response.status_code, 405)


@override_settings(
    CORS_ALLOWED_ORIGINS=["http://localhost:5173"],
    DEBUG=False,
)
class MediaPreviewHeaderTests(TestCase):
    def test_pdf_can_be_framed_by_the_frontend(self):
        media = Path(settings.MEDIA_ROOT)
        media.mkdir(parents=True, exist_ok=True)
        pdf = media / "preview-test.pdf"
        pdf.write_bytes(b"%PDF-1.4 test")
        response = self.client.get(
            "/media/preview-test.pdf",
            HTTP_ORIGIN="http://localhost:5173",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.get("X-Frame-Options"), "DENY")
        self.assertIsNone(response.get("X-Frame-Options"))
        csp = response.get("Content-Security-Policy", "")
        self.assertIn("frame-ancestors", csp)
        self.assertIn("http://localhost:5173", csp)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "http://localhost:5173")
