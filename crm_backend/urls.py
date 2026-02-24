from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('api/clients/', include('clients.urls')),
    path('api/services/', include('services.urls')),
    path('api/support/', include('support.urls')),
    path('api/billing/', include('billing.urls')),
]
