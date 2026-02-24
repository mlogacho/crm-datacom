from rest_framework import viewsets
from .models import ServiceCatalog, ClientService
from .serializers import ServiceCatalogSerializer, ClientServiceSerializer

class ServiceCatalogViewSet(viewsets.ModelViewSet):
    queryset = ServiceCatalog.objects.all()
    serializer_class = ServiceCatalogSerializer

class ClientServiceViewSet(viewsets.ModelViewSet):
    queryset = ClientService.objects.all().order_by('-created_at')
    serializer_class = ClientServiceSerializer
