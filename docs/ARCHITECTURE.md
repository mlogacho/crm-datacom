# Arquitectura del Sistema — CRM DataCom

## 1. Descripcion general del sistema

CRM DataCom es una plataforma web para la gestion comercial interna de DataCom S.A. El backend esta construido en Django + Django REST Framework y expone API para clientes, servicios, soporte y facturacion. El frontend esta implementado con React y Vite.

Arquitectura detectada:
- Backend API monolitico por apps Django
- Frontend SPA separado en carpeta frontend
- Base de datos SQLite por defecto y PostgreSQL opcional por variables de entorno

## 2. Diagrama de modulos (texto)

```text
crm_backend (configuracion proyecto)
|
|-- core      -> autenticacion, usuarios, roles, permisos de vistas
|-- clients   -> clientes, contactos, historial de estados
|-- services  -> catalogo de servicios, servicios contratados, ordenes de trabajo
|-- support   -> tickets y comentarios de soporte
|-- billing   -> facturas, items de factura, registros mensuales de facturacion
|
|-- frontend  -> interfaz React (Vite, Tailwind)
```

## 3. Flujo principal del usuario (lead a cierre)

1. Se registra un cliente en clients como prospecto.
2. Se agregan contactos comerciales del cliente.
3. Se asigna tipo de servicio desde el catalogo y se crea ClientService.
4. El equipo comercial actualiza estados de prospecto/activo y registra evidencia en ClientStatusHistory.
5. Si se concreta la venta, se genera la orden de trabajo (WorkOrder) para instalacion.
6. El cliente pasa a estado operativo y se inicia ciclo de facturacion (Invoice/BillingRecord).
7. Si existe postventa, se gestionan incidencias desde support con tickets y comentarios.

## 4. Modelo de datos resumido

Entidades principales y relaciones detectadas:

- Role 1:N UserProfile
- User (Django) 1:1 UserProfile
- Client 1:N Contact
- Client 1:N ClientStatusHistory
- Client 1:N ClientService
- ServiceCatalog 1:N ClientService
- ClientService 1:1 WorkOrder
- Client 1:N Ticket
- Ticket 1:N TicketComment
- Client 1:N Invoice
- Invoice 1:N InvoiceItem
- Client 1:N BillingRecord
- ServiceCatalog 1:N BillingRecord (opcional)

## 5. Integraciones externas detectadas

Integraciones verificadas en codigo:
- Token Authentication (DRF authtoken)
- CORS configurado con django-cors-headers
- Carga de variables de entorno con python-dotenv
- Generacion QR para setup de 2FA (qrcode)
- TOTP para autenticacion de dos factores (pyotp)
- Importacion masiva desde CSV en clientes
- Importacion masiva de facturacion desde frontend (flujo con SheetJS en cliente)

No se detectaron en backend del repositorio actual:
- Integraciones con APIs de terceros de CRM/ERP
- Proveedor SMTP configurado por settings activos
- Integraciones de mensajeria externa

## 6. Roles y permisos del sistema

Mecanismo detectado:
- Modelo Role con campo allowed_views (JSON) para permisos de navegacion funcional.
- UserProfile enlaza cada usuario con un Role.
- El endpoint de permisos devuelve allowed_views para controlar acceso en frontend.
- Superusuario tiene acceso total.

Roles explicitos en logica de vistas:
- Ventas
- Gerente de Cuenta
- Gerente General
- Presidente Ejecutivo

Nota:
- No existe aun un modulo separado de politicas avanzadas por objeto.
- [PENDIENTE — completar cuando se implemente] matriz formal de permisos por accion.
