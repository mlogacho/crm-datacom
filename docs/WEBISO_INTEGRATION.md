# Integración con WebISO v2

Este documento describe la relación de dependencia de datos entre el CRM DataCom y el sistema WebISO v2.

## Descripción
El sistema WebISO v2 utiliza la base de datos central del CRM para gestionar su sistema de notificaciones automáticas. No existe una duplicación de usuarios; WebISO consulta directamente la fuente de verdad del CRM.

## Detalles de Conexión
WebISO accede a la base de datos PostgreSQL mediante un driver `psycopg2`. La configuración se lee del archivo `.env` del CRM para garantizar consistencia en las credenciales.

### Tabla de Usuarios (`auth_user`)
WebISO depende de los siguientes campos de la tabla `auth_user` (Django standard):
- `email`: Utilizado como destino de las notificaciones.
- `first_name` / `last_name`: Utilizado para personalizar el saludo del correo.
- `username`: Backup en caso de nombres vacíos.
- `is_active`: Filtro crítico; solo los usuarios activos en el CRM reciben notificaciones de documentos ISO.

## Impacto de Cambios en CRM
Cualquier cambio en el esquema de la tabla `auth_user` o en las credenciales de la base de datos PostgreSQL afectará directamente la capacidad de WebISO de enviar notificaciones. Se recomienda notificar al equipo de WebISO ante:
1. Migraciones que alteren el modelo de usuario.
2. Rotación de contraseñas del usuario de base de datos (`datacom_user`).
3. Cambios en el host o puerto de PostgreSQL.

## Verificación
Para confirmar que la integración es funcional, se puede ejecutar el endpoint de diagnóstico en WebISO:
`GET http://<servidor_webiso>:8081/api/diag/emails`
