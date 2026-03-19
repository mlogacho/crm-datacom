"""
Modelos de la app de servicios.

Gestiona el catálogo de servicios y su asignación a clientes:
- ServiceCatalog: catálogo maestro de productos y servicios de DataCom.
- ClientService: servicio asignado a un cliente con embudo de 11 estados.
  El método save() sincroniza automáticamente el estado del cliente.
- WorkOrder: orden de trabajo vinculada a un ClientService instalado.
  El número de orden y el login PPPoE se generan automáticamente.
"""
from django.db import models
from clients.models import Client

class ServiceType(models.TextChoices):
    HOUSING = 'HOUSING', 'Housing/Colocation'
    TELECOM = 'TELECOM', 'Telecom / Internet'
    APP_DEV = 'APP_DEV', 'Desarrollo de Software'
    OTHER = 'OTHER', 'Otros Servicios'

class ServiceCatalog(models.Model):
    internal_code = models.CharField(max_length=100, verbose_name="Código Referencia Interna", blank=True, null=True)
    name = models.CharField(max_length=255, verbose_name="Servicio")
    description = models.TextField(verbose_name="Descripción", blank=True, null=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices, default=ServiceType.OTHER, blank=True, null=True)
    client_taxes = models.CharField(max_length=255, verbose_name="Impuestos del Cliente", blank=True, null=True)
    base_cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo Base", default=0.00)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Base", default=0.00)

    class Meta:
        ordering = ['name']
        verbose_name = "Catálogo de Servicio"
        verbose_name_plural = "Catálogo de Servicios"

    def __str__(self):
        return self.name

class ClientService(models.Model):
    STATUS_CHOICES = [
        ('PROSPECTING', 'Prospección'),
        ('CONTACTED', 'Contactado'),
        ('FIRST_MEETING', 'Primera Cita'),
        ('OFFERED', 'Ofertado'),
        ('FOLLOW_UP', 'Seguimiento'),
        ('CLOSING_MEETING', 'Cita de Cierre'),
        ('DEMO', 'Demo'),
        ('CONTRACT_SIGNED', 'Firma de Contrato'),
        ('BACKLOG', 'Backlog'),
        ('INSTALLED', 'Instalado'),
        ('LOST', 'Negocio Perdido'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='services')
    service = models.ForeignKey(ServiceCatalog, on_delete=models.PROTECT, related_name='instances')
    
    # Technical details
    ip_address = models.GenericIPAddressField(protocol='both', unpack_ipv4=False, blank=True, null=True, verbose_name="Dirección IP Asignada")
    rack_space = models.CharField(max_length=100, blank=True, null=True, verbose_name="Espacio en Rack")
    bandwidth = models.CharField(max_length=100, blank=True, null=True, verbose_name="Velocidad (Mbps)")
    service_location = models.CharField(max_length=255, verbose_name="Ubicación del Servicio", blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROSPECTING')
    agreed_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Acordado (MRC)")
    start_date = models.DateField(verbose_name="Fecha de Inicio")
    end_date = models.DateField(verbose_name="Fecha de Fin", blank=True, null=True)
    
    # Legacy DB Fields
    project_type = models.CharField(max_length=100, verbose_name="Tipo de Proyecto", blank=True, null=True)
    nrc = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="NRC", blank=True, null=True, default=0.00)
    management_type = models.CharField(max_length=100, verbose_name="Tipo de Gestión", blank=True, null=True)
    call_result = models.CharField(max_length=255, verbose_name="Resultado de Llamadas", blank=True, null=True)

    notes = models.TextField(blank=True, null=True, verbose_name="Notas")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Determine if this is a change to status
        is_new = self.pk is None
        old_status = None
        if not is_new:
            try:
                old_instance = ClientService.objects.get(pk=self.pk)
                old_status = old_instance.status
            except ClientService.DoesNotExist:
                pass
        
        # Save current instance
        super().save(*args, **kwargs)
        
        # Sync with client if status changed or new service
        if is_new or old_status != self.status:
            client = self.client
            # Sync to active_status or prospect_status depending on current classification
            if client.classification == 'ACTIVE':
                client.active_status = self.status
            else:
                # If it's a prospect, we try to map to prospect_status if it exists there
                # Otherwise we might upgrade the client or just set it if we want full sync
                client.prospect_status = self.status
            
            # To be thorough, if a service becomes INSTALLED, CONTRACT_SIGNED or BACKLOG, 
            # maybe the client should be considered ACTIVE? 
            # But let's stick to the user's specific request about the "estado" (status).
            client.save()

    def __str__(self):
        return f"{self.client.name} - {self.service.name}"

class WorkOrder(models.Model):
    client_service = models.OneToOneField(ClientService, on_delete=models.CASCADE, related_name='work_order')
    order_number = models.CharField(max_length=100, verbose_name="Orden de Instalación #")
    login = models.CharField(max_length=255, verbose_name="Login")
    estimated_date = models.DateTimeField(verbose_name="Fecha y Hora Estimada Instalación")
    observations = models.TextField(blank=True, null=True, verbose_name="Observaciones")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Órdenes de Trabajo"

    def __str__(self):
        return f"{self.order_number} - {self.client_service.client.name}"
