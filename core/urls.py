from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserViewSet, get_user_permissions, verify_2fa_setup

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('user-permissions/', get_user_permissions, name='user_permissions'),
    path('2fa/verify-setup/', verify_2fa_setup, name='verify_2fa_setup'),
    path('', include(router.urls)),
]
