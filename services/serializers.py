from rest_framework import serializers
from .models import ServiceCatalog, ClientService

class ServiceCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalog
        fields = '__all__'

class ClientServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientService
        fields = '__all__'
