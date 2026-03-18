"""
Services App Models

This module defines the service catalog and client service management.
Includes service types, pricing, technical configuration, and work order tracking.
"""

from django.db import models
from clients.models import Client

class ServiceType(models.TextChoices):
    """
    Service type classifications available in the DataCom catalog.
    
    Represents the different categories of services offered:
    - HOUSING: Data center colocation services
    - TELECOM: Internet and telecommunications services
    - APP_DEV: Custom software development
    - OTHER: Miscellaneous services
    """
    HOUSING = 'HOUSING', 'Housing/Colocation'
    TELECOM = 'TELECOM', 'Telecom / Internet'
    APP_DEV = 'APP_DEV', 'Desarrollo de Software'
    OTHER = 'OTHER', 'Otros Servicios'

class ServiceCatalog(models.Model):
    """
    ServiceCatalog model defining available services and their pricing.
    
    Maintains the master catalog of services that DataCom offers.
    Used as reference for quoting, service instances, and revenue tracking.
    
    Fields:
        internal_code (str): Internal reference code for accounting/reporting
        name (str): Marketing/commercial name of the service
        description (str): Detailed description of what service includes
        service_type (str): Classification from ServiceType choices
        client_taxes (str): Applicable taxes or special tax treatment
        base_cost (Decimal): DataCom's cost for providing service
        base_price (Decimal): Standard list/base price charged to clients
        
    Relations:
        - instances: Related ClientService records using this catalog service
        
    Notes:
        - Ordered by name for UI display
        - Prices are in two decimals (currency format)
    """
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
    """
    ClientService model representing an instance of a service sold to a client.
    
    Links a client to a service from the catalog along with configuration details,
    pricing, and lifecycle status. Each ClientService tracks a distinct service 
    instance or contract with its own timeline and technical parameters.
    
    Status Flow:
        PROSPECTING → CONTACTED → FIRST_MEETING → OFFERED → FOLLOW_UP → 
        CLOSING_MEETING → DEMO → CONTRACT_SIGNED → BACKLOG → INSTALLED → BILLED
        (or LOST at any stage before installation)
    
    Fields:
        client (ForeignKey): Reference to the Client purchasing the service
        service (ForeignKey): Reference to the ServiceCatalog definition
        
        Technical Configuration:
            ip_address (str): IP address assigned to this instance
            rack_space (str): Physical rack location (if applicable)
            bandwidth (str): Bandwidth/speed allocation
            service_location (str): Geographic location of service delivery
            
        Pricing & Scheduling:
            status (str): Current lifecycle status
            agreed_price (Decimal): Monthly Recurring Charge (MRC) negotiated with client
            start_date (date): Service activation/installation date
            end_date (date): Contract termination date (if applicable)
            nrc (Decimal): Non-Recurring Charge (one-time setup fee)
            
        Additional Details:
            project_type (str): Type of project (legacy field)
            management_type (str): How service is managed/supported
            call_result (str): Notes from sales calls/interactions
            notes (str): General notes about the service instance
            created_at (datetime): Record creation timestamp
            updated_at (datetime): Last modification timestamp
            
    Relations:
        - client: Parent Client model (many-to-one)
        - service: ServiceCatalog reference (many-to-one)
        - work_order: Related WorkOrder planning installation
        
    Business Logic:
        - Automatically syncs status changes back to parent Client's active_status
        - Prevents ServiceCatalog deletion if instances exist
        - Tracks both one-time (NRC) and recurring (MRC) revenue
    """
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
        """Override save to sync status changes to parent Client."""
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
    """
    WorkOrder model for planning and tracking service installation.
    
    Represents the operational work order for physically installing or provisioning
    a service instance. Links to technical installation teams and scheduling.
    
    Fields:
        client_service (OneToOneField): Reference to the ClientService being installed
        order_number (str): Unique work order number for operational tracking
        login (str): System/account login created for this installation
        estimated_date (datetime): Targeted installation date and time
        observations (str): Technical notes for installation team
        created_at (datetime): Timestamp of work order creation
        
    Relations:
        - client_service: Related ClientService (one-to-one)
        
    Notes:
        - One WorkOrder per ClientService (one-to-one relationship)
        - Used for operations team to coordinate activations
    """
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

