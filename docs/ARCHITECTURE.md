# CRM DataCom - Arquitectura del Sistema

**Documento de Arquitectura Técnica**  
**Versión**: 0.1.0-alpha  
**Última actualización**: Marzo 2026

---

## 1. Descripción General del Sistema

CRM DataCom es un sistema de gestión comercial integral diseñado para centralizar y automatizar todos los procesos comerciales de DataCom S.A. La plataforma sigue una arquitectura client-server moderna con separación clara entre backend (Django/Python) y frontend (Vue.js).

### Visión

Proporcionar una única fuente de verdad para la gestión de clientes, oportunidades comerciales, servicios contratados y seguimiento postventa, mejorando la visibilidad comercial, eficiencia operativa y experiencia del cliente.

### Objetivos

1. **Centralizar información**: Un único registro para cada cliente con historial completo
2. **Automatizar flujos**: Reducir tareas manuales mediante sistemas de estados y notificaciones
3. **Mejorar reportes**: Datos consolidados para análisis y toma de decisiones
4. **Escalar operaciones**: Arquitectura preparada para crecimiento y nuevas funcionalidades

---

## 2. Arquitectura de Módulos (Django Apps)

El proyecto está estructurado en 5 aplicaciones Django independientes pero interconectadas:

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM DataCom Backend                      │
│                    (Django 5.2 + DRF)                       │
└─────────────────────────────────────────────────────────────┘
    ↑         ↑          ↑           ↑           ↑
    │         │          │           │           │
┌─────┐  ┌──────┐  ┌──────────┐ ┌────────┐ ┌─────────┐
│CORE │  │CLIENT│  │SERVICES  │ │SUPPORT │ │BILLING  │
└─────┘  └──────┘  └──────────┘ └────────┘ └─────────┘
 Auth     Prosp.    Oportunid.   Tickets    Facturas
 Roles    Clientes  Contratos    Soporte    Cobros
 Users    Contactos Instalac.    Incident.  Registros
```

### 2.1 CORE (Autenticación y Autorización)

**Responsabilidad**: Gestión de usuarios, autenticación y control de acceso basado en roles.

**Modelos**:
- `Role`: Define roles personalizados (Gerente de Ventas, Support, Admin, etc.)
  - Campos: nombre, descripción, lista de vistas permitidas (JSON)
  - Ejemplo: Role "Gerente Comercial" puede acceder a ["clientes", "servicios", "reportes"]

- `UserProfile`: Extiende el User de Django con datos CRM
  - Campos: cedula, cargo, foto, fecha nacimiento, estado civil
  - Relación: OneToOne con User, ForeignKey a Role

**Flujo de Autorización**:
1. Usuario inicia sesión (TokenAuthentication + BasicAuth)
2. Se valida contra User y UserProfile
3. Se determina Role asignado
4. Se cargan las vistas (views) permitidas según Role
5. Cualquier acceso fuera de allowed_views es rechazado

**Endpoints** (Referencia):
- `POST /api/auth/login/` - Autenticación
- `GET /api/auth/user/` - Perfil del usuario
- `POST /api/auth/logout/` - Cierre de sesión

---

### 2.2 CLIENTS (Gestión de Clientes y Prospectos)

**Responsabilidad**: Registro, clasificación y seguimiento de clientes y contactos.

**Modelos**:

```
┌─────────────────────────────────────────┐
│           CLIENT (maestro)              │
├─────────────────────────────────────────┤
│ • name (Nombre Comercial)               │
│ • legal_name (Razón Social)             │
│ • tax_id (RUC/NIT) [UNIQUE]             │
│ • classification (PROSPECT / ACTIVE)    │
│ • prospect_status / active_status       │
│ • email, phone, address                 │
│ • region, city, segment                 │
│ • account_manager (gerente asignado)    │
│ • is_active (booleano)                  │
│ • timestamps (created_at, updated_at)   │
└─────────────────────────────────────────┘
           ↓ 1:N
┌─────────────────────┐  ┌──────────────────────────┐
│ CONTACT (personas)  │  │ CLIENTSTATUSHISTORY      │
├─────────────────────┤  │ (auditoría de cambios)   │
│ • name              │  ├──────────────────────────┤
│ • position/cargo    │  │ • status (estado)        │
│ • email             │  │ • reason (razón cambio)  │
│ • phone             │  │ • evidence (archivo)     │
│ • is_primary        │  │ • nrc, mrc (valores $)   │
└─────────────────────┘  │ • custom_date            │
                        │ • created_at (auditoria) │
                        └──────────────────────────┘
```

**Estados de Prospecto** (ProspectStatus):
```
PROSPECTING → CONTACTED → FIRST_MEETING → OFFERED → FOLLOW_UP →
CLOSING_MEETING → ADJUDICATED → (LOST_DEAL)
```

**Estados de Cliente Activo** (ActiveStatus):
```
PROSPECTING → CONTACTED → FIRST_MEETING → OFFERED → FOLLOW_UP →
CLOSING_MEETING → DEMO → CONTRACT_SIGNED → BACKLOG → INSTALLED →
BILLED → [NEW_SERVICE | UP_GRADE | DOWN_GRADE]
      ↓ (if issues)
      LOST
```

**Lógica de Negocio**:
1. Cliente creado por defecto como PROSPECT
2. Transición a estado siguiente es manual (via UI)
3. ClientStatusHistory registra cada cambio (quién, cuándo, por qué)
4. Es posible adjuntar evidencia (cotizaciones, contratos escaneados)
5. Cada cambio de estado puede tener impacto fiscal (NRC, MRC)

**Endpoints** (Referencia):
- `GET/POST /api/clients/` - Listar/crear clientes
- `GET/PUT /api/clients/{id}/` - Detalle/actualizar cliente
- `GET /api/clients/{id}/contacts/` - Contactos del cliente
- `GET /api/clients/{id}/status-history/` - Historial de estados

---

### 2.3 SERVICES (Catálogo y Oportunidades de Venta)

**Responsabilidad**: Definir servicios disponibles y su venta/provisión a clientes.

**Modelos**:

```
┌──────────────────────────────────┐
│    SERVICECATALOG (maestro)      │
├──────────────────────────────────┤
│ • name (nombre del servicio)     │
│ • description (detalles)         │
│ • service_type (HOUSING/TELECOM) │
│ • base_cost (costo para nosotros)│
│ • base_price (precio lista)      │
│ • client_taxes (impuestos)       │
└──────────────────────────────────┘
           ↑ N:1
           │
┌──────────────────────────────────┐
│   CLIENTSERVICE (instancia)      │
├──────────────────────────────────┤
│ FK: client, service              │
│ • status (pipeline de venta)     │
│ • agreed_price (MRC negociado)   │
│ • nrc (comisión de instalación)  │
│ • start_date, end_date           │
│ • ip_address, bandwidth, etc.    │
│ • timestamps                     │
│ (Ejm: Cliente X contrato Y)      │
└─────────────┬──────────────────────┐
              │ 1:1                   │
       ┌──────▼─────────┐      ┌─────▼──────────┐
       │  WORKORDER     │      │ (Relacionado)  │
       │ (Instalación)  │      │ services app   │
       │                │      │ views.py       │
       │ • order_number │      │ serializers.py │
       │ • login        │      │ urls.py        │
       │ • estimated    │      │ admin.py       │
       │   _date        │      │ tests.py       │
       └────────────────┘      └────────────────┘
```

**StatusChoices de Venta** (ClientService.status):
- Mismos que ActiveStatus (ver sección CLIENTS)
- Cuando cambia ClientService.status → se sincroniza a Client.active_status
- Esto permite que el estado del cliente refleje el estado de su mejor oportunidad

**Tipos de Servicio** (ServiceType):
- **HOUSING**: Data Center, Colocation, Rack Space
- **TELECOM**: Internet, WAN, Telecom
- **APP_DEV**: Desarrollo de Software, Integraciones
- **OTHER**: Servicios complementarios

**Lógica de Negocio**:
1. ServiceCatalog = definición de lo que ofrecemos
2. ClientService = venta concreta (ej: Cliente ABC compra HOUSING por $500/mes)
3. Cada ClientService tiene su workflow de venta independiente
4. Los precios base son referencia; los negociados (agreed_price) son los reales
5. NRC + MRC definen los ingresos (no recurrente + recurrente)
6. WorkOrder planifica la instalación técnica

**Endpoints** (Referencia):
- `GET /api/services/catalog/` - Catálogo de servicios
- `GET/POST /api/services/client-services/` - Oportunidades
- `GET/PUT /api/services/client-services/{id}/` - Detalle oportunidad
- `GET/POST /api/workorders/` - Órdenes de instalación

---

### 2.4 BILLING (Facturación y Cobros)

**Responsabilidad**: Gestionar facturas, cobros y registros de facturación mensual.

**Modelos**:

```
┌────────────────────────────────────┐
│      INVOICE (factura)             │
├────────────────────────────────────┤
│ FK: client                         │
│ • invoice_number (único)           │
│ • issue_date, due_date             │
│ • subtotal, tax_amount, total      │
│ • status (PENDING/PAID/OVERDUE)    │
│ • notes                            │
└────────────────┬───────────────────┘
                 │ 1:N
        ┌────────▼──────────┐
        │  INVOICEITEM      │
        │ (línea de factura)│
        ├───────────────────┤
        │ • description     │
        │ • quantity        │
        │ • unit_price      │
        │ • total_price (Q) │
        └───────────────────┘

┌────────────────────────────────────┐
│   BILLINGRECORD (registro mensual) │
├────────────────────────────────────┤
│ FK: client, service_catalog        │
│ • service_label                    │
│ • service_amount (sin IVA)         │
│ • iva_amount (autocompute: 15%)    │
│ • total (autocompute)              │
│ • mes, anio (period)               │
│ • factura (ref factura si existe)  │
│ • credito (ref si hay nota crédito)│
│ • observations                     │
└────────────────────────────────────┘
```

**Estados de Factura**:
- **PENDING**: Factura emitida, esperando pago
- **PAID**: Pago recibido completamente
- **OVERDUE**: Vencida sin pago
- **CANCELLED**: Anulada (nota crédito emitida)

**Cálculos Automáticos**:
- `BillingRecord.iva_amount` = `service_amount × 0.15` (IVA 15% Ecuador)
- `BillingRecord.total` = `service_amount + iva_amount`
- `Invoice.total_amount` = suma de todos los items

**Lógica de Negocio**:
1. Invoice = documento fiscal formal (cumple requisitos SRI Ecuador)
2. InvoiceItem = desagregación de servicios en una factura
3. BillingRecord = registro mensual por cliente/servicio para análisis
4. Múltiples servicios o clientes pueden generar una factura combinada
5. El historial de billing permite tracking de MRC + variaciones

**Endpoints** (Referencia):
- `GET/POST /api/billing/invoices/` - Facturas
- `GET /api/billing/invoices/{id}/items/` - Items factura
- `GET /api/billing/records/` - Registros de facturación mensual

---

### 2.5 SUPPORT (Ticketing y Soporte Técnico)

**Responsabilidad**: Gestionar reportes de incidentes y soporte post-venta.

**Modelos**:

```
┌─────────────────────────────────┐
│         TICKET (incidente)      │
├─────────────────────────────────┤
│ FK: client, related_service     │
│ FK: assigned_to, created_by     │
│ • title (resumen)               │
│ • description (detalles)        │
│ • priority (LOW/MEDIUM/HIGH/)   │
│          (CRITICAL)             │
│ • status (OPEN/IN_PROGRESS/)    │
│        (RESOLVED/CLOSED)        │
│ • created_at, updated_at        │
│ • resolved_at (cuando se cerró) │
└──────────────┬──────────────────┘
               │ 1:N
        ┌──────▼──────────────┐
        │  TICKETCOMMENT     │
        │ (actualización)     │
        ├────────────────────┤
        │ FK: ticket, author  │
        │ • comment (texto)   │
        │ • is_internal       │
        │ • created_at        │
        └────────────────────┘
```

**Prioridades**:
- **LOW**: No urgente, puede esperar >1 semana
- **MEDIUM**: Normal, 3-5 días
- **HIGH**: Urgente, <1 día
- **CRITICAL**: Servicio caído, respuesta inmediata

**Flujo de Estados**:
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
 ↑                   (investigación + solución)
 └────────────── (reabierto si no resuelto)
```

**Lógica de Negocio**:
1. Cliente o staff pueden reportar ticket
2. Se asigna a técnico disponible
3. Comentarios pueden ser públicos (cliente ve) o privados (staff only)
4. Tiempo de resolución es tracked (created → resolved_at)
5. Relacionadas a ClientService para contexto técnico
6. Métricas: tiempo promedio resolución, volumen por cliente, etc.

**Endpoints** (Referencia):
- `GET/POST /api/support/tickets/` - Tickets
- `GET /api/support/tickets/{id}/comments/` - Comentarios
- `POST /api/support/tickets/{id}/comments/` - Agregar comentario

---

## 3. Flujo Principal del Usuario (Lead → Cliente Activo)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY EN CRM DATACOM                 │
└─────────────────────────────────────────────────────────────────┘

ETAPA 1 - PROSPECCIÓN (Ejecutivo de Ventas)
───────────────────────────────────────────
[1] Prospecto se registra en CRM
    Client.classification = PROSPECT
    Client.prospect_status = FIRST_MEETING

[2] Ejecutivo realiza seguimiento
    • Actualiza prospect_status según interacción
    • Agrega ContactStatus entries (evidencia, notas)
    • Crea ClientService = oportunidad de venta
    Client Service.status sigue el pipeline de venta

[3] Se envía cotización/propuesta
    ClientService.status = OFFERED
    ClientStatusHistory registra: "Cotización enviada 15/02"


ETAPA 2 - CIERRE COMERCIAL (Gerente de Ventas)
───────────────────────────────────────────────
[4] Cliente acepta propuesta
    ClientService.status = FOLLOW_UP → CLOSING_MEETING
    ClientService.agreed_price se confirma (negociación)
    ClientService.nrc = comisión de implementación
    ClientService contract established

[5] Se firma contrato
    ClientService.status = CONTRACT_SIGNED
    WorkOrder se crea para instalación
    Client se clasifica como ACTIVE (automático)


ETAPA 3 - IMPLEMENTACIÓN (Equipo Operativo)
────────────────────────────────────────────
[6] Fase de instalación técnica
    WorkOrder.estimated_date = fecha planificada
    WorkOrder.observations = instrucciones técnicas
    Configurar IP, rack, bandwidth, etc.

[7] Servicio se instala
    ClientService.status = INSTALLED
    ClientService.start_date se registra
    Se configura en sistemas de billing


ETAPA 4 - FACTURACIÓN Y SOPORTE (Cuentas + Support)
─────────────────────────────────────────────────────
[8] Facturación recurrente (mensual)
    BillingRecord se crea (autom. o manual)
    service_amount = MRC (ClientService.agreed_price)
    iva_amount = 15% (autocompute)
    total = service_amount + iva_amount

[9] Se emite factura fiscal
    Invoice = consolidación de servicios
    InvoiceItem = línea de factura
    Invoice.status = PENDING (esperando pago)

[10] Cliente reporta incidencias
     Ticket se crea por cada incidente
     Asignado a técnico
     Seguimiento: OPEN → IN_PROGRESS → RESOLVED → CLOSED

[11] Renovación / Cambios
     UP_GRADE: upgraded a servicio superior
     DOWN_GRADE: downgrade a servicio menor
     NEW_SERVICE: adicional a cliente existente

```

---

## 4. Modelo de Datos Resumido (Entidades y Relaciones)

> **Diagrama completo:** Para el diagrama ERD completo en notación Mermaid (incluye todos los atributos,
> cardinalidades y notas de implementación), consulta [`docs/ERD.md`](ERD.md).

### Diagrama de Entidades (ER)

```
┌─────────────────────┐
│       ROLE          │
├─────────────────────┤
│ id (PK)             │
│ name (unique)       │
│ allowed_views (JSON)│
└─────────────────────┘
        ↓ 1:N
┌─────────────────────┐
│   USERPROFILE       │
├─────────────────────┤
│ id (PK)             │
│ user_id (OneToOne)  │
│ role_id (FK)        │
│ cedula, cargo, etc  │
└─────────────────────┘


┌─────────────────────┐          ┌──────────────────┐
│      CLIENT         │◄─────────│   SERVICECATALOG │
├─────────────────────┤   N:1   ├──────────────────┤
│ id (PK)             │          │ id (PK)          │
│ tax_id (unique)     │          │ name             │
│ classification      │          │ base_price       │
│ prospect_status     │          │ service_type     │
│ active_status       │          └──────────────────┘
│ is_active           │
└────────┬────────────┘
    1:N  │
    ┌────┴──────────────┐
    │                   │
┌───▼──────────┐  ┌────▼────────────┐
│   CONTACT    │  │ CLIENTSERVICE   │
├──────────────┤  ├─────────────────┤
│ id (PK)      │  │ id (PK)         │
│ client_id    │  │ client_id (FK)  │
│ name, email  │  │ service_id (FK) │
│ is_primary   │  │ status          │
└──────────────┘  │ agreed_price    │
                  │ start_date      │
            1:N   │ nrc, mrc        │
             │    └────┬────────────┘
             │         │ 1:1
             │    ┌────▼───────┐
             │    │ WORKORDER  │
             │    ├────────────┤
             │    │ id (PK)    │
             │    │ c_s_id(FK) │
             │    │ order#/etc │
             │    └────────────┘
             │
    ┌────────┘
    │
┌───▼────────────────────┐
│ CLIENTSTATUSHISTORY    │
├────────────────────────┤
│ id (PK)                │
│ client_id (FK)         │
│ status, reason         │
│ evidence (FileField)   │
│ nrc, mrc (values)      │
│ created_at (audit)     │
└────────────────────────┘


┌──────────────────┐    N:1    ┌───────────────────┐
│    INVOICE       │◄──────────│   INVOICEITEM    │
├──────────────────┤           ├───────────────────┤
│ id (PK)          │           │ id (PK)           │
│ client_id (FK)   │           │ invoice_id (FK)   │
│ invoice_number   │           │ description       │
│ issue_date       │           │ quantity, price   │
│ total_amount     │           │ total_price       │
│ status (payment) │           └───────────────────┘
└──────────────────┘


┌─────────────────────────┐    N:1    ┌──────────────────┐
│    BILLINGRECORD        │◄──────────│   [same client]  │
├─────────────────────────┤           │                  │
│ id (PK)                 │           │ Related to many  │
│ client_id (FK)          │           │ monthly records  │
│ service_catalog_id      │           │ for analysis     │
│ service_amount (net)    │           └──────────────────┘
│ iva_amount (15% auto)   │
│ total (net+iva)         │
│ mes, anio (period)      │
│ factura, credito (refs) │
└─────────────────────────┘


┌──────────────────┐       ┌──────────────────────┐
│     TICKET       │◄──────│   TICKETCOMMENT      │
├──────────────────┤  1:N  ├──────────────────────┤
│ id (PK)          │       │ id (PK)              │
│ client_id (FK)   │       │ ticket_id (FK)       │
│ c_service_id(FK) │       │ author_id (FK)       │
│ title            │       │ comment              │
│ priority         │       │ is_internal          │
│ status           │       │ created_at           │
│ assigned_to (FK) │       └──────────────────────┘
│ created_by (FK)  │
│ resolved_at      │
└──────────────────┘
```

### Tabla de Relaciones Principales

| Entidad | Relación | Entidad | Cardinalidad | Descripción |
|---------|----------|---------|--------------|-------------|
| Client | has many | Contact | 1:N | Un cliente puede tener múltiples contactos |
| Client | has many | ClientService | 1:N | Un cliente puede contratar varios servicios |
| Client | has many | StatusHistory | 1:N | Cada cambio de estado se registra |
| Client | has many | Invoice | 1:N | Un cliente puede tener múltiples facturas |
| Client | has many | Ticket | 1:N | Un cliente puede reportar varios tickets |
| ServiceCatalog | has many | ClientService | 1:N | Un servicio es instancia múltiples veces |
| ClientService | has one | WorkOrder | 1:1 | Cada servicio tiene un plan de instalación |
| ClientService | has many | Ticket | 1:N | Tickets relacionados a un servicio |
| Invoice | has many | InvoiceItem | 1:N | Una factura tiene múltiples líneas |
| Ticket | has many | TicketComment | 1:N | Un ticket puede tener comentarios |
| UserProfile | has many | Ticket (assigned) | 1:N | Un usuario asignado a tickets |
| Role | has many | UserProfile | 1:N | Un rol asignado a múltiples usuarios |

---

## 5. Integraciones Externas Detectadas

### 5.1 Autenticación

- **DRF Token Authentication**: Tokens para acceso API
- **Basic Authentication**: Autenticación HTTP básica (fallback)
- **TOTP (optional)**: Soporte para 2FA con secreto TOTP (implementación futura)

### 5.2 Base de Datos

**Desarrollo**: SQLite3 (incluido)  
**Producción**: PostgreSQL 9.6+ (configurable en .env)

### 5.3 CORS

- `django-cors-headers`: Permite peticiones desde frontend en diferente dominio
- Configurado: `CORS_ALLOW_ALL_ORIGINS = True` (inseguro en producción)

### 5.4 Filtrado y Paginación

- `django-filter`: Filtrado avanzado en listas API
- `DRF PageNumberPagination`: Paginación de resultados (1000 por página)

### 5.5 Email (Futuro)

Variables environment detectadas pero sin implementación:
```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=crm@datacom.com.ec
EMAIL_HOST_PASSWORD=...
```
Caso de uso: notificaciones de estado, recordatorios de pago

### 5.6 Almacenamiento de Archivos

- `media/`: Base para uploads (evidencias, fotos de usuario)
  - `prospect_evidence/`: Cotizaciones, contratos escaneados
  - `profiles/`: Fotos de perfil de usuarios

---

## 6. Roles y Permisos del Sistema

Definidos en modelo `Role` con control granular via `allowed_views` (JSON).

### Ejemplo Roles

| Rol | Descripción | Views Permitidas |
|-----|-------------|-----------------|
| Admin | Acceso completo | ["dashboard", "clients", "services", "support", "billing", "catalog", "users", "reports"] |
| Sales Manager | Gestión comercial | ["dashboard", "clients", "services", "reports"] |
| Sales Executive | Gestión de prospectos | ["clients", "services"] |
| Support Agent | Soporte técnico | ["support", "clients", "services"] |
| Billing Officer | Facturas y cobros | ["billing", "clients", "reports"] |
| Viewer | Solo lectura | ["dashboard", "reports"] |

**Implementación**:
1. En cada view/endpoint: verificar que `request.user.profile.role.allowed_views` incluya la vista
2. Decorador personalizado o mixtura de DRF para proteger endpoints
3. Frontend: renderizar opciones de menú basado en `allowed_views`

---

## 7. Patrones y Mejores Prácticas Implementadas

### 7.1 DRF (Django REST Framework)

- **Token Auth**: API stateless, escalable
- **Serializers**: Validación y transformación de datos
- **ViewSets + Routers**: Rutas automáticas para CRUD
- **Permissions**: Control de acceso en nivel de acción
- **Filtering**: Búsqueda y filtrado en listados

### 7.2 Modelos Django

- **Model Managers** (futuro): Consultas complejas reutilizables
- **Model Signals** (futuro): Lógica automática al crear/actualizar
- **Soft Deletes** (futuro): Borrado lógico (is_active) para auditoría
- **Timestamps**: created_at, updated_at en todas las entidades

### 7.3 Validación

- **Model Validators**: unique_together, validators personalizados
- **Serializer Validation**: validate_*, to_representation personalizados
- **Form Validation** (si aplica): clean_* methods

### 7.4 Auditoría

- `ClientStatusHistory`: Registra toda transición de estado
- **Timestamps**: Rastro de creación/modificación
- **Created_by / Updated_by** (futuro): Quién hizo cada cambio
- **API Logging** (futuro): Registro de todas las operaciones REST

---

## 8. Configuración del Proyecto

### 8.1 Settings.py (Django)

```python
# Punto de entrada: crm_backend/settings.py

# Apps instaladas
INSTALLED_APPS = [
    # Django built-in
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    
    # Local
    'core',       # Auth/Users
    'clients',    # CRM
    'services',   # Sales Pipeline
    'support',    # Ticketing
    'billing',    # Invoicing
]

# Database: SQLite (dev) o PostgreSQL (prod)
DATABASES = { ... }

# REST Framework Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'PAGE_SIZE': 1000,
}

# CORS
CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ INSEGURO en PROD

# Archivos estáticos y media
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
```

### 8.2 URLs Principales

```
/                          → Frontend (Vue.js)
/admin/                    → Admin Django
/api/                      → Base API REST
/api/client/               → CORE endpoints
/api/clients/              → CLIENTS endpoints
/api/services/             → SERVICES endpoints
/api/support/              → SUPPORT endpoints
/api/billing/              → BILLING endpoints
```

---

## 9. Stack Técnico Completo

### Backend
- **Framework**: Django 5.2.11
- **API**: Django REST Framework 3.16.1
- **Lenguaje**: Python 3.10+
- **BD**: PostgreSQL (producción) / SQLite3 (desarrollo)
- **Auth**: Token DRF
- **CORS**: django-cors-headers
- **ORM**: Django ORM

### Frontend
- **Framework**: Vue.js 3
- **Build**: Vite
- **Estilos**: Tailwind CSS 3
- **Dev Tool**: ESLint

### Infraestructura (Futuro)
- **Web Server**: Gunicorn (aplicación)
- **Reverse Proxy**: Nginx
- **Container**: Docker
- **CI/CD**: [PENDIENTE]

---

## 10. Próximas Fases de Desarrollo

### v0.2.0 (Corto Plazo)
- [ ] Implementar reportes avanzados (dashboards)
- [ ] Notificaciones por email
- [ ] Filtros avanzados (búsqueda full-text)
- [ ] Roles dinámicos (admin puede crear roles vía UI)

### v0.3.0 (Mediano Plazo)
- [ ] Integración con sistemas de contabilidad (SAP/Tally)
- [ ] Exportación a Excel/PDF
- [ ] Workflow de aprobaciones
- [ ] Historial de cambios (activity timeline)

### v1.0.0 (Producción)
- [ ] 2FA (TOTP) totalmente implementado
- [ ] Backup automático
- [ ] Monitoring y alertas
- [ ] Suite de pruebas exhaustiva
- [ ] Documentación en vivo (API Docs)

---

## 11. Glosario de Términos

| Término | Definición |
|---------|-----------|
| **MRC** | Monthly Recurring Charge (ingreso recurrente mensual) |
| **NRC** | Non-Recurring Charge (comisión única de implementación) |
| **Prospect** | Cliente potencial, sin servicios contratados |
| **Active Client** | Cliente con servicios actuales contratados y facturados |
| **Pipeline** | Flujo de estados en el proceso de venta (PROSPECTING → BILLED) |
| **Ticket** | Reporte de incidente/problema de cliente |
| **Work Order** | Plan de instalación/implementación de servicio |
| **Status History** | Registro de auditoría de cambios de estado |
| **IVA** | Impuesto sobre Valor Agregado (15% en Ecuador) |
| **Workflow** | Proceso automatizado (ej: creación de factura mensual) |

---

**Documento preparado para**: Marco Logacho, Director de Desarrollo Digital e IA  
**Organización**: DataCom S.A.  
**Fecha**: Marzo 2026  
**Versión de Código**: v0.1.0-alpha
