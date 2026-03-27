"""URL routes for core module.

Contains identity, role administration, permission introspection,
and 2FA setup verification endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserViewSet, get_user_permissions, verify_2fa_setup, get_account_managers, generate_and_send_password

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    # Authentication and authorization helpers
    path('user-permissions/', get_user_permissions, name='user_permissions'),
    path('2fa/verify-setup/', verify_2fa_setup, name='verify_2fa_setup'),
    path('account-managers/', get_account_managers, name='account_managers'),
    path('generate-password/', generate_and_send_password, name='generate_password'),

    # Roles and users API
    path('', include(router.urls)),
]
