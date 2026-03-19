import os
import sys
import django

# Add the project directory to sys.path
sys.path.append('/var/www/crm-datacom')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from services.models import ServiceCatalog

catalogs = [
    {'name': 'Internet Corporativo', 'service_type': 'TELECOM', 'base_price': 500.00},
    {'name': 'Transmisión de Datos', 'service_type': 'TELECOM', 'base_price': 300.00},
    {'name': 'Enlaces Satelitales', 'service_type': 'TELECOM', 'base_price': 800.00},
    {'name': 'Housing / Colocation', 'service_type': 'HOUSING', 'base_price': 1000.00},
    {'name': 'Ethical Hacking', 'service_type': 'OTHER', 'base_price': 2500.00},
    {'name': 'Venta de Equipos', 'service_type': 'OTHER', 'base_price': 0.00},
]

for cat in catalogs:
    obj, created = ServiceCatalog.objects.get_or_create(name=cat['name'], defaults=cat)
    if created:
        print(f"Creado: {cat['name']}")
    else:
        print(f"Ya existía: {cat['name']}")

print("Catálogo de Servicios poblado exitosamente.")
