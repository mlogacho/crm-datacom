from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ContactViewSet

router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'contacts', ContactViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
