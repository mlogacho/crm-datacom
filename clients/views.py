"""Client management API views.

This module exposes commercial operations for CRM client lifecycle management,
including prospect status tracking, active client status updates, contacts,
and bulk import from CSV files.
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F, Value, CharField
from django.db.models.functions import Concat
from .models import Client, Contact, ClientStatusHistory
from services.models import ServiceCatalog, ClientService
from .serializers import ClientSerializer, ContactSerializer, ClientStatusHistorySerializer
import csv
import io
import uuid
from datetime import date
import re


def resolve_account_manager_user(manager_name):
    """Resolve an account manager name to a unique User match using full-name icontains."""
    normalized_name = " ".join((manager_name or "").split())
    if not normalized_name:
        return None

    try:
        candidates = list(
            User.objects.annotate(
                full_name=Concat(
                    F('first_name'),
                    Value(' '),
                    F('last_name'),
                    output_field=CharField(),
                )
            ).filter(full_name__icontains=normalized_name)[:2]
        )
        return candidates[0] if len(candidates) == 1 else None
    except Exception:
        return None

class ClientViewSet(viewsets.ModelViewSet):
    """CRUD API for clients and commercial status transitions.

    Commercial action:
    - Manage client records (prospects and active customers).
    - Register status updates in history through custom actions.

    Permissions:
    - Global API permission policy is `IsAuthenticated` from DRF settings.
    - Superusers can access all clients.
    - Sales roles are filtered to assigned account manager records.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer

    def get_queryset(self):
        """Return clients visible to the authenticated user role."""
        user = self.request.user
        queryset = Client.objects.all().order_by('-created_at')
        
        if user.is_superuser:
            return queryset
            
        try:
            profile = user.profile
            if profile.role:
                role_name = profile.role.name
                if role_name in ['Ventas', 'Gerente de Cuenta']:
                    return queryset.filter(account_manager=user)
                if role_name == 'Asistente de Gerencia':
                    return queryset
        except Exception:
            pass
            
        return queryset

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def update_prospect_status(self, request, pk=None):
        """Update prospect status and create a status history audit record.

        Commercial action:
        - Moves a prospect in the sales pipeline and stores reason/evidence.

        Response type:
        - JSON with created history object.
        """
        client = self.get_object()
        
        status_val = request.data.get('status')
        reason = request.data.get('reason')
        evidence = request.FILES.get('evidence')
        nrc = request.data.get('nrc')
        mrc = request.data.get('mrc')
        custom_date = request.data.get('custom_date')
        
        if not status_val or not reason:
            return Response({'error': 'Status and reason are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update client status
        client.prospect_status = status_val
        client.save()
        
        # Create history record
        history = ClientStatusHistory.objects.create(
            client=client,
            status=status_val,
            reason=reason,
            evidence=evidence,
            nrc=nrc if nrc else None,
            mrc=mrc if mrc else None,
            custom_date=custom_date if custom_date else None
        )
        
        serializer = ClientStatusHistorySerializer(history)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def update_active_status(self, request, pk=None):
        """Update active client status and persist commercial traceability.

        Commercial action:
        - Records active lifecycle transitions and optional sub-status for
            new services.

        Response type:
        - JSON with created history object.
        """
        client = self.get_object()
        
        status_val = request.data.get('status')
        sub_status = request.data.get('sub_status')
        reason = request.data.get('reason')
        evidence = request.FILES.get('evidence')
        nrc = request.data.get('nrc')
        mrc = request.data.get('mrc')
        custom_date = request.data.get('custom_date')
        
        if not status_val or not reason:
            return Response({'error': 'Status and reason are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update client status
        client.active_status = status_val
        client.save()
        
        # Format the combined status for history if NEW_SERVICE and sub_status is provided
        history_status = f"Servicio Nuevo - {sub_status}" if status_val == 'NEW_SERVICE' and sub_status else status_val

        # Create history record
        history = ClientStatusHistory.objects.create(
            client=client,
            status=history_status,
            reason=reason,
            evidence=evidence,
            nrc=nrc if nrc else None,
            mrc=mrc if mrc else None,
            custom_date=custom_date if custom_date else None
        )
        
        serializer = ClientStatusHistorySerializer(history)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ContactViewSet(viewsets.ModelViewSet):
    """CRUD API for client contacts used by the sales team.

    Commercial action:
    - Maintain contact people per client account.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

class ImportClientsView(APIView):
    """Import clients, contacts, and services from a CSV file.

    Commercial action:
    - Accelerates onboarding of leads and active customer portfolio from
      spreadsheet exports.

    Permissions:
    - Uses the global authenticated API permission policy.

    Response type:
    - JSON summary with counts and error details.
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        """Process uploaded CSV and create/update CRM entities."""
        if 'file' not in request.FILES:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return Response({"error": "File is not CSV type."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Decode file safely (handles both UTF-8 w/ BOM and Excel Latin-1)
            raw_data = csv_file.read()
            try:
                data_set = raw_data.decode('utf-8-sig')
            except UnicodeDecodeError:
                data_set = raw_data.decode('latin-1')
                
            io_string = io.StringIO(data_set)
            
            # Detect delimiter (Excel en español suele usar punto y coma)
            sample = io_string.readline()
            io_string.seek(0)
            delimiter_char = ';' if sample.count(';') > sample.count(',') else ','

            # Read CSV
            reader = csv.DictReader(io_string, delimiter=delimiter_char)
            
            # Normalize headers
            headers = [h.strip().upper() for h in (reader.fieldnames or [])]
            reader.fieldnames = headers

            def get_col(row_dict, possible_keys):
                for k in possible_keys:
                    if k in row_dict:
                        return str(row_dict[k] or '').strip()
                # Check for substring matches in keys just in case
                for key_in_dict in row_dict.keys():
                    if key_in_dict and any(pk in key_in_dict for pk in possible_keys):
                         return str(row_dict[key_in_dict] or '').strip()
                return ''

            STATUS_MAPPING = {
                'PROSPECCIÓN': 'PROSPECTING',
                'CONTACTADO': 'CONTACTED',
                'PRIMERA CITA': 'FIRST_MEETING',
                'CITA': 'FIRST_MEETING',
                'OFERTADO': 'OFFERED',
                'SEGUIMIENTO': 'FOLLOW_UP',
                'CITA DE CIERRE': 'CLOSING_MEETING',
                'CIERRE': 'CLOSING_MEETING',
                'DEMO': 'DEMO',
                'FIRMA DE CONTRATO': 'CONTRACT_SIGNED',
                'CONTRATO': 'CONTRACT_SIGNED',
                'GANADO': 'CONTRACT_SIGNED',
                'INSTALADO': 'INSTALLED',
                'ACTIVO': 'INSTALLED',
                'BACKLOG': 'BACKLOG',
                'PERDIDO': 'LOST',
                'NEGOCIO PERDIDO': 'LOST',
            }

            from decimal import Decimal, InvalidOperation

            def clean_decimal(value):
                if not value: return Decimal('0.00')
                # Remove currency symbols, spaces and any non-numeric character except . and ,
                cleaned = re.sub(r'[^\d.,]', '', str(value)).strip()
                if cleaned == '': return Decimal('0.00')
                try:
                    # Detect Latin American format: comma is decimal separator, dot is thousands separator
                    # Cases:
                    #   "1.500,75"  -> dot before comma -> LA format -> "1500.75"
                    #   "1,500.75"  -> comma before dot -> US format -> "1500.75"
                    #   "1500,75"   -> only comma       -> LA format -> "1500.75"
                    #   "1500.75"   -> only dot         -> US format -> "1500.75"
                    #   "1.500"     -> only dot, no decimals -> thousands sep -> "1500"
                    #   "1,500"     -> only comma, no decimals -> thousands sep -> "1500"
                    has_dot   = '.' in cleaned
                    has_comma = ',' in cleaned

                    if has_dot and has_comma:
                        last_dot   = cleaned.rfind('.')
                        last_comma = cleaned.rfind(',')
                        if last_comma > last_dot:
                            # LA format: 1.500,75 -> remove dots, replace last comma with dot
                            cleaned = cleaned.replace('.', '').replace(',', '.')
                        else:
                            # US format: 1,500.75 -> remove commas
                            cleaned = cleaned.replace(',', '')
                    elif has_comma and not has_dot:
                        # Only comma present - treat as decimal separator (LA format)
                        # Unless it appears multiple times (thousands separator like "1,500,000")
                        if cleaned.count(',') == 1:
                            cleaned = cleaned.replace(',', '.')
                        else:
                            cleaned = cleaned.replace(',', '')
                    elif has_dot and not has_comma:
                        # Only dot present - check if it's thousands separator
                        # e.g. "1.500" has exactly 3 digits after dot -> thousands sep
                        dot_pos = cleaned.rfind('.')
                        digits_after = len(cleaned) - dot_pos - 1
                        if cleaned.count('.') > 1 or digits_after == 3:
                            cleaned = cleaned.replace('.', '')
                        # else: leave as-is (normal decimal like "750.50")

                    return Decimal(cleaned)
                except InvalidOperation:
                    return Decimal('0.00')

            created_clients = 0
            created_services = 0
            today = date.today()

            with transaction.atomic():
                # Pre-load lookup tables into memory to avoid N+1 queries per row
                user_lookup = {}
                for u in User.objects.all():
                    full = f"{u.first_name} {u.last_name}".strip().upper()
                    if full:
                        user_lookup[full] = u
                    user_lookup[u.username.upper()] = u

                client_cache = {c.name: c for c in Client.objects.all()}
                catalog_cache = {sc.name: sc for sc in ServiceCatalog.objects.all()}
                seen_contacts = set(Contact.objects.values_list('client__name', 'name'))

                for row in reader:
                    client_name = get_col(row, ['CLIENTE', 'CLIENTES', 'NOMBRE'])
                    if not client_name:
                        continue  # Skip rows without client name

                    # Extract Client Data
                    region = get_col(row, ['REGION', 'REGIÓN'])
                    city = get_col(row, ['CIUDAD'])
                    segment = get_col(row, ['SEGMENTO'])
                    service_location = get_col(row, ['UBICACION DEL SERVICIO', 'UBICACIÓN DEL SERVICIO', 'UBICACION', 'UBICACIÓN'])[:255]
                    classification_str = get_col(row, ['CLASIFICACION DEL CLIENTE', 'CLASIFICACIÓN DEL CLIENTE', 'CLASIFICACION', 'CLASIFICACIÓN']).strip().upper()
                    classification = 'ACTIVE' if 'ACTIVO' in classification_str else 'PROSPECT'
                    account_manager_text = get_col(row, ['GERENTE DE CUENTA', 'GERENTE']).strip().upper()
                    account_manager = user_lookup.get(account_manager_text)
                    detail = get_col(row, ['DETALLE', 'DETALLES'])
                    business_status_text = get_col(row, ['ESTADO DEL NEGOCIO', 'ESTADO NEGOCIO', 'ESTADO'])
                    observation = get_col(row, ['OBSERVACION', 'OBSERVACIONES', 'OBSERVACIÓN'])

                    tax_id = f"MIGRATED-{uuid.uuid4().hex[:8]}"[:50]
                    email_raw = get_col(row, ['E-MAILS', 'EMAIL', 'CORREOS', 'CORREO', 'E-MAIL'])
                    email = email_raw.split(';')[0].split(',')[0].strip() if email_raw else ""
                    if not email or '@' not in email:
                        email = "contacto@desconocido.com"

                    # Find or create Client (use in-memory cache)
                    client = client_cache.get(client_name)
                    client_created = False

                    if not client:
                        client = Client.objects.create(
                            name=client_name,
                            tax_id=tax_id,
                            email=email,
                            region=region,
                            city=city,
                            segment=segment,
                            service_location=service_location,
                            detail=detail,
                            business_status=business_status_text,
                            observation=observation,
                            classification=classification,
                            account_manager=account_manager,
                        )
                        client_cache[client_name] = client
                        client_created = True
                        created_clients += 1

                    if not client_created:
                        changed = False
                        if not client.region and region: client.region = region; changed = True
                        if not client.city and city: client.city = city; changed = True
                        if not client.segment and segment: client.segment = segment; changed = True
                        if not client.service_location and service_location: client.service_location = service_location; changed = True
                        if not client.detail and detail: client.detail = detail; changed = True
                        if not client.business_status and business_status_text: client.business_status = business_status_text; changed = True
                        if not client.observation and observation: client.observation = observation; changed = True
                        if classification_str and client.classification != classification: client.classification = classification; changed = True
                        if not client.account_manager and account_manager: client.account_manager = account_manager; changed = True
                        if changed: client.save()

                    # Contacts (use seen_contacts set to avoid per-row DB query)
                    contact_name = get_col(row, ['CONTACTO', 'NOMBRE CONTACTO'])[:255]
                    phones = get_col(row, ['TELÉFONOS', 'TELEFONOS', 'TELEFONO'])[:50]
                    if contact_name and (client_name, contact_name) not in seen_contacts:
                        Contact.objects.create(
                            client=client,
                            name=contact_name,
                            email=email,
                            phone=phones
                        )
                        seen_contacts.add((client_name, contact_name))

                    # Service Data (use catalog cache)
                    service_str = get_col(row, ['SERVICIO', 'SERVICIOS', 'P&S', 'PRODUCTO'])
                    if service_str:
                        service_cat = catalog_cache.get(service_str)
                        if not service_cat:
                            service_cat = ServiceCatalog.objects.create(
                                name=service_str,
                                description='Importado vía CSV',
                                base_price=0.00
                            )
                            catalog_cache[service_str] = service_cat

                        if not client.client_type_new:
                            client.client_type_new = service_cat
                            client.save()

                        project_type = get_col(row, ['TIPO DE PROYECTO', 'PROYECTO'])
                        estado_str = get_col(row, ['ESTADO']).upper()
                        service_status = STATUS_MAPPING.get(estado_str, 'PROSPECTING')
                        nrc = clean_decimal(get_col(row, ['NRC']))
                        mrc = clean_decimal(get_col(row, ['MRC']))
                        management_type = get_col(row, ['TIPO DE GESTION', 'TIPO DE GESTIÓN', 'GESTION'])
                        call_result = get_col(row, ['RESULTADO DE LLAMADAS', 'RESULTADO', 'RESULTADOS'])
                        obs = get_col(row, ['OBSERVACION', 'OBSERVACIONES', 'OBSERVACIÓN'])

                        ClientService.objects.create(
                            client=client,
                            service=service_cat,
                            status=service_status,
                            agreed_price=mrc,
                            nrc=nrc,
                            project_type=project_type,
                            management_type=management_type,
                            call_result=call_result,
                            notes=obs,
                            service_location=service_location,
                            start_date=today
                        )
                        created_services += 1

            return Response({
                "message": "Importación completada con éxito.",
                "clients_imported": created_clients,
                "services_imported": created_services
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Error procesando archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardStatsView(APIView):
    """Aggregate dashboard metrics server-side to avoid pagination issues."""

    def get(self, request, *args, **kwargs):
        from services.models import ClientService, ServiceCatalog
        from django.db.models import Sum, Count, Q

        user = request.user
        is_super = user.is_superuser

        # Base querysets scoped to the requesting user
        client_qs = Client.objects.all()
        service_qs = ClientService.objects.all()

        if not is_super:
            try:
                role_name = user.profile.role.name if user.profile.role else ''
            except Exception:
                role_name = ''
            if role_name in ['Ventas', 'Gerente de Cuenta']:
                client_qs = client_qs.filter(account_manager=user)
                service_qs = service_qs.filter(client__account_manager=user)

        installed_qs = service_qs.filter(status='INSTALLED')

        # Revenue by account manager (all pages, server-side)
        rows = (
            installed_qs
            .values('client__account_manager__first_name', 'client__account_manager__last_name')
            .annotate(revenue=Sum('agreed_price'))
            .order_by('-revenue')
        )

        revenue_by_manager = []
        for r in rows:
            fname = r['client__account_manager__first_name'] or ''
            lname = r['client__account_manager__last_name'] or ''
            name = f'{fname} {lname}'.strip() or 'Sin Asignar'
            revenue_by_manager.append({'name': name, 'ingresos': float(r['revenue'] or 0)})

        total_revenue = installed_qs.aggregate(total=Sum('agreed_price'))['total'] or 0

        return Response({
            'total_clients': client_qs.count(),
            'active_services': installed_qs.count(),
            'catalog_count': ServiceCatalog.objects.count(),
            'monthly_revenue': float(total_revenue),
            'revenue_by_manager': revenue_by_manager[:5],  # Top 5
        })
