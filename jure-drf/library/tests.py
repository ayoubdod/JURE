import os

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import Document
from .serializers import DocumentSerializer


class DocumentSerializerMissingFileTests(TestCase):
    def test_missing_blob_does_not_raise(self):
        upload = SimpleUploadedFile("brief.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        doc = Document.objects.create(
            title="Brief",
            category=Document.DocumentCategory.LAW,
            file=upload,
        )
        path = doc.file.path
        self.assertTrue(os.path.exists(path))
        os.remove(path)

        data = DocumentSerializer(doc).data
        self.assertEqual(data["id"], doc.pk)
        self.assertEqual(data["title"], "Brief")
        self.assertEqual(data["size"], 0)
        self.assertIn("file", data)
