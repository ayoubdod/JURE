"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import re
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve
from django.views.decorators.cache import never_cache
from debug_toolbar.toolbar import debug_toolbar_urls
from users.views import setup_password_by_token

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('accounts/', include('allauth.urls')),
    path('api/v1/dj-rest-auth/', include('dj_rest_auth.urls')),
    path('api/v1/dj-rest-auth/registration/', include('dj_rest_auth.registration.urls')),


    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/commons/', include('commons.urls')),
    path('api/v1/cases/<int:case_id>/', include('finance.case_urls')),
    path('api/v1/cases/', include('cases.urls')),
    path('api/v1/finance/', include('finance.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/clients/', include('clients.urls')),
    path('api/v1/cabinets/', include('cabinets.urls')),
    path('api/v1/auth/setup-password/', setup_password_by_token, name='setup_password_by_token'),
    path('api/v1/library/', include('library.urls')),
    path('api/v1/tasks/', include('tasks.urls')),
    path('api/v1/calendar/', include('case_calendar.urls')),
    path('api/calendar/', include('case_calendar.urls')),
    path("api/v1/chat/", include("chat.urls")),
    path("api/v1/users/", include("users.urls")),
    path("api/users/", include("users.urls")),
    path("api/v1/search/", include("search.urls")),
    path("api/v1/juria/", include("juria.urls")),
    path("api/search/", include("search.urls")),
    path("api/calls/", include("calls.urls")),

    
    # Schema JSON
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),

    # Swagger UI
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # Redoc (optional)
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # path('api/v1/dj-rest-auth/password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
] + debug_toolbar_urls() + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) + [
    # Media with no-cache so updated logos/images refresh immediately
    re_path(
        r'^%s(?P<path>.*)$' % re.escape(settings.MEDIA_URL.lstrip('/')),
        never_cache(static_serve),
        {'document_root': settings.MEDIA_ROOT},
    ),
]
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]