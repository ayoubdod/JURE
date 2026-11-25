from django.urls import path

from cookie_consent.views import CookieConsentView

urlpatterns = [
    path("", CookieConsentView.as_view(), name="cookie-consent"),
]
