# Changelog — CRM DataCom

## [Unreleased]
### Added
- Solución del error de página en blanco en 'Migrar Excel/CSV' (fallo de importación de componente Download de lucide-react).
- Soporte para extensiones .xlsx y .xls en el campo de importación en el frontend.
- Documentacion base del repositorio actualizada (README, arquitectura y despliegue).
- Docstrings y comentarios de modulo en vistas, serializers y urls de apps Django.
- Plantilla `.env.example` alineada a variables detectadas en settings.
- Dependencias actualizadas en `requirements.txt` para 2FA y QR.
- Script de recuperacion y automatizacion de tareas ajustados para entorno local.

## [0.1.0] — 2026-03-19
### Added
- Estructura inicial del CRM con apps: core, clients, services, support y billing.
- API REST con autenticacion por token y control de acceso por roles.
- Gestion comercial de clientes, contactos, servicios y estados de seguimiento.
- Modulo de soporte con tickets y comentarios.
- Modulo de facturacion con facturas y registros mensuales.
