"""Stable error codes for CaseAttachmentIntelligence.processing_error_code."""

UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE"
CORRUPT_PDF = "CORRUPT_PDF"
ENCRYPTED_PDF = "ENCRYPTED_PDF"
TOO_LARGE = "TOO_LARGE"
TOO_MANY_PAGES = "TOO_MANY_PAGES"
TOO_MANY_CHARS = "TOO_MANY_CHARS"
TIMEOUT = "TIMEOUT"
OCR_ENGINE_ERROR = "OCR_ENGINE_ERROR"
OCR_UNAVAILABLE = "OCR_UNAVAILABLE"
MISSING_FILE = "MISSING_FILE"
LOCKED = "LOCKED"
EXTRACTION_FAILED = "EXTRACTION_FAILED"
INTERNAL = "INTERNAL"


class AttachmentIntelligenceError(Exception):
    """Processing failure with a stable machine-readable code."""

    def __init__(self, code: str, message: str = ""):
        self.code = code
        self.message = message or code
        super().__init__(self.message)
