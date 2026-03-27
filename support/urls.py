"""URL routes for support module.

Exposes ticket and ticket-comment endpoints used by the post-sales
incident management workflow.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, TicketCommentViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet)
router.register(r'ticket-comments', TicketCommentViewSet)

urlpatterns = [
    # Ticketing API
    path('', include(router.urls)),
]
