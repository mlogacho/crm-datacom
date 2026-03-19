# Changelog — CRM DataCom

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

---

## [Unreleased]

### En desarrollo
- Módulo de soporte técnico (`support/`)
- Exportación de reportes a PDF/Excel
- Notificaciones por correo electrónico

---

## [0.1.0-alpha] — 2025-07-29

### Agregado
- Estructura base del proyecto Django 5.2 + React 18 + Vite + Tailwind CSS
- App `core`: gestión de usuarios, roles con permisos por módulo, autenticación TOTP 2FA
- App `clients`: gestión completa de clientes (prospectos y activos), contactos, historial de estados con evidencia adjunta e importación CSV masiva
- App `services`: catálogo de servicios, asignación de servicios a clientes con embudo de 11 estados, órdenes de trabajo con login PPPoE autogenerado
- App `billing`: facturas, ítems de factura y registros MRC/NRC con carga masiva
- Autenticación SSO ERP→CRM mediante token en query parameter (`?sso_token=`)
- Frontend: páginas Dashboard, Clientes, Servicios, Catálogo, Facturación, Configuración
- Modal "Editar Servicio" con creación automática de orden de trabajo al llegar a estado BACKLOG
- Modal "Asignar Servicios" con selector de cliente de dos paneles
- Documentación inicial: README, ARCHITECTURE, DEPLOYMENT, CONTRIBUTING
- Scripts de configuración: `scripts/setup.sh`, `Makefile`

### Seguridad
- Autenticación por Token DRF en todas las rutas API
- Doble factor de autenticación TOTP por usuario (compatible Google Authenticator)
- Control de acceso por módulo mediante `Role.allowed_views`

---

[Unreleased]: https://github.com/mlogacho/crm-datacom/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/mlogacho/crm-datacom/releases/tag/v0.1.0-alpha
