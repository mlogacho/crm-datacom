from django.db import models

class ClientType(models.TextChoices):
    HOUSING = 'HOUSING', 'Housing'
    TELECOM = 'TELECOM', 'Telecomunicaciones'
    APP_DEV = 'APP_DEV', 'Desarrollo de Apps'
    OTHER = 'OTHER', 'Otro'

class ClientClassification(models.TextChoices):
    PROSPECT = 'PROSPECT', 'Prospecto'
    ACTIVE = 'ACTIVE', 'Cliente Activo'

class ProspectStatus(models.TextChoices):
    FIRST_MEETING = 'FIRST_MEETING', 'Primera Cita'
    CONTACTED = 'CONTACTED', 'Contactado'
    OFFERED = 'OFFERED', 'Ofertado'
    FOLLOW_UP = 'FOLLOW_UP', 'Seguimiento'
    CLOSING_MEETING = 'CLOSING_MEETING', 'Cita Cierre'
    ADJUDICATED = 'ADJUDICATED', 'Adjudicado'
    TDR_ELABORATION = 'TDR_ELABORATION', 'Elaboración de TDR'
    LOST_DEAL = 'LOST_DEAL', 'Negocio Perdido'

class Client(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre Comercial")
    legal_name = models.CharField(max_length=255, verbose_name="Razón Social", blank=True, null=True)
    tax_id = models.CharField(max_length=50, verbose_name="RUC/NIT", unique=True)
    classification = models.CharField(max_length=20, choices=ClientClassification.choices, default=ClientClassification.PROSPECT, verbose_name="Clasificación")
    prospect_status = models.CharField(max_length=30, choices=ProspectStatus.choices, blank=True, null=True, verbose_name="Estado de Prospecto")
    email = models.EmailField(verbose_name="Correo Principal")
    phone = models.CharField(max_length=50, verbose_name="Teléfono Principal", blank=True, null=True)
    address = models.TextField(verbose_name="Dirección", blank=True, null=True)
    client_type = models.CharField(max_length=20, choices=ClientType.choices, default=ClientType.OTHER)
    
    # Legacy DB Fields
    region = models.CharField(max_length=100, verbose_name="Región", blank=True, null=True)
    city = models.CharField(max_length=100, verbose_name="Ciudad", blank=True, null=True)
    segment = models.CharField(max_length=100, verbose_name="Segmento", blank=True, null=True)
    account_manager = models.CharField(max_length=255, verbose_name="Gerente de Cuenta", blank=True, null=True)
    
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255, verbose_name="Nombre")
    position = models.CharField(max_length=100, verbose_name="Cargo", blank=True, null=True)
    email = models.EmailField(verbose_name="Correo")
    phone = models.CharField(max_length=50, verbose_name="Teléfono", blank=True, null=True)
    is_primary = models.BooleanField(default=False, verbose_name="Contacto Principal")

    def __str__(self):
        return f"{self.name} - {self.client.name}"


class ClientStatusHistory(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=30, choices=ProspectStatus.choices, verbose_name="Estado")
    reason = models.TextField(verbose_name="Razón")
    evidence = models.FileField(upload_to='prospect_evidence/', blank=True, null=True, verbose_name="Evidencia")
    nrc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="NRC")
    mrc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="MRC")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")

    def __str__(self):
        return f"{self.client.name} - {self.get_status_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
