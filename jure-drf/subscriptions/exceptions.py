from rest_framework.exceptions import APIException


class EntitlementDenied(APIException):
    status_code = 402
    default_detail = "This action is not included in the current subscription."
    default_code = "entitlement_denied"

    def __init__(self, detail=None, code=None):
        super().__init__(detail=detail, code=code or self.default_code)
