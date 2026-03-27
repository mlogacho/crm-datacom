"""URL routes for clients module.

Provides CRM endpoints for customer records, contacts, and bulk import
operations related to the commercial pipeline.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ContactViewSet, ImportClientsView

router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'contacts', ContactViewSet)

urlpatterns = [
    # Bulk import
    path('import/', ImportClientsView.as_view(), name='import-clients'),

    # Clients and contacts API
    path('', include(router.urls)),
]
