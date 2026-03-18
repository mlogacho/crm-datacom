"""
Clients App Models

This module defines the core data models for the CRM's customer management system,
including prospects, clients, their contacts, and status tracking throughout the sales pipeline.
"""

from django.db import models

# class ClientType(models.TextChoices):
#     HOUSING = 'HOUSING', 'Housing'
#     TELECOM = 'TELECOM', 'Telecomunicaciones'
#     APP_DEV = 'APP_DEV', 'Desarrollo de Apps'
#     OTHER = 'OTHER', 'Otro'

class ClientClassification(models.TextChoices):
    """
    Classification choices for clients.
    
    A client can be classified as either a prospect (potential customer) or an active client
    (customer with contracted services).
    """
    PROSPECT = 'PROSPECT', 'Prospecto'
    ACTIVE = 'ACTIVE', 'Cliente Activo'

class ProspectStatus(models.TextChoices):
    """
    Status choices for prospect clients throughout the sales pipeline.
    
    Represents the progression of a prospect through the commercial process,
    from initial contact to deal closure or loss.
    """
    FIRST_MEETING = 'FIRST_MEETING', 'Primera Cita'
    CONTACTED = 'CONTACTED', 'Contactado'
    OFFERED = 'OFFERED', 'Ofertado'
    FOLLOW_UP = 'FOLLOW_UP', 'Seguimiento'
    CLOSING_MEETING = 'CLOSING_MEETING', 'Cita Cierre'
    ADJUDICATED = 'ADJUDICATED', 'Adjudicado'
    TDR_ELABORATION = 'TDR_ELABORATION', 'Elaboración de TDR'
    LOST_DEAL = 'LOST_DEAL', 'Negocio Perdido'

class ActiveStatus(models.TextChoices):
    """
    Status choices for active clients in the service delivery pipeline.
    
    Represents the progression of an active client through service provisioning,
    from prospection to billing and service lifecycle management.
    """
    PROSPECTING = 'PROSPECTING', 'Prospección'
    CONTACTED = 'CONTACTED', 'Contactado'
    FIRST_MEETING = 'FIRST_MEETING', 'Primera Cita'
    OFFERED = 'OFFERED', 'Ofertado'
    FOLLOW_UP = 'FOLLOW_UP', 'Seguimiento'
    CLOSING_MEETING = 'CLOSING_MEETING', 'Cita de Cierre'
    DEMO = 'DEMO', 'Demo'
    CONTRACT_SIGNED = 'CONTRACT_SIGNED', 'Firma de Contrato'
    BACKLOG = 'BACKLOG', 'Backlog'
    INSTALLED = 'INSTALLED', 'Instalado'
    BILLED = 'BILLED', 'Facturado'
    NEW_SERVICE = 'NEW_SERVICE', 'Servicio Nuevo'
    DOWN_GRADE = 'DOWN_GRADE', 'Down Grade'
    UP_GRADE = 'UP_GRADE', 'Up Grade'
    LOST = 'LOST', 'Negocio Perdido'

class Client(models.Model):
    """
    Core Client model representing a prospect or active customer.
    
    This model stores essential information about organizations (businesses) or individuals
    engaging with DataCom for services. It tracks both commercial and operational details
    required for sales management and service delivery.
    
    Fields:
        name (str): Commercial/trading name of the client
        legal_name (str): Full legal/registered business name
        tax_id (str): Tax identification number (RUC/NIT), unique identifier
        classification (str): Whether client is a prospect or active customer
        prospect_status (str): Current status in the sales pipeline (if prospect)
        active_status (str): Current status in the service delivery pipeline (if active)
        email (str): Primary contact email for communications
        phone (str): Primary contact phone number
        address (str): Physical address of the organization
        client_type_new (ForeignKey): Reference to the primary service type from ServiceCatalog
        region (str): Geographic region where client is located
        city (str): City/locality of client operations
        segment (str): Market segment classification (legacy field)
        service_location (str): Physical location where services are delivered
        account_manager (str): Name of assigned sales/account manager
        is_active (bool): Whether client record is currently active
        created_at (datetime): Record creation timestamp
        updated_at (datetime): Last modification timestamp
    
    Relations:
        - contacts: Related Contact records (one-to-many)
        - services: Related ClientService records (one-to-many)
        - invoices: Related Invoice records (one-to-many)
        - tickets: Related Ticket records (one-to-many)
        - status_history: Related ClientStatusHistory records (one-to-many)
    """
    name = models.CharField(max_length=255, verbose_name="Nombre Comercial")
    legal_name = models.CharField(max_length=255, verbose_name="Razón Social", blank=True, null=True)
    tax_id = models.CharField(max_length=50, verbose_name="RUC/NIT", unique=True)
    classification = models.CharField(max_length=20, choices=ClientClassification.choices, default=ClientClassification.PROSPECT, verbose_name="Clasificación")
    prospect_status = models.CharField(max_length=30, choices=ProspectStatus.choices, blank=True, null=True, verbose_name="Estado de Prospecto")
    active_status = models.CharField(max_length=30, choices=ActiveStatus.choices, blank=True, null=True, verbose_name="Estado de Activo")
    email = models.EmailField(verbose_name="Correo Principal")
    phone = models.CharField(max_length=50, verbose_name="Teléfono Principal", blank=True, null=True)
    address = models.TextField(verbose_name="Dirección", blank=True, null=True)
    client_type_new = models.ForeignKey('services.ServiceCatalog', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Tipo de Cliente")
    # Old field to be replaced
    # client_type = models.CharField(max_length=20, choices=ClientType.choices, default=ClientType.OTHER)
    
    # Legacy DB Fields
    region = models.CharField(max_length=100, verbose_name="Región", blank=True, null=True)
    city = models.CharField(max_length=100, verbose_name="Ciudad", blank=True, null=True)
    segment = models.CharField(max_length=100, verbose_name="Segmento", blank=True, null=True)
    service_location = models.CharField(max_length=255, verbose_name="Ubicación del Servicio", blank=True, null=True)
    account_manager = models.CharField(max_length=255, verbose_name="Gerente de Cuenta", blank=True, null=True)
    
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    """
    Contact model representing a person at a client organization.
    
    Stores detailed information about individual contacts (people) at client companies,
    allowing the sales team to maintain multiple communication points per client.
    
    Fields:
        client (ForeignKey): Reference to the parent Client
        name (str): Full name of the contact person
        position (str): Job title or role at the organization
        email (str): Email address for this contact
        phone (str): Phone number for this contact
        is_primary (bool): Whether this is the primary/preferred contact
        
    Relations:
        - client: Parent Client model (many-to-one)
    """
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255, verbose_name="Nombre")
    position = models.CharField(max_length=100, verbose_name="Cargo", blank=True, null=True)
    email = models.EmailField(verbose_name="Correo")
    phone = models.CharField(max_length=50, verbose_name="Teléfono", blank=True, null=True)
    is_primary = models.BooleanField(default=False, verbose_name="Contacto Principal")

    def __str__(self):
        return f"{self.name} - {self.client.name}"


class ClientStatusHistory(models.Model):
    """
    ClientStatusHistory model tracking status changes throughout the client lifecycle.
    
    Maintains an audit trail of all status transitions for a client, including the reason,
    supporting evidence, and financial implications (NRC, MRC). This allows sales management
    to review the progression and history of each opportunity.
    
    Fields:
        client (ForeignKey): Reference to the affected Client
        status (str): The status at this point in time
        reason (str): Why the status changed
        evidence (FileField): Supporting documentation (quotes, emails, etc.)
        nrc (Decimal): Non-Recurring Charge associated with this status
        mrc (Decimal): Monthly Recurring Charge (revenue value)
        custom_date (datetime): Date the status change occurred (if not system date)
        created_at (datetime): Timestamp of record creation
        
    Relations:
        - client: Parent Client model (many-to-one)
    """
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=100, verbose_name="Estado")
    reason = models.TextField(verbose_name="Razón")
    evidence = models.FileField(upload_to='prospect_evidence/', blank=True, null=True, verbose_name="Evidencia")
    nrc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="NRC")
    mrc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="MRC")
    custom_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha Reportada")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha Sistema")

    def __str__(self):
        return f"{self.client.name} - {self.status} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

