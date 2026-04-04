# Guia de Contribucion — CRM DataCom

## Convenciones de commit

Usar el formato:

```text
<tipo>: <descripcion breve>
```

Tipos permitidos para este proyecto:

- feat: nueva funcionalidad
- fix: correccion de error
- docs: cambios en documentacion
- refactor: refactorizacion sin cambio funcional
- test: adicion o correccion de pruebas
- chore: mantenimiento (dependencias, CI, etc.)
- crm: cambios especificos de logica comercial o de ventas

## Ejemplos correctos

```text
feat: agregar endpoint para historial comercial de cliente
fix: corregir validacion de tax_id duplicado
docs: actualizar guia de despliegue para Debian
refactor: simplificar filtro de clientes por rol
test: agregar pruebas para ClientServiceViewSet
chore: actualizar dependencias de backend
crm: ajustar flujo de cambio de estado en prospectos
```

## Ejemplos incorrectos

```text
actualizaciones varias
fix stuff
cambios
wip
```

## Reglas recomendadas

- Un commit debe representar un cambio coherente y acotado.
- Evitar mezclar backend, frontend y docs en un mismo commit si no es necesario.
- Escribir mensajes en infinitivo y con contexto funcional.
- No incluir informacion sensible en commits ni en documentacion.
