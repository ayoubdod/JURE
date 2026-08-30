import base64
import hashlib
import hmac
import json
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from calls.views import (
    _ephemeral_turn_credentials,
    _parse_ice_servers_json,
    _turn_urls,
    build_ice_servers,
)


class TurnCredentialTests(SimpleTestCase):
    def test_hmac_is_base64_not_hex(self):
        username, credential = _ephemeral_turn_credentials("shared-secret", 3600)
        self.assertIn(":jure", username)
        expiry, userid = username.split(":", 1)
        self.assertTrue(expiry.isdigit())
        self.assertEqual(userid, "jure")
        expected = base64.b64encode(
            hmac.new(
                b"shared-secret",
                username.encode("utf-8"),
                hashlib.sha1,
            ).digest()
        ).decode("ascii")
        self.assertEqual(credential, expected)
        hexed = hmac.new(
            b"shared-secret",
            username.encode("utf-8"),
            hashlib.sha1,
        ).hexdigest()
        self.assertNotEqual(credential, hexed)

    def test_turn_urls_include_udp_and_tcp(self):
        urls = _turn_urls("turn.example.com", 3478, 5349)
        self.assertIn("turn:turn.example.com:3478?transport=udp", urls)
        self.assertIn("turn:turn.example.com:3478?transport=tcp", urls)
        self.assertIn("turns:turn.example.com:5349?transport=tcp", urls)

    def test_parse_ice_servers_json_array(self):
        raw = json.dumps(
            [
                {
                    "urls": "turn:relay.example:3478?transport=tcp",
                    "username": "u",
                    "credential": "p",
                }
            ]
        )
        parsed = _parse_ice_servers_json(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed[0]["username"], "u")

    def test_parse_ice_servers_json_wrapped(self):
        raw = json.dumps({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]})
        parsed = _parse_ice_servers_json(raw)
        self.assertEqual(len(parsed), 1)


class IceServersBuildTests(SimpleTestCase):
    @override_settings(TURN_HOST="", ICE_SERVERS_JSON="", METERED_TURN_DOMAIN="", METERED_TURN_API_KEY="")
    def test_stun_only_without_turn(self):
        servers = build_ice_servers()
        urls = []
        for entry in servers:
            raw = entry.get("urls")
            urls.extend(raw if isinstance(raw, list) else [raw])
        self.assertTrue(any(str(u).startswith("stun:") for u in urls))
        self.assertFalse(any(str(u).startswith("turn:") for u in urls))

    @override_settings(
        TURN_HOST="turn.jure.test",
        TURN_PORT=3478,
        TURN_TLS_PORT=443,
        TURN_SECRET="coturn-secret",
        TURN_CREDENTIAL_TTL=3600,
        ICE_SERVERS_JSON="",
        METERED_TURN_DOMAIN="",
        METERED_TURN_API_KEY="",
    )
    def test_coturn_entry_uses_tcp_and_credentials(self):
        servers = build_ice_servers()
        turn = next(s for s in servers if "credential" in s)
        urls = turn["urls"]
        self.assertTrue(any("transport=tcp" in u for u in urls))
        self.assertTrue(any(u.startswith("turns:") for u in urls))
        self.assertIn(":jure", turn["username"])
        self.assertNotEqual(len(turn["credential"]), 40)  # not sha1 hex

    @override_settings(
        ICE_SERVERS_JSON='[{"urls":["turn:relay.metered.ca:80?transport=tcp"],"username":"abc","credential":"xyz"}]',
        TURN_HOST="",
        METERED_TURN_DOMAIN="",
        METERED_TURN_API_KEY="",
    )
    def test_json_override_is_used(self):
        servers = build_ice_servers()
        self.assertEqual(len(servers), 1)
        self.assertEqual(servers[0]["credential"], "xyz")


class IceServersApiTests(APITestCase):
    def setUp(self):
        from cases.tests import _create_cabinet_user

        self.user, _cabinet = _create_cabinet_user(email="ice@test.com")
        self.client.force_authenticate(self.user)

    @override_settings(TURN_HOST="", ICE_SERVERS_JSON="", METERED_TURN_DOMAIN="", METERED_TURN_API_KEY="")
    def test_requires_auth(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/v1/calls/ice-servers/")
        self.assertIn(res.status_code, (401, 403))

    @override_settings(
        TURN_HOST="turn.jure.test",
        TURN_PORT=3478,
        TURN_TLS_PORT=0,
        TURN_USERNAME="jure",
        TURN_CREDENTIAL="static-pass",
        TURN_SECRET="",
        ICE_SERVERS_JSON="",
        METERED_TURN_DOMAIN="",
        METERED_TURN_API_KEY="",
    )
    def test_returns_turn_with_static_creds(self):
        res = self.client.get("/api/v1/calls/ice-servers/")
        self.assertEqual(res.status_code, 200)
        ice = res.json()["iceServers"]
        turn = next(s for s in ice if s.get("username") == "jure")
        self.assertEqual(turn["credential"], "static-pass")
        self.assertTrue(any("transport=udp" in u for u in turn["urls"]))
