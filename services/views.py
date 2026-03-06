from rest_framework import viewsets
from .models import ServiceCatalog, ClientService
from .serializers import ServiceCatalogSerializer, ClientServiceSerializer

class ServiceCatalogViewSet(viewsets.ModelViewSet):
    queryset = ServiceCatalog.objects.all()
    serializer_class = ServiceCatalogSerializer

class ClientServiceViewSet(viewsets.ModelViewSet):
    queryset = ClientService.objects.all().order_by('-created_at')
    serializer_class = ClientServiceSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = ClientService.objects.all().order_by('-created_at')
        
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if user.is_superuser:
            return queryset
            
        try:
            profile = user.profile
            if profile.role and profile.role.name in ['Ventas', 'Gerente de Cuenta']:
                full_name = f"{user.first_name} {user.last_name}".strip()
                if not full_name:
                    full_name = user.username
                return queryset.filter(client__account_manager__icontains=full_name)
        except Exception:
            pass
            
        return queryset
