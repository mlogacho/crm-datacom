from rest_framework import serializers
from .models import ServiceCatalog, ClientService, WorkOrder

class ServiceCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalog
        fields = '__all__'

class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = '__all__'

class ClientServiceSerializer(serializers.ModelSerializer):
    work_order = WorkOrderSerializer(read_only=True)
    class Meta:
        model = ClientService
        fields = '__all__'
