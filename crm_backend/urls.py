from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/clients/', include('clients.urls')),
    path('api/services/', include('services.urls')),
    path('api/support/', include('support.urls')),
    path('api/billing/', include('billing.urls')),
]
