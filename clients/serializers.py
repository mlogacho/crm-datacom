"""Serializers for client domain entities.

These serializers define API payloads for clients, contacts, and status
history used in commercial lifecycle tracking.
"""

from rest_framework import serializers
from .models import Client, Contact, ClientStatusHistory

class ContactSerializer(serializers.ModelSerializer):
    """Serialize client contacts used by account and sales teams."""

    class Meta:
        model = Contact
        fields = '__all__'

class ClientStatusHistorySerializer(serializers.ModelSerializer):
    """Serialize auditable status transitions for commercial follow-up."""

    class Meta:
        model = ClientStatusHistory
        fields = '__all__'

class ClientSerializer(serializers.ModelSerializer):
    """Serialize clients with related contacts and service aggregates.

    Includes computed fields that support sales visibility:
    assigned services, total services count, total MRC, and total NRC.
    """

    contacts = ContactSerializer(many=True, read_only=True)
    status_history = ClientStatusHistorySerializer(many=True, read_only=True)
    assigned_services = serializers.SerializerMethodField()
    total_services_count = serializers.SerializerMethodField()
    total_mrc = serializers.SerializerMethodField()
    total_nrc = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'legal_name', 'tax_id', 'classification',
            'prospect_status', 'active_status', 'email', 'phone',
            'address', 'client_type_new', 'region', 'city',
            'segment', 'service_location', 'account_manager', 'is_active', 'created_at',
            'updated_at', 'contacts', 'status_history', 'assigned_services',
            'total_services_count', 'total_mrc', 'total_nrc'
        ]

    def create(self, validated_data):
        """Create client and bootstrap initial ClientService if catalog is set."""
        client = super().create(validated_data)
        if client.client_type_new:
            from services.models import ClientService
            ClientService.objects.get_or_create(
                client=client,
                service=client.client_type_new,
                defaults={'status': 'INSTALLED' if client.classification != 'PROSPECT' else 'PROSPECTING'}
            )
        return client

    def update(self, instance, validated_data):
        """Update client and synchronize linked service when type changes."""
        old_service = instance.client_type_new
        client = super().update(instance, validated_data)
        if client.client_type_new and old_service != client.client_type_new:
            from services.models import ClientService
            cs = ClientService.objects.filter(client=client).first()
            if cs:
                cs.service = client.client_type_new
                cs.save()
            else:
                ClientService.objects.create(
                    client=client,
                    service=client.client_type_new,
                    status='INSTALLED' if client.classification != 'PROSPECT' else 'PROSPECTING'
                )
        return client

    def get_assigned_services(self, obj):
        """Return simplified list of assigned services ordered by recency."""
        # Using the related name 'services' from ClientService, ordered by last update
        return [
            {
                "id": s.id,
                "service_name": s.service.name,
                "status": s.status
            }
            for s in obj.services.all().order_by('-updated_at')
        ]

    def get_total_services_count(self, obj):
        """Return number of service instances assigned to the client."""
        return obj.services.count()

    def get_total_mrc(self, obj):
        """Return aggregated monthly recurring revenue across services."""
        from django.db.models import Sum
        return obj.services.aggregate(total=Sum('agreed_price'))['total'] or 0.00

    def get_total_nrc(self, obj):
        """Return aggregated non-recurring revenue across services."""
        from django.db.models import Sum
        return obj.services.aggregate(total=Sum('nrc'))['total'] or 0.00
