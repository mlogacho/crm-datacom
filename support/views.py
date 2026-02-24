from rest_framework import viewsets
from .models import Ticket, TicketComment
from .serializers import TicketSerializer, TicketCommentSerializer

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer

class TicketCommentViewSet(viewsets.ModelViewSet):
    queryset = TicketComment.objects.all().order_by('created_at')
    serializer_class = TicketCommentSerializer
