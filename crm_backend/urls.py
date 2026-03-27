"""Root URL configuration for CRM DataCom.

Routes admin access and REST API modules for core, clients, services,
support, and billing domains.
"""

import os
from django.contrib import admin
from django.urls import path, include, re_path
from core.views import CustomAuthToken
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve

FRONTEND_DIST = os.path.join(settings.BASE_DIR, 'frontend', 'dist')

urlpatterns = [
    # Admin and authentication
    path('admin/', admin.site.urls),
    path('api/api-token-auth/', CustomAuthToken.as_view(), name='api_token_auth'),

    # API modules
    path('api/core/', include('core.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/services/', include('services.urls')),
    path('api/support/', include('support.urls')),
    path('api/billing/', include('billing.urls')),
]

if settings.DEBUG:
    # In local dev, Django serves both the React SPA assets and media files.
    # In production, Nginx handles /assets/, /media/, and the frontend build directly.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [
        re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(FRONTEND_DIST, 'assets')}),
        re_path(r'^(?P<path>favicon\.png|datacom_logo\.png|Recurso3\.png|logo\.jpg|vite\.svg)$',
                serve, {'document_root': FRONTEND_DIST}),
        # SPA catch-all: serve index.html for all non-API frontend routes
        re_path(r'^(?!api/|admin/|media/).*$', TemplateView.as_view(template_name='index.html')),
    ]
