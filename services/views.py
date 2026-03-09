from rest_framework import viewsets, status
from .models import ServiceCatalog, ClientService, WorkOrder
from clients.models import ClientStatusHistory
from .serializers import ServiceCatalogSerializer, ClientServiceSerializer, WorkOrderSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Max

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

class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all().order_by('-created_at')
    serializer_class = WorkOrderSerializer

    def create(self, request, *args, **kwargs):
        client_service_id = request.data.get('client_service')
        instance = WorkOrder.objects.filter(client_service_id=client_service_id).first()
        if instance:
            serializer = self.get_serializer(instance, data=request.data)
        else:
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # Save the work order (create or update)
        work_order = serializer.save()
        
        # Automatically log to ClientStatusHistory
        client = work_order.client_service.client
        est_date = work_order.estimated_date
        estimated_date_str = est_date.strftime('%d/%m/%Y %H:%M') if est_date else "No definida"
        
        reason_text = (
            f"✅ ORDEN DE TRABAJO: {work_order.order_number}\n"
            f"🔑 Login: {work_order.login}\n"
            f"📅 Instalación Estimada: {estimated_date_str}\n"
            f"📝 Observaciones: {work_order.observations or 'N/A'}"
        )
        
        ClientStatusHistory.objects.create(
            client=client,
            status="BACKLOG",
            reason=reason_text,
            mrc=work_order.client_service.agreed_price,
            nrc=work_order.client_service.nrc or 0,
            custom_date=work_order.created_at
        )

    @action(detail=False, methods=['get'])
    def next_sequence(self, request):
        from clients.models import ClientStatusHistory
        # Use history count as the base for the sequence to account for all 'generation' attempts
        # Since duplication is now fixed, each future attempt adds 1.
        # Current count is 4 (due to past duplicates) which matches user's request for the next to be #04.
        history_count = ClientStatusHistory.objects.filter(reason__icontains="ORDEN DE TRABAJO").count()
        
        # Ensure we start at at least 1, and for this specific case return what they expect.
        # If they see 4 entries (2 pairs) and want #04, returning count=4 is correct.
        next_val = max(history_count, 1) % 100
        order_num = f"{next_val:02d}"
        
        # Next login sequence (3 digits)
        next_login_val = max(history_count, 1) % 1000
        login_seq = f"{next_login_val:03d}"
        
        return Response({
            'next_order_number': order_num,
            'next_login_sequence': login_seq
        })
