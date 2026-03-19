# Arquitectura del Sistema — CRM DataCom

> Documento técnico de referencia para desarrolladores y arquitectos de DataCom S.A.

---

## 1. Descripción General

CRM DataCom es una aplicación web de gestión comercial interna compuesta por:

- **Backend REST API**: Django 5.2 + Django REST Framework, estructura de apps modulares.
- **Frontend SPA**: React 18 + Vite + Tailwind CSS, servida como archivos estáticos por Nginx.
- **Base de datos**: SQLite en desarrollo, PostgreSQL en producción.
- **Servidor**: Gunicorn (WSGI) detrás de Nginx en Debian Linux.

La comunicación entre frontend y backend es exclusivamente vía API REST con autenticación por Token (DRF TokenAuthentication). El frontend React consume todos los endpoints bajo `/api/`.

---

## 2. Diagrama de Módulos (Apps Django)

```
crm_backend/          ← Núcleo del proyecto Django (settings, urls raíz, wsgi)
│
├── core/             ← Usuarios, roles, permisos, autenticación 2FA (TOTP)
│   ├── Role          → Define conjuntos de vistas permitidas (JSON field)
│   ├── UserProfile   → Extiende User de Django (cédula, cargo, foto, rol, TOTP)
│   └── API: /api/core/
│
├── clients/          ← Gestión de clientes y contactos
│   ├── Client        → Entidad principal (prospecto o activo, embudo comercial)
│   ├── Contact       → Contactos asociados a un cliente
│   ├── ClientStatusHistory → Auditoría de cambios de estado con evidencia
│   └── API: /api/clients/
│
├── services/         ← Catálogo de servicios y asignación a clientes
│   ├── ServiceCatalog  → Catálogo maestro de productos/servicios
│   ├── ClientService   → Servicio asignado a un cliente con estado en embudo
│   ├── WorkOrder       → Orden de instalación vinculada a un ClientService
│   └── API: /api/services/
│
├── billing/          ← Facturación y registros financieros
│   ├── Invoice       → Factura emitida a un cliente
│   ├── InvoiceItem   → Ítem de línea dentro de una factura
│   ├── BillingRecord → Registro mensual MRC/NRC por cliente
│   └── API: /api/billing/
│
└── support/          ← [PENDIENTE — módulo en desarrollo]
    └── API: /api/support/
```

---

## 3. Flujo Principal del Usuario

```
1. LOGIN
   └── POST /api/api-token-auth/  →  Obtiene token DRF
       └── (Opcional) Verificación 2FA TOTP → POST /api/core/2fa/verify-setup/

2. DASHBOARD
   └── GET métricas del embudo: clientes por estado, MRC total, servicios activos

3. REGISTRO DE PROSPECTO (nuevo cliente)
   └── POST /api/clients/clients/
       ├── classification = PROSPECT
       └── prospect_status = CONTACTED / FIRST_MEETING / ...

4. PROGRESIÓN EN EMBUDO
   └── PATCH /api/clients/clients/{id}/update_active_status/
       ├── Registra en ClientStatusHistory (con evidencia adjunta)
       └── Actualiza prospect_status o active_status del Client

5. ASIGNACIÓN DE SERVICIO
   └── POST /api/services/client-services/
       ├── Vincula Client + ServiceCatalog
       └── status = PROSPECTING → ... → BACKLOG → INSTALLED

6. GENERACIÓN DE ORDEN DE TRABAJO (estado BACKLOG)
   └── GET /api/services/work-orders/next_sequence/  →  Número correlativo
   └── POST /api/services/work-orders/
       ├── Genera login PPPoE automático: INICIALES_UBICACION_SERVICIO_SEQ
       └── Fecha estimada de instalación

7. SERVICIO INSTALADO
   └── PATCH /api/services/client-services/{id}/  →  status = INSTALLED
       └── ClientService.save() sincroniza active_status en Client

8. FACTURACIÓN
   └── POST /api/billing/records/  →  Registro MRC/NRC mensual
   └── POST /api/billing/bulk-create/  →  Carga masiva de registros
```

---

## 4. Modelo de Datos Resumido

```
User (Django built-in)
 └── UserProfile (1:1)
      └── Role (N:1)  →  allowed_views: ["dashboard","clients","services",...]

Client
 ├── classification: PROSPECT | ACTIVE
 ├── prospect_status: FIRST_MEETING | CONTACTED | OFFERED | FOLLOW_UP | ...
 ├── active_status:   PROSPECTING | FIRST_MEETING | BACKLOG | INSTALLED | ...
 ├── contacts (1:N) → Contact
 ├── status_history (1:N) → ClientStatusHistory
 │    └── evidence (FileField → media/prospect_evidence/)
 └── services (1:N) → ClientService
      ├── service (N:1) → ServiceCatalog
      ├── status: PROSPECTING | BACKLOG | INSTALLED | LOST | ...
      ├── agreed_price (MRC), nrc, bandwidth, service_location
      └── work_order (1:1) → WorkOrder
           ├── order_number (correlativo)
           └── login (PPPoE autogenerado)

Invoice
 └── items (1:N) → InvoiceItem

BillingRecord
 └── client (N:1) → Client
```

---

## 5. Integraciones Externas Detectadas

| Integración | Estado | Descripción |
|---|---|---|
| PostgreSQL | Producción | Base de datos relacional principal |
| Nginx | Producción | Proxy inverso + servir SPA React |
| Gunicorn | Producción | Servidor WSGI Django |
| TOTP / 2FA | Implementado | Autenticación de doble factor (compatible Google Authenticator) |
| SSO ERP→CRM | Implementado | Token pasado por `?sso_token=` en URL, procesado en módulo-nivel en `AuthContext.jsx` |
| Importación CSV | Implementado | `POST /api/clients/import/` — carga masiva de clientes |
| Carga masiva billing | Implementado | `POST /api/billing/bulk-create/` |
| Email | [PENDIENTE] | No detectado en settings.py actual |
| Reportes / Exports | [PENDIENTE] | No detectado en versión actual |

---

## 6. Roles y Permisos

El sistema implementa un esquema de permisos basado en roles personalizados (no grupos de Django estándar):

- Cada `Role` tiene un campo `allowed_views` (JSONField con lista de nombres de módulos permitidos).
- El endpoint `GET /api/core/user-permissions/` devuelve los permisos del usuario autenticado.
- El frontend React verifica en `AuthContext.jsx` si el usuario tiene acceso a cada vista antes de renderizarla.

**Vistas disponibles:** `dashboard`, `clients`, `services`, `support`, `billing`, `catalog`, `settings`

---

## 7. Frontend — Páginas Principales

| Página | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Autenticación con token + 2FA opcional |
| Dashboard | `/` | Métricas del embudo y KPIs comerciales |
| Clientes | `/clients` | Gestión completa de clientes y contactos |
| Servicios | `/services` | Lista de servicios asignados por cliente |
| Catálogo | `/catalog` | Catálogo maestro de servicios/productos |
| Facturación | `/billing` | Registros MRC/NRC y facturas |
| Configuración | `/settings` | Usuarios, roles y configuración del sistema |

---

## 8. Seguridad

- Todas las rutas API requieren `IsAuthenticated` (TokenAuthentication).
- CSRF activo para operaciones de escritura desde el panel Django Admin.
- CORS configurado (`CORS_ALLOW_ALL_ORIGINS = True` — restringir en producción).
- Contraseñas hasheadas con el sistema de Django (`make_password`).
- Secreto TOTP almacenado en `UserProfile.totp_secret`.
- Archivos de evidencia subidos a `media/prospect_evidence/` (no expuestos directamente en producción sin autenticación).
