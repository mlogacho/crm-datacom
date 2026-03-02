from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Client, Contact, ClientStatusHistory
from services.models import ServiceCatalog, ClientService
from .serializers import ClientSerializer, ContactSerializer, ClientStatusHistorySerializer
import csv
import io
import uuid
from datetime import date
import re

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def update_prospect_status(self, request, pk=None):
        client = self.get_object()
        
        status_val = request.data.get('status')
        reason = request.data.get('reason')
        evidence = request.FILES.get('evidence')
        
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
            evidence=evidence
        )
        
        serializer = ClientStatusHistorySerializer(history)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

class ImportClientsView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
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
                # Remove dollar signs and commas
                cleaned = re.sub(r'[^\d.]', '', str(value))
                if cleaned == '': return Decimal('0.00')
                try:
                    return Decimal(cleaned)
                except InvalidOperation:
                    return Decimal('0.00')

            created_clients = 0
            created_services = 0

            for row in reader:
                client_name = get_col(row, ['CLIENTE', 'CLIENTES', 'NOMBRE'])
                if not client_name:
                    continue  # Skip rows without client name

                # Extract Client Data
                region = get_col(row, ['REGION', 'REGIÓN'])
                city = get_col(row, ['CIUDAD'])
                segment = get_col(row, ['SEGMENTO'])
                account_manager = get_col(row, ['GERENTE DE CUENTA', 'GERENTE'])[:255]
                
                # We need tax_id and email. Will use dummy if empty.
                tax_id = f"MIGRATED-{uuid.uuid4().hex[:8]}"[:50]
                email_raw = get_col(row, ['E-MAILS', 'EMAIL', 'CORREOS', 'CORREO', 'E-MAIL'])
                email = email_raw.split(';')[0].split(',')[0].strip() if email_raw else ""
                if not email or '@' not in email:
                    email = "contacto@desconocido.com"

                # Find or create Client by name (Handling MultipleObjectsReturned)
                client = Client.objects.filter(name=client_name).first()
                client_created = False
                
                if not client:
                    client = Client.objects.create(
                        name=client_name,
                        tax_id=tax_id,
                        email=email,
                        region=region,
                        city=city,
                        segment=segment,
                        account_manager=account_manager,
                        client_type='OTHER'
                    )
                    client_created = True
                    created_clients += 1

                # Update client if existing
                if not client_created:
                    changed = False
                    if not client.region and region: client.region = region; changed = True
                    if not client.city and city: client.city = city; changed = True
                    if not client.segment and segment: client.segment = segment; changed = True
                    if not client.account_manager and account_manager: client.account_manager = account_manager; changed = True
                    if changed: client.save()

                # Extract Contact Data
                contact_name = get_col(row, ['CONTACTO', 'NOMBRE CONTACTO'])[:255]
                phones = get_col(row, ['TELÉFONOS', 'TELEFONOS', 'TELEFONO'])[:50]
                if contact_name:
                    contact = Contact.objects.filter(client=client, name=contact_name).first()
                    if not contact:
                        Contact.objects.create(
                            client=client,
                            name=contact_name,
                            email=email,
                            phone=phones
                        )

                # Extract Service Data
                service_str = get_col(row, ['SERVICIO', 'SERVICIOS', 'P&S', 'PRODUCTO'])
                if service_str:
                    # Find or create Service Catalog item
                    service_cat = ServiceCatalog.objects.filter(name=service_str).first()
                    if not service_cat:
                        service_cat = ServiceCatalog.objects.create(
                            name=service_str,
                            service_type='OTHER',
                            base_price=0.00
                        )

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
                        start_date=date.today()
                    )
                    created_services += 1

            return Response({
                "message": "Importación completada con éxito.",
                "clients_imported": created_clients,
                "services_imported": created_services
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Error procesando archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
