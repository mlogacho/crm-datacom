# CRM DataCom

Sistema de gestion comercial interna para DataCom S.A.

## Descripcion

CRM DataCom es una aplicacion web para administrar el ciclo comercial interno de DataCom S.A. desde una sola plataforma.

## Proposito

- Gestion de clientes (prospectos y clientes activos)
- Gestion de contactos por cliente
- Gestion de oportunidades de venta y estados comerciales
- Seguimiento comercial mediante historial de estados
- Gestion de actividades del equipo de ventas (servicios, soporte y facturacion asociados)

## Tecnologias

### Backend

- Django 5.2.11
- Python 3.10+
- Django REST Framework
- django-filter
- django-cors-headers

### Base de datos

- SQLite3 (configuracion por defecto en desarrollo)
- PostgreSQL (cuando se define DB_NAME en variables de entorno)

### Frontend

- React 19 (Vite)
- Tailwind CSS 3
- Axios

### Servicios y modulos de negocio detectados

- Core (autenticacion, roles, usuarios)
- Clients (clientes, contactos, historial)
- Services (catalogo, servicios contratados, ordenes de trabajo)
- Support (tickets y comentarios)
- Billing (facturas y registros de facturacion)

## Estado

En desarrollo activo (version alpha).

Evidencia en repositorio:
- Version de frontend en etapa inicial (`frontend/package.json`: `0.0.0`)
- Presencia de base local `db.sqlite3`
- Modulos funcionales ya implementados en backend

## Autor y responsable

Marco Logacho — Director de Desarrollo Digital e IA, DataCom S.A.

## Repositorio publico

https://github.com/mlogacho/crm-datacom

## Instalacion rapida

- **Desarrollo**: `pip install -r requirements.txt` y `python manage.py runserver`
- **Producción**: `sudo bash /var/www/crm-datacom/deploy.sh` (actualización automatizada)

## Estructura de carpetas (actual)

```text
.
├── billing/
├── clients/
├── core/
├── crm_backend/
├── docs/
├── frontend/
├── scripts/
├── services/
├── support/
├── tests/
├── manage.py
├── requirements.txt
├── deploy.sh
├── .env.example
├── .gitignore
├── Makefile
├── CHANGELOG.md
└── README.md
```
