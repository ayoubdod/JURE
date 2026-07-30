from django.test import SimpleTestCase, override_settings


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
