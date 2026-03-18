# Changelog — CRM DataCom

Archivo de registro de cambios e historial de versiones del proyecto CRM DataCom.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Django REST Framework 3.16.1 con Token Authentication
- Gestión de clientes (prospectos y clientes activos) con modelo Client
- Sistema de contactos múltiples por cliente (Contact model)
- Pipeline de ventas con estados dinámicos (ClientService)
- Catálogo de servicios (Housing, Telecom, App Dev)
- Módulo de facturas e invoicing (Invoice, InvoiceItem, BillingRecord)
- Sistema de ticketing para soporte técnico (Ticket, TicketComment)
- Órdenes de trabajo para instalación (WorkOrder)
- Sistema de auditoría con ClientStatusHistory (registro de cambios de estado)
- Autenticación basada en roles (Role, UserProfile)
- Sincronización automática de estados cliente-servicio
- Cálculo automático de IVA (15% Ecuador) en BillingRecord
- CORS habilitado para acceso desde frontend
- Filtrado y paginación en API REST (django-filter)

### Pending Implementation
- Reportes y dashboards
- Notificaciones por email
- 2FA TOTP
- Integración con sistemas contables
- Export a Excel/PDF
- Workflow de aprobaciones
- Documentación OpenAPI/Swagger
- Suite de tests automatizadas
- CI/CD pipeline
- Docker support

---

## [0.1.0] — 2026-03-18

### Added
- **Versión inicial alpha del CRM DataCom**
- Arquitectura Django + DRF backend
- 5 módulos principales: Core (Auth), Clients, Services, Support, Billing
- Base de datos con SQLite (desarrollo) y PostgreSQL (producción)
- Modelo relacional completo para gestión CRM
- API REST con autenticación por token
- Panel administrativo Django
- Sistema de roles y permisos basado en JSON
- Gestión centralizada de clientes y oportunidades
- Pipeline de venta con múltiples estados
- Registro de auditoría de cambios
- Sistema de tickets para soporte técnico
- Módulo de facturación con cálculo de IVA automático
- Documentación inicial (README, ARCHITECTURE)
- Script de despliegue
- Configuración para desarrollo y producción

### Known Issues
- CORS configured to allow all origins (insecure, requires restriction for production)
- Email backend not configured (console backend for development)
- No test coverage yet
- Frontend implementation pending
- Some legacy database fields still present (to be refactored)

---

## Convenciones de Versioning

### Versión MAYOR.MENOR.PARCHE

- **MAYOR** (1.0.0): Cambios incompatibles con API / redesign arquitectónico
- **MENOR** (0.1.0): Nuevas funcionalidades compatibles
- **PARCHE** (0.1.1): Correcciones de bugs

### Tags de Pre-Release

- **alpha** (v0.1.0-alpha): Versión temprana, no debe usarse en producción
- **beta** (v0.2.0-beta): Versión candidata para release, probable en QA
- **rc** (v1.0.0-rc1): Release Candidate, lista para producción con caveats

### Ejemplos

- `v0.1.0-alpha` — Versión alpha
- `v0.1.0` — Versión stable
- `v1.0.0-beta.1` — Beta 1
- `v1.0.0-rc.1` — Release Candidate 1

---

## Hitos Futuros

### v0.2.0 (Corto Plazo — Q2 2026)
- Dashboards y reportes avanzados
- Notificaciones por email
- Búsqueda full-text
- Interfaz web mejorada (Vue.js frontend)

### v0.3.0 (Mediano Plazo — Q3 2026)
- Integración con sistemas contables
- Exportación a formato Excel/PDF
- Workflow de aprobaciones
- Activity timeline

### v1.0.0 (Largo Plazo — Q4 2026)
- Suite de tests completa
- 2FA TOTP activo
- Backup automático
- Monitoreo y alertas
- Documentación de API (OpenAPI/Swagger)
- Certificación de producción

---

## Cómo Reportar Cambios

Al hacer commit, usa el formato de mensaje especificado en [CONTRIBUTING.md](docs/CONTRIBUTING.md):

```
feat: [descripción de nueva funcionalidad]
fix: [descripción de corrección]
docs: [cambios en documentación]
refactor: [cambios sin efecto funcional]
test: [adición/corrección de tests]
chore: [mantenimiento, dependencias]
crm: [cambios de lógica comercial]
```

Ejemplo:
```
feat: agregar generación automática de facturas mensales
fix: corregir cálculo de IVA en BillingRecord
docs: actualizar DEPLOYMENT.md con instrucciones PostgreSQL
```

---

**Mantenedor**: Marco Logacho (@mlogacho)  
**Repositorio**: https://github.com/mlogacho/crm-datacom  
**Licencia**: [PENDIENTE de definir]
