# Diagrama Entidad-Relación — CRM DataCom

Este documento describe todas las entidades, atributos y relaciones del sistema CRM DataCom,
extraídas directamente de los modelos Django y sus migraciones.

---

## Diagrama ERD (Mermaid)

```mermaid
erDiagram

    %% ── Autenticación y Control de Acceso ──────────────────────────────
    USER {
        int     id          PK
        string  username
        string  email
        string  first_name
        string  last_name
        bool    is_active
    }

    ROLE {
        int      id             PK
        string   name           "único"
        text     description
        json     allowed_views
        datetime created_at
        datetime updated_at
    }

    USERPROFILE {
        int    id           PK
        int    user_id      FK
        int    role_id      FK
        string cedula
        string cargo
        string totp_secret
        image  photo
        date   birthdate
        string civil_status
    }

    %% ── Clientes ────────────────────────────────────────────────────────
    CLIENT {
        int      id                  PK
        string   name
        string   legal_name
        string   tax_id              "único"
        string   classification
        string   prospect_status
        string   active_status
        string   email
        string   phone
        text     address
        int      client_type_new_id  FK
        string   region
        string   city
        string   segment
        string   service_location
        string   account_manager
        bool     is_active
        datetime created_at
        datetime updated_at
    }

    CONTACT {
        int    id          PK
        int    client_id   FK
        string name
        string position
        string email
        string phone
        bool   is_primary
    }

    CLIENTSTATUSHISTORY {
        int      id           PK
        int      client_id    FK
        string   status
        text     reason
        file     evidence
        decimal  nrc
        decimal  mrc
        datetime custom_date
        datetime created_at
    }

    %% ── Catálogo y Servicios ────────────────────────────────────────────
    SERVICECATALOG {
        int     id             PK
        string  internal_code
        string  name
        text    description
        string  service_type
        string  client_taxes
        decimal base_cost
        decimal base_price
    }

    CLIENTSERVICE {
        int      id                 PK
        int      client_id          FK
        int      service_id         FK
        string   ip_address
        string   rack_space
        string   bandwidth
        string   service_location
        string   status
        decimal  agreed_price
        date     start_date
        date     end_date
        decimal  nrc
        string   project_type
        string   management_type
        string   call_result
        text     notes
        datetime created_at
        datetime updated_at
    }

    WORKORDER {
        int      id                  PK
        int      client_service_id   FK "único"
        string   order_number
        string   login
        datetime estimated_date
        text     observations
        datetime created_at
    }

    %% ── Facturación ─────────────────────────────────────────────────────
    INVOICE {
        int      id              PK
        int      client_id       FK
        string   invoice_number  "único"
        date     issue_date
        date     due_date
        decimal  subtotal
        decimal  tax_amount
        decimal  total_amount
        string   status
        text     notes
        datetime created_at
        datetime updated_at
    }

    INVOICEITEM {
        int     id           PK
        int     invoice_id   FK
        string  description
        decimal quantity
        decimal unit_price
        decimal total_price
    }

    BILLINGRECORD {
        int      id                  PK
        int      client_id           FK
        int      service_catalog_id  FK
        string   service_label
        decimal  service_amount
        decimal  iva_amount
        decimal  total
        text     observations
        string   factura
        string   credito
        int      mes
        int      anio
        datetime created_at
        datetime updated_at
    }

    %% ── Soporte ─────────────────────────────────────────────────────────
    TICKET {
        int      id                  PK
        int      client_id           FK
        int      related_service_id  FK
        string   title
        text     description
        string   status
        string   priority
        int      assigned_to_id      FK
        int      created_by_id       FK
        datetime created_at
        datetime updated_at
        datetime resolved_at
    }

    TICKETCOMMENT {
        int      id          PK
        int      ticket_id   FK
        int      author_id   FK
        text     comment
        bool     is_internal
        datetime created_at
    }

    %% ── Relaciones ──────────────────────────────────────────────────────

    %% Autenticación
    USER         ||--||    USERPROFILE          : "extiende (1:1)"
    ROLE         ||--o{    USERPROFILE          : "asignado a (1:N)"

    %% Clientes → referencias
    SERVICECATALOG ||--o{  CLIENT               : "tipo de cliente (1:N)"

    %% Clientes → hijos
    CLIENT       ||--o{    CONTACT              : "tiene contactos (1:N)"
    CLIENT       ||--o{    CLIENTSTATUSHISTORY  : "historial de estado (1:N)"
    CLIENT       ||--o{    CLIENTSERVICE        : "contrata servicios (1:N)"
    CLIENT       ||--o{    INVOICE              : "tiene facturas (1:N)"
    CLIENT       ||--o{    BILLINGRECORD        : "registros de facturación (1:N)"
    CLIENT       ||--o{    TICKET               : "reporta tickets (1:N)"

    %% Servicios
    SERVICECATALOG ||--o{  CLIENTSERVICE        : "instanciado como (1:N)"
    SERVICECATALOG ||--o{  BILLINGRECORD        : "facturado como (1:N)"
    CLIENTSERVICE  ||--o|  WORKORDER            : "planificado en (1:0..1)"
    CLIENTSERVICE  ||--o{  TICKET               : "referenciado en (1:N)"

    %% Facturación
    INVOICE      ||--|{    INVOICEITEM          : "contiene ítems (1:N)"

    %% Soporte
    TICKET       ||--o{    TICKETCOMMENT        : "tiene comentarios (1:N)"
    USER         ||--o{    TICKET               : "asignado a (1:N)"
    USER         ||--o{    TICKETCOMMENT        : "autor de (1:N)"
```

---

## Tabla de Entidades

| Entidad               | App       | Descripción                                                    |
|-----------------------|-----------|----------------------------------------------------------------|
| `USER`                | auth      | Usuario del sistema (Django built-in)                         |
| `ROLE`                | core      | Rol de acceso basado en permisos                              |
| `USERPROFILE`         | core      | Perfil extendido del usuario CRM                              |
| `CLIENT`              | clients   | Prospecto o cliente activo de DataCom                         |
| `CONTACT`             | clients   | Persona de contacto dentro de una organización cliente        |
| `CLIENTSTATUSHISTORY` | clients   | Historial de cambios de estado del cliente                    |
| `SERVICECATALOG`      | services  | Catálogo maestro de servicios disponibles                     |
| `CLIENTSERVICE`       | services  | Instancia de servicio contratado por un cliente               |
| `WORKORDER`           | services  | Orden de trabajo para instalación de un servicio              |
| `INVOICE`             | billing   | Factura emitida a un cliente                                  |
| `INVOICEITEM`         | billing   | Línea de detalle de una factura                               |
| `BILLINGRECORD`       | billing   | Registro mensual de facturación por cliente/servicio          |
| `TICKET`              | support   | Incidencia o solicitud de soporte de un cliente               |
| `TICKETCOMMENT`       | support   | Comentario o actualización sobre un ticket                    |

---

## Tabla de Relaciones

| Entidad Origen        | Cardinalidad | Entidad Destino       | Campo FK / Tipo          | Descripción                                         |
|-----------------------|--------------|-----------------------|--------------------------|-----------------------------------------------------|
| `USER`                | 1:1          | `USERPROFILE`         | `user` (OneToOneField)   | Cada usuario tiene exactamente un perfil CRM        |
| `ROLE`                | 1:N          | `USERPROFILE`         | `role` (ForeignKey)      | Un rol puede asignarse a múltiples perfiles         |
| `SERVICECATALOG`      | 1:N          | `CLIENT`              | `client_type_new` (FK)   | Tipo de cliente referencia al catálogo              |
| `CLIENT`              | 1:N          | `CONTACT`             | `client` (ForeignKey)    | Un cliente puede tener múltiples contactos          |
| `CLIENT`              | 1:N          | `CLIENTSTATUSHISTORY` | `client` (ForeignKey)    | Cada cambio de estado queda registrado              |
| `CLIENT`              | 1:N          | `CLIENTSERVICE`       | `client` (ForeignKey)    | Un cliente puede contratar varios servicios         |
| `CLIENT`              | 1:N          | `INVOICE`             | `client` (ForeignKey)    | Un cliente puede tener múltiples facturas           |
| `CLIENT`              | 1:N          | `BILLINGRECORD`       | `client` (ForeignKey)    | Un cliente tiene registros mensuales de facturación |
| `CLIENT`              | 1:N          | `TICKET`              | `client` (ForeignKey)    | Un cliente puede reportar múltiples tickets         |
| `SERVICECATALOG`      | 1:N          | `CLIENTSERVICE`       | `service` (ForeignKey)   | Un servicio del catálogo puede instanciarse N veces |
| `SERVICECATALOG`      | 1:N          | `BILLINGRECORD`       | `service_catalog` (FK)   | Un servicio puede aparecer en múltiples registros   |
| `CLIENTSERVICE`       | 1:0..1       | `WORKORDER`           | `client_service` (O2O)   | Un servicio puede tener como máximo una orden de trabajo (opcional) |
| `CLIENTSERVICE`       | 1:N          | `TICKET`              | `related_service` (FK)   | Un servicio puede tener múltiples tickets           |
| `INVOICE`             | 1:N          | `INVOICEITEM`         | `invoice` (ForeignKey)   | Una factura contiene una o más líneas de detalle    |
| `TICKET`              | 1:N          | `TICKETCOMMENT`       | `ticket` (ForeignKey)    | Un ticket puede tener múltiples comentarios         |
| `USER`                | 1:N          | `TICKET`              | `assigned_to` (FK)       | Un usuario puede tener N tickets asignados          |
| `USER`                | 1:N          | `TICKET`              | `created_by` (FK)        | Un usuario puede haber creado N tickets             |
| `USER`                | 1:N          | `TICKETCOMMENT`       | `author` (ForeignKey)    | Un usuario puede ser autor de N comentarios         |

---

## Notas de Implementación

- **Claves primarias:** Todas las entidades usan `BigAutoField` generado automáticamente por Django.
- **`CLIENT.client_type_new`:** Campo `ForeignKey` hacia `ServiceCatalog` con `on_delete=SET_NULL`, permitiendo `null`. Sustituye al campo legacy `client_type` (CharField de tipo enum).
- **`CLIENTSERVICE.work_order`:** Relación `OneToOneField` inversa; existe **como máximo una** `WorkOrder` por instancia de servicio (la orden es opcional — un servicio puede estar activo sin una orden de trabajo registrada).
- **`BILLINGRECORD.iva_amount` y `total`:** Calculados automáticamente en `save()` (IVA = 15 % del monto base).
- **`INVOICEITEM.total_price`:** Calculado automáticamente como `quantity × unit_price`.
- **`CLIENTSERVICE.status` → `CLIENT.active_status`/`prospect_status`:** Sincronización automática via override de `save()`.
- **Campos de auditoría:** La mayoría de entidades incluyen `created_at` y `updated_at` (auto-gestionados por Django).
