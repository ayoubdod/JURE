from unittest.mock import MagicMock, patch

import requests
from django.test import SimpleTestCase, override_settings

from juria.services.document_text import text_to_docx_base64
from juria.services.juria_api_service import JuriaAPIError, send_chat_message


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
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            self.assertIn("word/document.xml", zf.namelist())
            xml = zf.read("word/document.xml").decode("utf-8")
            self.assertIn("Bonjour", xml)
            self.assertIn("Maroc", xml)
