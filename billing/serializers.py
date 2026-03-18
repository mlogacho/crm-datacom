from rest_framework import serializers
from django.db.models import Sum
from .models import Invoice, InvoiceItem, BillingRecord


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class BillingRecordSerializer(serializers.ModelSerializer):
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
        if obj.service_catalog:
            return obj.service_catalog.name
        return obj.service_label or ''

    def get_facturacion_total_cliente(self, obj):
        result = BillingRecord.objects.filter(
            client=obj.client, mes=obj.mes, anio=obj.anio
        ).aggregate(total=Sum('service_amount'))
        return float(result['total'] or 0)

    def get_mes_display(self, obj):
        return obj.get_mes_display()
