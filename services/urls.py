"""URL routes for services module.

Provides endpoints for service catalog management, client service
opportunities, and operational work orders.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceCatalogViewSet, ClientServiceViewSet, WorkOrderViewSet

router = DefaultRouter()
router.register(r'catalog', ServiceCatalogViewSet)
router.register(r'client-services', ClientServiceViewSet)
router.register(r'work-orders', WorkOrderViewSet)

urlpatterns = [
    # Service catalog, opportunities, and work orders API
    path('', include(router.urls)),
]
