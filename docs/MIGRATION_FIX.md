# Reparación del Módulo de Migración (Importación de Clientes)

Se ha corregido un error crítico que impedía el funcionamiento del botón **"Migrar Excel/CSV"** en el CRM de DataCom.

## Cambios Realizados

1.  **Iconografía Faltante:**
    *   Se identificó que el componente `<Download />` de `lucide-react` estaba siendo utilizado en el modal de importación sin haber sido importado previamente en el archivo `ClientsList.jsx`.
    *   Esto causaba un `ReferenceError` que resultaba en una pantalla en blanco de React al intentar abrir el modal.
    *   **Solución:** Se añadió `Download` a la lista de componentes importados de `lucide-react`.

2.  **Soporte de Extensiones de Archivo:**
    *   El campo de selección de archivos (`<input type="file">`) estaba restringido únicamente a `.csv`.
    *   **Solución:** Se actualizó el atributo `accept` para incluir `.xlsx` y `.xls`, alineándose con lo que muestra la interfaz de usuario.

3.  **Refresco del Build:**
    *   Se realizó una reconstrucción completa del frontend en el servidor para asegurar que los cambios de la UI sean visibles y que el ruteo sea consistente.

## Instrucciones para el Desarrollador

Si deseas agregar soporte completo para archivos Excel (.xlsx) en el servidor en el futuro:
1.  Instala las dependencias necesarias en el entorno virtual de Python: `pip install openpyxl pandas`.
2.  Actualiza la vista `ImportClientsView` en `clients/views.py` para manejar el parsing de archivos Excel.
3.  Actualmente, el backend requiere que los archivos sean en formato **CSV** con codificación UTF-8 o Latin-1 (separados por coma o punto y coma).

---

# Migración Técnica: account_manager de texto a ForeignKey(User)

Se documenta el cambio estructural aplicado al modelo de clientes para pasar de un campo de texto a una relación real con usuarios del sistema.

## Objetivo

- Eliminar dependencia de coincidencias por nombre de texto libre.
- Garantizar integridad referencial entre clientes y ejecutivos comerciales.
- Mantener compatibilidad con datos legacy durante el proceso de transición.

## Cambios implementados

1. Modelo de datos (backend)
- `clients.Client.account_manager` cambia de `CharField` a `ForeignKey(User)` con `null=True` y `on_delete=SET_NULL`.

2. Migraciones
- `clients/migrations/0009_client_account_manager_fk.py`
    - Renombra campo anterior a `account_manager_legacy`.
    - Crea nuevo campo `account_manager` como FK a `auth.User`.
- `clients/migrations/0010_migrate_account_manager_data.py`
    - Migra datos legacy buscando coincidencia unica por nombre completo.
    - Si no hay coincidencia unica, no interrumpe el proceso.
    - Elimina el campo `account_manager_legacy` al finalizar.

3. API y serialización
- Se agrega `account_manager_name` en `ClientSerializer` para lectura amigable en frontend.
- El campo `account_manager` pasa a escritura por `User.id` (nullable/opcional).

4. Reglas de visibilidad por rol
- Se reemplaza el filtro por texto (`icontains`) por filtro exacto con FK (`account_manager=user`) en clientes y servicios.
- Rol `Asistente de Gerencia` queda sin restricción por gerente asignado.

5. Importación CSV
- La columna de gerente se resuelve a usuario cuando existe coincidencia única.
- En casos ambiguos o sin coincidencia, se asigna `null` sin romper la importación.

## Despliegue aplicado en producción

- Ruta de despliegue: `/var/www/crm-datacom`
- Respaldo previo realizado:
    - Base PostgreSQL en `backups/pre_fk_20260330_115226/db_backup.dump`
    - Archivos en `file_backups/pre_fk_20260330_115226/`
- Migraciones aplicadas:
    - `clients.0009_client_account_manager_fk`
    - `clients.0010_migrate_account_manager_data`
- Validación:
    - `python manage.py check` sin errores.
    - Smoke test de relación FK exitoso.
- Frontend:
    - Build ejecutado con `npm run build`.
- Servicio reiniciado:
    - Solo `gunicorn-crm.service` (sin intervención sobre otras aplicaciones).
