from django.db import models
from clients.models import Client

class ServiceType(models.TextChoices):
    HOUSING = 'HOUSING', 'Housing/Colocation'
    TELECOM = 'TELECOM', 'Telecom / Internet'
    APP_DEV = 'APP_DEV', 'Desarrollo de Software'
    OTHER = 'OTHER', 'Otros Servicios'

class ServiceCatalog(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre del Servicio")
    description = models.TextField(verbose_name="Descripción", blank=True, null=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices, default=ServiceType.OTHER)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Base", default=0.00)

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
    bandwidth = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ancho de Banda")
    
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

    def __str__(self):
        return f"{self.client.name} - {self.service.name}"
