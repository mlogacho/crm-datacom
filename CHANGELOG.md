# Changelog — CRM DataCom

## [Unreleased]
### Added
- **Dashboard — Endpoint de métricas server-side** (`GET /api/clients/dashboard-stats/`):
  - Agrega server-side: total clientes, servicios activos (INSTALLED), catálogo, MRC mensual y Top 5 gerentes por ingresos.
  - Resolución de límite de paginación (`PAGE_SIZE=1000`) que ocultaba gerentes con servicios más antiguos.
  - Respeta roles: Ventas/Gerente de Cuenta ven sólo su cartera; Super Admin ve todo.
- **Importación CSV — Drag-and-drop real**:
  - Eventos `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` conectados en la zona de carga.
  - `onDrop` lee `e.dataTransfer.files[0]` y llama `setImportFile()`.
  - `onClick` en la zona dispara el `<input type="file">` oculto programáticamente.
  - Feedback visual: borde azul sólido + fondo + ícono escalado al arrastrar.
- **Importación CSV — UBICACIÓN DEL SERVICIO propagada a ClientService**:
  - El campo se guardaba en `Client.service_location` pero no en `ClientService.service_location`.
  - Ahora se pasa correctamente en `ClientService.objects.create()` durante el import.
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
- **Dashboard — Gráfico "Ingresos por Gerente de Cuenta"**:
  - Sólo mostraba un ejecutivo (Fausto Betancourt) porque `PAGE_SIZE=1000` devolvía únicamente los 1000 servicios más recientes (todos de importaciones recientes del CSV), dejando los servicios de otros gerentes fuera de la consulta.
  - Resuelto moviendo el cálculo al nuevo endpoint `dashboard-stats/` que usa `annotate(Sum)` directamente en BD.
- **Importación CSV — Error 502 Bad Gateway (WORKER TIMEOUT)**:
  - El worker de Gunicorn moría a los 30 s al procesar archivos grandes por N+1 queries (8-10 queries/fila).
  - Pre-carga de `Users`, `Clients`, `ServiceCatalog` y `Contacts` en dicts de memoria al inicio → `O(1)` lookup por fila.
  - Loop de importación envuelto en `transaction.atomic()` → un solo commit para todo el archivo.
  - Timeout de Gunicorn aumentado de 30 s a 120 s en `/etc/systemd/system/gunicorn-crm.service`.
- **Importación CSV — Error `account_manager must be a User instance`**:
  - El campo `Client.account_manager` se migró a `ForeignKey(User)` pero el import asignaba strings.
  - Se usa función `resolve_account_manager_user()` que hace match por nombre completo via `Concat + icontains`.
  - La función `get_queryset` del `ClientViewSet` fue actualizada de `account_manager__icontains` a `account_manager=user`.
- **Modal de Importación — Contenido fuera de pantalla**:
  - Reestructurado con `max-h-[90vh]` + `flex flex-col` en el contenedor.
  - Header y footer con `flex-shrink-0` (siempre visibles).
  - Contenido con `overflow-y-auto flex-1` (deslizador interno).
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
- **Dashboard.jsx**: Estadísticas y gráfico ahora cargados desde `dashboard-stats/` en lugar de calcularse en cliente con datos paginados. Reducción de 3 llamadas API a 2.
- **Importación CSV** (`clients/views.py`): Loop refactorizado con pre-carga de datos y `transaction.atomic`. Reducción estimada de queries: de ~1000 a ~200 para un archivo de 100 filas.
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
