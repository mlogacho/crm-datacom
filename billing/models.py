"""
Modelos de la app de facturación.

- Invoice: factura emitida a un cliente.
- InvoiceItem: ítem de línea dentro de una factura.
- BillingRecord: registro mensual de cargos MRC/NRC por cliente.
"""
from django.db import models
from clients.models import Client

MONTH_CHOICES = [
    (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
    (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
    (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre'),
]


class Invoice(models.Model):
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
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255, verbose_name="Descripción")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.description} ({self.invoice.invoice_number})"


class BillingRecord(models.Model):
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
