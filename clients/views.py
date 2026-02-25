from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Client, Contact
from services.models import ServiceCatalog, ClientService
from .serializers import ClientSerializer, ContactSerializer
import csv
import io
import uuid
from datetime import date
import re

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer

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
            
            # Read CSV
            reader = csv.DictReader(io_string, delimiter=',')
            
            # Normalize headers
            headers = [h.strip().upper() for h in reader.fieldnames]
            reader.fieldnames = headers

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
                client_name = str(row.get('CLIENTE') or '').strip()
                if not client_name:
                    continue  # Skip rows without client name

                # Extract Client Data
                region = str(row.get('REGION') or '').strip()
                city = str(row.get('CIUDAD') or '').strip()
                segment = str(row.get('SEGMENTO') or '').strip()
                account_manager = str(row.get('GERENTE DE CUENTA') or '').strip()
                
                # We need tax_id and email. Will use dummy if empty.
                tax_id = f"MIGRATED-{uuid.uuid4().hex[:8]}"
                email_raw = str(row.get('E-MAILS') or '').strip()
                email = email_raw.split(';')[0].split(',')[0].strip() if email_raw else ""
                if not email or '@' not in email:
                    email = "contacto@desconocido.com"

                # Find or create Client by name
                client, client_created = Client.objects.get_or_create(
                    name=client_name,
                    defaults={
                        'tax_id': tax_id,
                        'email': email,
                        'region': region,
                        'city': city,
                        'segment': segment,
                        'account_manager': account_manager,
                        'client_type': 'OTHER'
                    }
                )
                if client_created: created_clients += 1

                # Update client if existing
                if not client_created:
                    changed = False
                    if not client.region and region: client.region = region; changed = True
                    if not client.city and city: client.city = city; changed = True
                    if not client.segment and segment: client.segment = segment; changed = True
                    if not client.account_manager and account_manager: client.account_manager = account_manager; changed = True
                    if changed: client.save()

                # Extract Contact Data
                contact_name = str(row.get('CONTACTO') or '').strip()
                phones = str(row.get('TELÉFONOS') or '').strip()
                if contact_name:
                    Contact.objects.get_or_create(
                        client=client,
                        name=contact_name,
                        defaults={
                            'email': email,
                            'phone': phones
                        }
                    )

                # Extract Service Data
                service_str = str(row.get('SERVICIO') or '').strip()
                if service_str:
                    # Find or create Service Catalog item
                    service_cat, cat_created = ServiceCatalog.objects.get_or_create(
                        name=service_str,
                        defaults={'service_type': 'OTHER', 'base_price': 0.00}
                    )

                    project_type = str(row.get('TIPO DE PROYECTO') or '').strip()
                    estado_str = str(row.get('ESTADO') or '').strip().upper()
                    service_status = STATUS_MAPPING.get(estado_str, 'PROSPECTING')
                    
                    nrc = clean_decimal(row.get('NRC'))
                    mrc = clean_decimal(row.get('MRC'))
                    management_type = str(row.get('TIPO DE GESTION') or '').strip()
                    call_result = str(row.get('RESULTADO DE LLAMADAS') or '').strip()
                    obs = str(row.get('OBSERVACION') or '').strip()

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
