from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ContactViewSet, ImportClientsView

router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'contacts', ContactViewSet)

urlpatterns = [
    path('import/', ImportClientsView.as_view(), name='import-clients'),
    path('', include(router.urls)),
]
