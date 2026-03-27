"""Serializers for support ticket workflows."""

from rest_framework import serializers
from .models import Ticket, TicketComment

class TicketCommentSerializer(serializers.ModelSerializer):
    """Serialize comments attached to support tickets."""

    class Meta:
        model = TicketComment
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    """Serialize support tickets with related comment timeline."""

    comments = TicketCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = '__all__'
