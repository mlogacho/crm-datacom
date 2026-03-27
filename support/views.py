"""Support API views.

This module exposes endpoints for ticket operations and ticket comment
tracking used by post-sales support workflows.
"""

from rest_framework import viewsets
from .models import Ticket, TicketComment
from .serializers import TicketSerializer, TicketCommentSerializer

class TicketViewSet(viewsets.ModelViewSet):
    """CRUD API for support tickets.

    Commercial action:
    - Manage client incidents and support lifecycle after service delivery.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer

class TicketCommentViewSet(viewsets.ModelViewSet):
    """CRUD API for comments attached to support tickets.

    Commercial action:
    - Keep an auditable communication timeline between staff and operations.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = TicketComment.objects.all().order_by('created_at')
    serializer_class = TicketCommentSerializer
