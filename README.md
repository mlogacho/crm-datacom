# CRM DataCom

> **Sistema de gestión comercial interna para DataCom S.A.**

---

## Descripción

CRM DataCom es un sistema web diseñado para la gestión comercial interna de DataCom S.A. Permite administrar el ciclo completo de ventas: desde el registro de prospectos y seguimiento de oportunidades, hasta la instalación de servicios, facturación y gestión del equipo comercial.

---

## Propósito

- Gestión de **clientes** (prospectos y activos) con clasificación, segmentación y seguimiento de estado en el embudo de ventas.
- Registro y seguimiento de **contactos** asociados a cada cliente.
- Control del **catálogo de servicios** (telecom, housing, software) y asignación de servicios a clientes.
- Generación y seguimiento de **órdenes de trabajo** para instalaciones.
- **Historial de estados** y observaciones por cliente y servicio.
- Módulo de **facturación** (registros MRC/NRC por cliente).
- **Panel de control (Dashboard)** con métricas del embudo de ventas y rendimiento comercial.
- **Gestión de usuarios y roles** con permisos por módulo y autenticación de doble factor (2FA/TOTP).

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend / API | Django 5.2 + Django REST Framework 3.16 |
| Lenguaje | Python 3.10+ |
| Base de datos (desarrollo) | SQLite 3 |
| Base de datos (producción) | PostgreSQL 14+ |
| Frontend | React 18 + Vite + Tailwind CSS |
| Autenticación | Token Authentication (DRF) + TOTP 2FA |
| Servidor de aplicación | Gunicorn + Nginx |
| Variables de entorno | python-dotenv |
| CORS | django-cors-headers |
| Filtros API | django-filter |

---

## Estado del Proyecto

> **En desarrollo activo (v0.1.0-alpha)**
> Desplegado en servidor de producción Debian con Nginx + Gunicorn.
> Base de datos: SQLite en desarrollo, PostgreSQL en producción.

---

## Autor / Responsable

**Marco Logacho**  
Director de Desarrollo Digital e IA — DataCom S.A.

---

## Repositorio

🔗 [https://github.com/mlogacho/crm-datacom](https://github.com/mlogacho/crm-datacom)

---

## Instalación Rápida

> Ver guía completa en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

```bash
# 1. Clonar el repositorio
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom

# 2. Ejecutar script de configuración automática
bash scripts/setup.sh
```

O paso a paso:

```bash
# Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias del backend
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor de desarrollo
python manage.py runserver

# En otra terminal: instalar y ejecutar el frontend
cd frontend
npm install
npm run dev
```

---

## Estructura de Carpetas

```
crm-datacom/
├── billing/                    # App de facturación (MRC/NRC por cliente)
│   ├── models.py               #   Modelos: Invoice, InvoiceItem, BillingRecord
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── clients/                    # App de gestión de clientes y contactos
│   ├── models.py               #   Modelos: Client, Contact, ClientStatusHistory
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── core/                       # App central: usuarios, roles, autenticación 2FA
│   ├── models.py               #   Modelos: Role, UserProfile
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── services/                   # App de catálogo y asignación de servicios
│   ├── models.py               #   Modelos: ServiceCatalog, ClientService, WorkOrder
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── crm_backend/                # Configuración principal del proyecto Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── frontend/                   # SPA React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              #   ClientsList, ServicesList, Dashboard, Billing...
│   │   ├── context/            #   AuthContext (gestión de sesión y SSO)
│   │   └── components/         #   Layout, componentes reutilizables
│   └── package.json
├── docs/                       # Documentación técnica
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
├── scripts/                    # Scripts de utilidad
│   └── setup.sh
├── .env.example                # Plantilla de variables de entorno
├── requirements.txt            # Dependencias Python
├── manage.py
├── Makefile
└── README.md
```

---

## Módulos del Sistema

| Módulo | Ruta API | Descripción |
|---|---|---|
| Autenticación | `/api/api-token-auth/` | Login y obtención de token |
| Usuarios / Roles | `/api/core/` | Gestión de usuarios, roles y 2FA |
| Clientes | `/api/clients/` | CRUD clientes, contactos, historial |
| Servicios | `/api/services/` | Catálogo, asignación y órdenes de trabajo |
| Facturación | `/api/billing/` | Facturas y registros MRC/NRC |
| Admin Django | `/admin/` | Panel de administración backend |

---

## Licencia

Uso interno — DataCom S.A. © 2026
