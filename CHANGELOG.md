# Changelog — CRM DataCom

## [Unreleased]
### Added
- **Gestión de Usuarios y Seguridad**:
  - Implementación de un campo "Correo Electrónico" para cada usuario del CRM (en el frontend modal de configuración).
  - Nuevo botón interactivo para mostrar/ocultar temporalmente las contraseñas en texto claro mediante un ícono (`Eye`/`EyeOff`).
  - Generador de contraseñas seguras integrado (botón verde "Generar") que crea de manera local tokens alfanuméricos de alta fiabilidad (mínimo de una mayúscula, un número, y un símbolo especial).
- **Notificaciones por Correo Electrónico**:
  - Nuevo endpoint del backend en `POST /api/core/generate-password/` que crea una contraseña temporal segura, actualiza al usuario e invalida todos sus tokens de sesión existentes.
  - Implementación de envío de correos vía SMTP utilizando las credenciales corporativas (`mail.datacom.ec` / `daia@datacom.ec`).
  - Cada vez que se genera un reseteo, el cliente recibe en su correo la confirmación HTML profesional, la nueva clave transitoria y el aviso para forzar el cambio en su próximo ingreso.
- Solución del error de página en blanco en 'Migrar Excel/CSV' (fallo de importación de componente Download de lucide-react).
- Soporte para extensiones .xlsx y .xls en el campo de importación en el frontend.
- Documentacion base del repositorio actualizada (README, arquitectura y despliegue).
- Docstrings y comentarios de modulo en vistas, serializers y urls de apps Django.
- Plantilla `.env.example` alineada a variables detectadas en settings.
- Dependencias actualizadas en `requirements.txt` para 2FA y QR.
- Script de recuperacion y automatizacion de tareas ajustados para entorno local.
- Migracion de `clients.Client.account_manager` de campo de texto a relacion `ForeignKey` con `auth.User`.
- Nueva migracion estructural `clients.0009_client_account_manager_fk` para introducir el FK sin perder datos existentes.
- Nueva migracion de datos `clients.0010_migrate_account_manager_data` para mapear valores legacy a usuarios de forma tolerante.
- Nuevo campo de respuesta API `account_manager_name` en serializador de clientes para mostrar nombre legible del ejecutivo.

### Fixed
- **Validaciones de Frontend/Backend**:
  - Corrección de un error HTTP 400 Validation Bad Request que impedía guardar o actualizar la información del usuario por fechas o strings vacías en los envíos vía `FormData` desde React hacia Django (`birthdate`, `civil_status`).
  - Resolución de un `IndentationError` crítico presente en `services/views.py` (`WorkOrderViewSet`).
- **Despliegues (Deployment)**:
  - Optimización del archivo `crm_backend/urls.py` de Django para que las configuraciones de SPA Catch-All y activos estáticos recompilados desde local (`/assets/`) sólo se sirvan bajo el flag de `DEBUG=True`, lo que permite una integración limpia a producción (NGINX + Gunicorn).
- **Clientes y Servicios (Filtro por ejecutivo):**
  - Eliminado filtrado legacy por texto (`account_manager__icontains`) y reemplazado por filtrado exacto por FK a `User`.
  - Ajustada visibilidad para rol `Asistente de Gerencia` con acceso sin restriccion por ejecutivo asignado.
- **Importacion CSV de clientes:**
  - Adaptada la importacion para resolver `GERENTE DE CUENTA` a `User` cuando existe coincidencia unica.
  - Cuando no hay coincidencia unica, el proceso no falla y mantiene asignacion nula para proteger continuidad operativa.

### Changed
- **Frontend de Clientes (`frontend/src/pages/ClientsList.jsx`)**:
  - El selector de gerente ahora envia `account_manager` como `User.id`.
  - La tabla y filtros muestran el nombre legible mediante `account_manager_name`.
- **Despliegue controlado en servidor de produccion (`/var/www/crm-datacom`)**:
  - Aplicado con respaldo previo de base de datos y archivos impactados.
  - Compilado frontend con `npm run build`.
  - Reiniciado unicamente `gunicorn-crm.service` para evitar impacto en otras aplicaciones.

## [0.1.0] — 2026-03-19
### Added
- Estructura inicial del CRM con apps: core, clients, services, support y billing.
- API REST con autenticacion por token y control de acceso por roles.
- Gestion comercial de clientes, contactos, servicios y estados de seguimiento.
- Modulo de soporte con tickets y comentarios.
- Modulo de facturacion con facturas y registros mensuales.
