"""Billing API views.

This module provides endpoints to manage invoices, invoice items,
monthly billing records, and bulk billing imports.
"""

import uuid
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Invoice, InvoiceItem, BillingRecord
from .serializers import InvoiceSerializer, InvoiceItemSerializer, BillingRecordSerializer
from clients.models import Client
from services.models import ServiceCatalog


class InvoiceViewSet(viewsets.ModelViewSet):
    """CRUD API for customer invoices.

    Commercial action:
    - Manage receivables and invoice lifecycle for clients.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer


class InvoiceItemViewSet(viewsets.ModelViewSet):
    """CRUD API for invoice line items.

    Commercial action:
    - Detail billable services and amounts per invoice.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = InvoiceItem.objects.all()
    serializer_class = InvoiceItemSerializer


class BillingRecordViewSet(viewsets.ModelViewSet):
    """CRUD API for monthly billing records by client and service.

    Commercial action:
    - Track recurring billing statements and periodized revenue.

    Response type:
    - JSON payloads through DRF serializers.
    """

    serializer_class = BillingRecordSerializer

    def get_queryset(self):
        """Return filtered billing records by month, year, and client name."""
        qs = BillingRecord.objects.select_related('client', 'service_catalog').all()
        mes = self.request.query_params.get('mes')
        anio = self.request.query_params.get('anio')
        client = self.request.query_params.get('client')
        if mes:
            qs = qs.filter(mes=mes)
        if anio:
            qs = qs.filter(anio=anio)
        if client:
            qs = qs.filter(client__name__icontains=client)
        return qs


class BulkCreateBillingView(APIView):
    """
    Receive parsed billing rows from frontend and upsert monthly records.

    Commercial action:
    - Speed up monthly billing ingestion from external spreadsheets.

    Response type:
    - JSON summary with created, updated, and error counters.
    """

    def post(self, request):
        """Validate and bulk upsert billing rows into BillingRecord."""
        records_data = request.data.get('records', [])
        if not records_data:
            return Response(
                {'error': 'No se enviaron registros'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        updated_count = 0
        errors = []
        clients_created = []

        for idx, row in enumerate(records_data):
            row_num = idx + 1
            try:
                # --- Client ---
                client_name = str(row.get('client_name', '')).strip()
                if not client_name:
                    errors.append(f"Fila {row_num}: Nombre de cliente vacío")
                    continue

                client = Client.objects.filter(name__iexact=client_name).first()
                if not client:
                    client = Client.objects.filter(name__icontains=client_name).first()
                if not client:
                    # Auto-create the client with placeholder values
                    temp_tax_id = f"FACT-{uuid.uuid4().hex[:10].upper()}"
                    client = Client.objects.create(
                        name=client_name,
                        tax_id=temp_tax_id,
                        email='',
                        classification='ACTIVE',
                    )
                    clients_created.append(client_name)

                # --- Service Catalog (optional) ---
                service_catalog = None
                service_name = str(row.get('service_name', '') or '').strip()
                service_label = service_name  # always store the raw text
                if service_name:
                    service_catalog = ServiceCatalog.objects.filter(name__iexact=service_name).first()
                    if not service_catalog:
                        service_catalog = ServiceCatalog.objects.filter(name__icontains=service_name).first()

                # --- Amounts ---
                try:
                    service_amount = Decimal(
                        str(row.get('service_amount', 0)).replace(',', '.')
                    )
                except (InvalidOperation, ValueError):
                    service_amount = Decimal('0')

                # --- Mes ---
                try:
                    mes = int(row.get('mes', 0))
                    if mes < 1 or mes > 12:
                        raise ValueError()
                except (ValueError, TypeError):
                    errors.append(f"Fila {row_num}: Mes inválido '{row.get('mes')}'")
                    continue

                # --- Año ---
                try:
                    anio = int(row.get('anio', 0))
                    if anio < 1900 or anio > 2100:
                        raise ValueError()
                except (ValueError, TypeError):
                    errors.append(f"Fila {row_num}: Año inválido '{row.get('anio')}'")
                    continue

                _, was_created = BillingRecord.objects.update_or_create(
                    client=client,
                    service_label=service_label,
                    mes=mes,
                    anio=anio,
                    defaults={
                        'service_catalog': service_catalog,
                        'service_amount': service_amount,
                        'observations': str(row.get('observations', '') or '').strip(),
                        'factura': str(row.get('factura', '') or '').strip(),
                        'credito': str(row.get('credito', '') or '').strip(),
                    },
                )
                if was_created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as e:
                errors.append(f"Fila {row_num}: Error inesperado — {str(e)}")

        response_status = (
            status.HTTP_201_CREATED if (created_count + updated_count) > 0
            else status.HTTP_400_BAD_REQUEST
        )
        return Response(
            {
                'created': created_count,
                'updated': updated_count,
                'errors': errors,
                'total_rows': len(records_data),
                'clients_created': clients_created,
            },
            status=response_status,
        )
