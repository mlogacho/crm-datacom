from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceCatalogViewSet, ClientServiceViewSet

router = DefaultRouter()
router.register(r'catalog', ServiceCatalogViewSet)
router.register(r'client-services', ClientServiceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
