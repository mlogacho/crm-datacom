"""Serializers for service catalog and client service workflows."""

from rest_framework import serializers
from .models import ServiceCatalog, ClientService, WorkOrder

class ServiceCatalogSerializer(serializers.ModelSerializer):
    """Serialize service catalog definitions used for commercial offers."""

    class Meta:
        model = ServiceCatalog
        fields = '__all__'

class WorkOrderSerializer(serializers.ModelSerializer):
    """Serialize work orders used to hand off sold services to operations."""

    class Meta:
        model = WorkOrder
        fields = '__all__'

class ClientServiceSerializer(serializers.ModelSerializer):
    """Serialize client service opportunities including linked work order."""

    work_order = WorkOrderSerializer(read_only=True)
    class Meta:
        model = ClientService
        fields = '__all__'
