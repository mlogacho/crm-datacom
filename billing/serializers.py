"""Serializers for billing and invoicing domain entities."""

from rest_framework import serializers
from django.db.models import Sum
from .models import Invoice, InvoiceItem, BillingRecord


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serialize invoice line items with quantity and unit pricing."""

    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    """Serialize invoices including nested line items for API consumers."""

    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class BillingRecordSerializer(serializers.ModelSerializer):
    """Serialize monthly billing records with computed display fields.

    Exposes derived fields for client service name, month label, and the
    total billed amount by client in the selected period.
    """

    client_name = serializers.CharField(source='client.name', read_only=True)
    service_name = serializers.SerializerMethodField()
    facturacion_total_cliente = serializers.SerializerMethodField()
    mes_display = serializers.SerializerMethodField()

    class Meta:
        model = BillingRecord
        fields = [
            'id', 'client', 'client_name',
            'service_catalog', 'service_name',
            'service_amount', 'iva_amount', 'total',
            'facturacion_total_cliente',
            'observations', 'factura', 'credito',
            'mes', 'mes_display', 'anio',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['iva_amount', 'total', 'created_at', 'updated_at']

    def get_service_name(self, obj):
        """Return catalog service name or fallback manual label."""
        if obj.service_catalog:
            return obj.service_catalog.name
        return obj.service_label or ''

    def get_facturacion_total_cliente(self, obj):
        """Return sum of service_amount for same client and billing period."""
        result = BillingRecord.objects.filter(
            client=obj.client, mes=obj.mes, anio=obj.anio
        ).aggregate(total=Sum('service_amount'))
        return float(result['total'] or 0)

    def get_mes_display(self, obj):
        """Return localized display label for billing month choice."""
        return obj.get_mes_display()
