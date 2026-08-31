from unittest.mock import MagicMock, patch

import requests
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from juria.services.document_text import text_to_docx_base64
from juria.services.juria_api_service import JuriaAPIError, generate_conversation_title, send_chat_message
from juria.services.titles import (
    fallback_title_from_message,
    is_auto_title,
    sanitize_generated_title,
    untitled_chat_name,
)
from juria.constants import PermissionLevel, ProjectRole, ProjectStatus, ResourceType
from juria.models import JuriaProject, JuriaProjectMember, JuriaThread


@override_settings(
    JURIA_PROVIDER="deepseek",
    DEEPSEEK_API_KEY="sk-test",
    DEEPSEEK_API_URL="https://api.deepseek.com",
    DEEPSEEK_MODEL="deepseek-chat",
    JURIA_MAX_TOKENS=400,
    JURIA_TIMEOUT_SECONDS=10,
)
class DeepSeekProviderTests(SimpleTestCase):
    @patch("juria.services.juria_api_service.requests.post")
    def test_chat_maps_openai_response(self, post):
        post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "chatcmpl-1",
                "choices": [{"message": {"content": "Réponse Juria"}}],
                "usage": {"total_tokens": 42},
            },
        )
        out = send_chat_message([], "Qu'est-ce que le DOC ?", mode="CHAT")
        self.assertEqual(out["content"], "Réponse Juria")
        self.assertEqual(out["tokens_used"], 42)
        self.assertEqual(out["message_id"], "chatcmpl-1")
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://api.deepseek.com/chat/completions")
        self.assertEqual(kwargs["json"]["model"], "deepseek-chat")
        self.assertEqual(kwargs["json"]["messages"][-1]["content"], "Qu'est-ce que le DOC ?")
        self.assertEqual(kwargs["json"]["messages"][0]["role"], "system")

    @patch("juria.services.juria_api_service.requests.post")
    def test_system_prompt_includes_jurisdiction_and_language(self, post):
        post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "chatcmpl-2",
                "choices": [{"message": {"content": "ok"}}],
                "usage": {"total_tokens": 1},
            },
        )
        send_chat_message(
            [],
            "hello",
            mode="CHAT",
            language="ar",
            jurisdiction_code="AE",
            instructions="Prioriser le droit des EAU.",
        )
        system = post.call_args.kwargs["json"]["messages"][0]["content"]
        self.assertIn("United Arab Emirates", system)
        self.assertIn("Arabic", system)
        self.assertIn("العربية", system)
        self.assertIn("Prioriser le droit des EAU", system)
        self.assertNotIn("Tu es Juria, assistant juridique spécialisé pour le droit marocain", system)

    @patch("juria.services.juria_api_service.requests.post")
    def test_chat_raises_on_provider_error(self, post):
        post.return_value = MagicMock(
            status_code=401,
            json=lambda: {"error": {"message": "invalid api key"}},
        )
        with self.assertRaises(JuriaAPIError):
            send_chat_message([], "hello")

    @patch("juria.services.juria_api_service.requests.post")
    def test_chat_maps_insufficient_balance(self, post):
        post.return_value = MagicMock(
            status_code=402,
            json=lambda: {"error": {"message": "Insufficient Balance"}},
        )
        with self.assertRaises(JuriaAPIError) as ctx:
            send_chat_message([], "hello")
        self.assertEqual(ctx.exception.status_code, 402)
        self.assertIn("crédit", str(ctx.exception))

    @patch("juria.services.juria_api_service.requests.post")
    def test_chat_maps_connection_errors(self, post):
        post.side_effect = requests.exceptions.ConnectionError("dns failed")
        with self.assertRaises(JuriaAPIError):
            send_chat_message([], "hello")


class DocxBuilderTests(SimpleTestCase):
    def test_text_to_docx_is_zip(self):
        import base64
        import zipfile
        from io import BytesIO

        raw = base64.b64decode(text_to_docx_base64("Bonjour\nMaroc"))
        with zipfile.ZipFile(BytesIO(raw), "r") as zf:
            self.assertIn("word/document.xml", zf.namelist())
            xml = zf.read("word/document.xml").decode("utf-8")
            self.assertIn("Bonjour", xml)
            self.assertIn("Maroc", xml)


class JuriaDisabledApiTests(APITestCase):
    def test_disabled_returns_503_json(self):
        with self.settings(JURIA_ENABLED=False):
            response = self.client.get("/api/v1/juria/usage/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("disabled", response.json().get("detail", "").lower())

    def test_missing_provider_key_returns_503_json(self):
        with self.settings(
            JURIA_ENABLED=True,
            JURIA_PROVIDER="deepseek",
            DEEPSEEK_API_KEY="",
        ):
            response = self.client.get("/api/v1/juria/usage/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json().get("detail", "").lower())


@override_settings(JURIA_ENABLED=True, JURIA_PROVIDER="deepseek", DEEPSEEK_API_KEY="sk-test")
class JuriaProjectApiTests(APITestCase):
    def setUp(self):
        from cases.tests import _create_cabinet_user

        self.user, self.cabinet = _create_cabinet_user(email="juria-owner@test.com")
        self.client.force_authenticate(self.user)

    def test_create_project_and_default_thread(self):
        res = self.client.post(
            "/api/v1/juria/projects/",
            {"name": "Constitution RAYONS D'AZUR", "description": "Préparation SARL."},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertEqual(data["name"], "Constitution RAYONS D'AZUR")
        self.assertEqual(data["status"], ProjectStatus.ACTIVE)
        project = JuriaProject.objects.get(pk=data["id"])
        self.assertEqual(project.cabinet_id, self.cabinet.id)
        self.assertTrue(project.members.filter(user=self.user, role=ProjectRole.OWNER).exists())
        self.assertEqual(project.threads.filter(is_deleted=False).count(), 1)

    def test_create_simple_chat_skips_firm_context(self):
        from juria.services.context_engine import resolve_prompt_context

        res = self.client.post(
            "/api/v1/juria/projects/",
            {"name": "Chat rapide", "is_simple": True, "preferred_language": "fr"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertTrue(data["is_simple"])
        project = JuriaProject.objects.get(pk=data["id"])
        self.assertTrue(project.is_simple)
        self.assertIsNone(project.linked_case_id)
        ctx = resolve_prompt_context(project, "Quelle est la prescription en matière commerciale ?")
        self.assertEqual(ctx["retrieved"], [])
        self.assertIsNone(ctx["case_context"])
        self.assertIn("standalone", ctx["retrieved_block"].lower())
        refused = self.client.post(
            f"/api/v1/juria/projects/{project.id}/sources/",
            {"kind": "LIBRARY", "library_document_ids": [1]},
            format="json",
        )
        self.assertEqual(refused.status_code, 400)

    def test_outsider_cannot_see_project(self):
        from cases.tests import _create_cabinet_user

        res = self.client.post("/api/v1/juria/projects/", {"name": "Secret"}, format="json")
        pk = res.json()["id"]
        other, _cab = _create_cabinet_user(email="other-juria@test.com")
        self.client.force_authenticate(other)
        hidden = self.client.get(f"/api/v1/juria/projects/{pk}/")
        self.assertEqual(hidden.status_code, 404)

    def test_archive_restore_and_permissions(self):
        created = self.client.post("/api/v1/juria/projects/", {"name": "Dossier X"}, format="json")
        pk = created.json()["id"]
        arch = self.client.post(f"/api/v1/juria/projects/{pk}/archive/")
        self.assertEqual(arch.status_code, 200)
        listed = self.client.get("/api/v1/juria/projects/?status=ARCHIVED")
        ids = [p["id"] for p in listed.json()["results"]]
        self.assertIn(pk, ids)
        rest = self.client.post(f"/api/v1/juria/projects/{pk}/restore/")
        self.assertEqual(rest.status_code, 200)
        perm = self.client.patch(
            f"/api/v1/juria/projects/{pk}/permissions/",
            {"resource": ResourceType.DOCUMENTS, "level": PermissionLevel.READ},
            format="json",
        )
        self.assertEqual(perm.status_code, 200)
        self.assertEqual(perm.json()["level"], PermissionLevel.READ)

    def test_create_project_with_language_and_jurisdiction(self):
        res = self.client.post(
            "/api/v1/juria/projects/",
            {
                "name": "Projet AR",
                "preferred_language": "ar",
                "jurisdiction_code": "AE",
                "permissions": {"DOCUMENTS": "READ", "CLIENTS": "NONE"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertEqual(data["preferred_language"], "ar")
        self.assertEqual(data["jurisdiction_code"], "AE")
        thread_list = self.client.get(f"/api/v1/juria/projects/{data['id']}/threads/")
        self.assertEqual(thread_list.status_code, 200)
        self.assertGreaterEqual(len(thread_list.json()), 1)

    def test_simple_chat_starts_untitled(self):
        res = self.client.post(
            "/api/v1/juria/projects/",
            {"is_simple": True, "preferred_language": "fr"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        project = JuriaProject.objects.get(pk=res.json()["id"])
        self.assertEqual(project.name, "Nouveau chat")
        self.assertFalse(project.name_is_custom)
        thread = project.threads.first()
        self.assertEqual(thread.title, "Nouveau chat")
        self.assertFalse(thread.title_is_custom)

    def test_rename_marks_project_name_custom(self):
        created = self.client.post(
            "/api/v1/juria/projects/",
            {"is_simple": True, "preferred_language": "fr"},
            format="json",
        )
        pk = created.json()["id"]
        renamed = self.client.patch(
            f"/api/v1/juria/projects/{pk}/",
            {"name": "Bail commercial Hay Riad"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 200, renamed.content)
        project = JuriaProject.objects.get(pk=pk)
        self.assertEqual(project.name, "Bail commercial Hay Riad")
        self.assertTrue(project.name_is_custom)

    @patch("juria.services.chat.generate_conversation_title", return_value="Prescription commerciale")
    @patch(
        "juria.services.chat._call_model",
        return_value=("Réponse", 10, "mid", [], {}, [], 80),
    )
    def test_first_message_sets_ai_title(self, _model, _title):
        created = self.client.post(
            "/api/v1/juria/projects/",
            {"is_simple": True, "preferred_language": "fr"},
            format="json",
        )
        project = JuriaProject.objects.get(pk=created.json()["id"])
        thread = project.threads.first()
        send = self.client.post(
            f"/api/v1/juria/threads/{thread.id}/messages/",
            {"message": "Quelle est la prescription en matière commerciale ?"},
            format="json",
        )
        self.assertEqual(send.status_code, 201, send.content)
        body = send.json()
        self.assertEqual(body["thread_title"], "Prescription commerciale")
        self.assertEqual(body["project_name"], "Prescription commerciale")
        thread.refresh_from_db()
        project.refresh_from_db()
        self.assertEqual(thread.title, "Prescription commerciale")
        self.assertFalse(thread.title_is_custom)
        self.assertEqual(project.name, "Prescription commerciale")
        self.assertFalse(project.name_is_custom)

    @patch("juria.services.chat.generate_conversation_title", return_value="Should not apply")
    @patch(
        "juria.services.chat._call_model",
        return_value=("Réponse", 10, "mid", [], {}, [], 80),
    )
    def test_custom_title_is_not_overwritten(self, _model, _title):
        created = self.client.post(
            "/api/v1/juria/projects/",
            {"is_simple": True, "preferred_language": "fr"},
            format="json",
        )
        project = JuriaProject.objects.get(pk=created.json()["id"])
        thread = project.threads.first()
        self.client.patch(
            f"/api/v1/juria/threads/{thread.id}/",
            {"title": "Dossier client X"},
            format="json",
        )
        send = self.client.post(
            f"/api/v1/juria/threads/{thread.id}/messages/",
            {"message": "Analyse ce contrat"},
            format="json",
        )
        self.assertEqual(send.status_code, 201, send.content)
        thread.refresh_from_db()
        self.assertEqual(thread.title, "Dossier client X")
        self.assertTrue(thread.title_is_custom)
        _title.assert_not_called()


class JuriaTitleHelperTests(SimpleTestCase):
    def test_untitled_and_placeholders(self):
        self.assertEqual(untitled_chat_name("fr"), "Nouveau chat")
        self.assertEqual(untitled_chat_name("en"), "New chat")
        self.assertTrue(is_auto_title("Nouveau chat"))
        self.assertTrue(is_auto_title("Chat rapide — 31 Aug, 17:52"))
        self.assertTrue(is_auto_title("Discussion générale"))
        self.assertFalse(is_auto_title("Bail commercial Hay Riad"))

    def test_sanitize_generated_title(self):
        self.assertEqual(sanitize_generated_title('  "Prescription commerciale."  '), "Prescription commerciale")
        self.assertEqual(sanitize_generated_title("Title: Bail commercial"), "Bail commercial")
        self.assertEqual(sanitize_generated_title(""), "")

    def test_fallback_title(self):
        self.assertEqual(fallback_title_from_message("Hello world"), "Hello world")
        long = "a" * 80
        self.assertTrue(fallback_title_from_message(long).endswith("…"))

    @override_settings(
        JURIA_PROVIDER="deepseek",
        DEEPSEEK_API_KEY="sk-test",
        DEEPSEEK_API_URL="https://api.deepseek.com",
        DEEPSEEK_MODEL="deepseek-chat",
        JURIA_MAX_TOKENS=400,
        JURIA_TIMEOUT_SECONDS=10,
    )
    @patch("juria.services.juria_api_service.requests.post")
    def test_generate_conversation_title_strips_model_output(self, post):
        post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "chatcmpl-title",
                "choices": [{"message": {"content": '"Mise en demeure locataire"'}}],
                "usage": {"total_tokens": 8},
            },
        )
        title = generate_conversation_title("Rédige une mise en demeure", language="fr")
        self.assertEqual(title, "Mise en demeure locataire")
        self.assertEqual(post.call_args.kwargs["json"]["max_tokens"], 32)
