# CRM DataCom

**Sistema de Gestión Comercial Interna para DataCom S.A.**

## Descripción

CRM DataCom es una plataforma integral de gestión comercial desarrollada específicamente para las necesidades de DataCom S.A. El sistema automatiza y centraliza todos los procesos comerciales del equipo de ventas, desde la prospección inicial hasta el seguimiento postventa.

## Propósito

- **Gestión de Clientes**: Registro completo de prospectos y clientes activos con clasificación y estados de seguimiento
- **Gestión de Contactos**: Registro de personas de contacto asociadas a cada cliente
- **Oportunidades de Venta**: Seguimiento detallado de servicios ofertados, cotizaciones y estados del cierre comercial
- **Servicios y Catálogo**: Gestión del catálogo de servicios ofertados (Housing, Telecom, Desarrollo de Software, etc.)
- **Seguimiento Comercial**: Historial de estados, actividades y eventos asociados a cada oportunidad
- **Ticketing de Soporte**: Sistema de tickets para gestión de incidentes y soporte técnico post-venta
- **Facturación**: Gestión de facturas, cobros y estados de pago por cliente
- **Control de Acceso**: Sistema de roles y permisos para diferentes niveles de usuarios (Gerentes, Ejecutivos, Staff)

## Tecnologías

### Backend
- **Framework**: Django 5.2.11
- **Lenguaje**: Python 3.10+
- **Base de Datos**: SQLite3 (desarrollo) | PostgreSQL (producción)
- **API REST**: Django REST Framework 3.16.1
- **Autenticación**: Token-based (DRF Token Authentication)
- **Validación**: Django Filter 25.2

### Frontend
- **Framework**: Vue.js 3 (mediante Vite)
- **Estilos**: Tailwind CSS 3
- **Build Tool**: Vite
- **Transpilación**: ESLint

### Librerías Complementarias
- `python-dotenv`: Gestión de variables de entorno
- `django-cors-headers`: Configuración CORS para frontend
- `psycopg2-binary`: Driver PostgreSQL

## Estado del Proyecto

**En Desarrollo Activo** — v0.1.0-alpha

El proyecto se encuentra en fase de desarrollo. La arquitectura y modelos de datos están definidos, con funcionalidades base implementadas. Se espera completar pruebas e integración de frontend antes de pasar a producción.

## Autor / Responsable

**Marco Logacho**
- Cargo: Director de Desarrollo Digital e IA
- Organización: DataCom S.A.
- Correo: [información de contacto disponible en DataCom]

## Repositorio Público

- **GitHub**: https://github.com/mlogacho/crm-datacom
- **Visibilidad**: Público
- **Licencia**: [PENDIENTE — completar cuando se defina]

---

## Instalación Rápida

Para instrucciones detalladas de instalación, ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Requisitos Previos
- Python 3.10 o superior
- pip (gestor de paquetes Python)
- Git
- Node.js 16+ (para frontend)

### Pasos Básicos

```bash
# Clonar repositorio
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (usuario administrador)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

El servidor estará disponible en: **http://localhost:8000**

Panel administrativo: **http://localhost:8000/admin**

---

## Estructura de Carpetas

```
crm-datacom/
│
├── crm_backend/              # Configuración general del proyecto Django
│   ├── settings.py           # Configuración principal
│   ├── urls.py               # URLs raíz del proyecto
│   ├── wsgi.py               # WSGI app para despliegue
│   └── asgi.py               # ASGI app para async
│
├── core/                      # Módulo de autenticación y usuarios
│   ├── models.py             # UserProfile, Role
│   ├── serializers.py        # Serializadores REST
│   ├── views.py              # Vistas de autenticación
│   ├── urls.py               # URLs de autenticación
│   └── migrations/           # Migraciones de BD
│
├── clients/                   # Módulo de gestión de clientes
│   ├── models.py             # Client, Contact, ClientStatusHistory
│   ├── serializers.py        # Serializadores REST
│   ├── views.py              # Vistas CRUD de clientes
│   ├── urls.py               # URLs de clientes
│   └── migrations/           # Migraciones de BD
│
├── services/                  # Módulo de servicios y catálogo
│   ├── models.py             # ServiceCatalog, ClientService, WorkOrder
│   ├── serializers.py        # Serializadores REST
│   ├── views.py              # Vistas de servicios
│   ├── urls.py               # URLs de servicios
│   └── migrations/           # Migraciones de BD
│
├── support/                   # Módulo de soporte técnico
│   ├── models.py             # Ticket, TicketComment
│   ├── serializers.py        # Serializadores REST
│   ├── views.py              # Vistas de tickets
│   ├── urls.py               # URLs de soporte
│   └── migrations/           # Migraciones de BD
│
├── billing/                   # Módulo de facturación
│   ├── models.py             # Invoice, InvoiceItem
│   ├── serializers.py        # Serializadores REST
│   ├── views.py              # Vistas de facturación
│   ├── urls.py               # URLs de facturación
│   └── migrations/           # Migraciones de BD
│
├── frontend/                  # Aplicación Vue.js frontend (separada)
│   ├── src/                  # Código fuente Vue
│   ├── public/               # Archivos estáticos
│   ├── package.json          # Dependencias npm
│   ├── vite.config.js        # Configuración Vite
│   └── tailwind.config.js    # Configuración TailwindCSS
│
├── docs/                      # Documentación técnica
│   ├── ARCHITECTURE.md       # Diagrama y flujo de la aplicación
│   ├── DEPLOYMENT.md         # Guía de despliegue
│   └── CONTRIBUTING.md       # Convenciones de desarrollo
│
├── scripts/                   # Scripts de utilidad
│   └── setup.sh              # Script de configuración rápida
│
├── tests/                     # Pruebas automatizadas
│   └── [pruebas por app]
│
├── manage.py                  # CLI de Django
├── requirements.txt           # Dependencias de Python
├── .env.example               # Plantilla de variables de entorno
├── .gitignore                 # Archivos ignorados por Git
├── Makefile                   # Tareas automatizadas
├── CHANGELOG.md               # Historial de cambios
└── README.md                  # Este archivo
```

---

## Configuración Inicial

### 1. Variables de Entorno

Copiar `.env.example` a `.env` y configurar según el entorno (desarrollo/producción):

```bash
cp .env.example .env
# Editar .env con las credenciales apropiadas
```

### 2. Base de Datos

**Desarrollo**: SQLite3 (automático)  
**Producción**: PostgreSQL (configurar en .env)

```bash
python manage.py migrate
```

### 3. Cargar Datos Iniciales

Si existen fixtures de catálogos (tipos de servicios, estados, etc.):

```bash
python manage.py loaddata [nombre_fixture]
```

### 4. Crear Usuario Administrador

```bash
python manage.py createsuperuser
```

---

## Ejecución

### Desarrollo

```bash
# Backend (Django)
python manage.py runserver 0.0.0.0:8000

# Frontend (en otra terminal)
cd frontend
npm run dev
```

### Producción

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para instrucciones de despliegue con Gunicorn, Nginx, etc.

---

## Uso de la Aplicación

### Acceso Principal

- **URL**: http://localhost:8000/
- **API REST**: http://localhost:8000/api/
- **Admin**: http://localhost:8000/admin/

### Módulos Principales

1. **Clientes**: Gestión de prospectos y clientes activos
2. **Servicios**: Cotizaciones, oportunidades de venta
3. **Soporte**: Gestión de tickets técnicos
4. **Facturación**: Seguimiento de facturas y pagos
5. **Reportes**: Dashboards y análisis (cuando se implemente)

---

## Ayuda y Contacto

Para dudas sobre instalación, funcionamiento o reporte de bugs:

1. Consultar documentación en `/docs`
2. Revisar el código fuente en el módulo correspondiente
3. Crear un issue en el repositorio GitHub: https://github.com/mlogacho/crm-datacom/issues

---

**Última actualización**: Marzo 2026  
**Versión**: 0.1.0-alpha
