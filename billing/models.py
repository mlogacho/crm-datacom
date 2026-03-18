"""
Billing App Models

This module defines invoice and billing record management for tracking 
client charges, payments, and financial transactions.
"""

from django.db import models
from clients.models import Client

MONTH_CHOICES = [
    (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
    (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
    (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre'),
]


class Invoice(models.Model):
    """
    Invoice model representing a customer billing document.
    
    Represents formal invoices issued to clients, tracking amounts, dates,
    and payment status for accounting and receivables management.
    
    Fields:
        client (ForeignKey): Reference to the Client being billed
        invoice_number (str): Unique invoice identifier (typically fiscal-compliance required)
        issue_date (date): Date invoice was issued
        due_date (date): Payment deadline
        subtotal (Decimal): Amount before taxes
        tax_amount (Decimal): Total taxes applied
        total_amount (Decimal): Final amount due (subtotal + tax)
        status (str): Payment status (PENDING, PAID, OVERDUE, CANCELLED)
        notes (str): Internal notes or special instructions
        created_at (datetime): Record creation timestamp
        updated_at (datetime): Last modification timestamp
        
    Relations:
        - client: Parent Client model (many-to-one)
        - items: Related InvoiceItem records (one-to-many)
        
    Status Workflow:
        PENDING → PAID (or OVERDUE if not paid by due_date)
        Any status → CANCELLED (if voided)
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('PAID', 'Pagado'),
        ('OVERDUE', 'Vencido'),
        ('CANCELLED', 'Anulado'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=100, unique=True, verbose_name="Número de Factura")

    issue_date = models.DateField(verbose_name="Fecha de Emisión")
    due_date = models.DateField(verbose_name="Fecha de Vencimiento")

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Factura {self.invoice_number} - {self.client.name}"


class InvoiceItem(models.Model):
    """
    InvoiceItem model representing a line item on an invoice.
    
    Details the individual services or charges that make up the total invoice amount.
    Each item includes quantity, unit price, and computed total.
    
    Fields:
        invoice (ForeignKey): Reference to parent Invoice
        description (str): What is being charged (service name, product, etc.)
        quantity (Decimal): Number of units/months charged
        unit_price (Decimal): Price per unit
        total_price (Decimal): Computed as quantity × unit_price
        
    Relations:
        - invoice: Parent Invoice model (many-to-one)
        
    Notes:
        - total_price is automatically calculated on save
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255, verbose_name="Descripción")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        """Override save to compute total_price."""
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.description} ({self.invoice.invoice_number})"


class BillingRecord(models.Model):
    """
    BillingRecord model for tracking monthly billing entries per client and service.
    
    Maintains a history of monthly billing records for accounting and revenue tracking.
    Automatically calculates IVA (15% VAT) and totals on save.
    
    Fields:
        client (ForeignKey): Reference to the Client
        service_catalog (ForeignKey): Reference to ServiceCatalog (optional)
        service_label (str): Name/label of the service billed
        service_amount (Decimal): Amount before IVA
        iva_amount (Decimal): 15% IVA (automatically calculated)
        total (Decimal): service_amount + iva_amount (automatically calculated)
        observations (str): Notes about this billing period
        factura (str): Associated invoice/bill reference
        credito (str): Credit note reference if applicable
        mes (int): Month (1-12) for this billing record
        anio (int): Year for this billing record
        created_at (datetime): Record creation timestamp
        updated_at (datetime): Last modification timestamp
        
    Relations:
        - client: Parent Client model (many-to-one)
        - service_catalog: ServiceCatalog model (many-to-one, optional)
        
    Business Logic:
        - Automatically calculates IVA as 15% of service_amount
        - Automatically calculates total as service_amount + iva_amount
        - Ordered by year (descending), month (descending), client name
        - Each record represents one month of charges for one client/service combination
    """
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name='billing_records',
        verbose_name="Cliente"
    )
    service_catalog = models.ForeignKey(
        'services.ServiceCatalog', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Servicio"
    )
    service_label = models.CharField(
        max_length=255, blank=True, default='', verbose_name="Nombre Servicio"
    )
    service_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Servicio sin IVA"
    )
    iva_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="15% IVA"
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Total"
    )
    observations = models.TextField(blank=True, null=True, verbose_name="Observaciones")
    factura = models.CharField(max_length=200, blank=True, null=True, verbose_name="Factura")
    credito = models.CharField(max_length=200, blank=True, null=True, verbose_name="Crédito")
    mes = models.IntegerField(choices=MONTH_CHOICES, verbose_name="Mes")
    anio = models.IntegerField(verbose_name="Año")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Override save to automatically calculate IVA (15%) and total."""
        from decimal import Decimal
        amount = Decimal(str(self.service_amount or 0))
        self.iva_amount = round(amount * Decimal('0.15'), 2)
        self.total = round(amount + self.iva_amount, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.get_mes_display()} {self.anio}"

    class Meta:
        ordering = ['-anio', '-mes', 'client__name']
        verbose_name = "Registro de Facturación"
        verbose_name_plural = "Registros de Facturación"

