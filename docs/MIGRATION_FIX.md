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
