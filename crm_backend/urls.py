from django.contrib import admin
from django.urls import path, include
from core.views import CustomAuthToken

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/api-token-auth/', CustomAuthToken.as_view(), name='api_token_auth'),
    path('api/core/', include('core.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/services/', include('services.urls')),
    path('api/support/', include('support.urls')),
    path('api/billing/', include('billing.urls')),
]
