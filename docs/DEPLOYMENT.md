# Guía de Despliegue — CRM DataCom

> Instrucciones para desplegar el proyecto en un servidor Debian/Ubuntu + Nginx + Gunicorn.

---

## Tabla de Contenidos

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Preparación del Servidor](#2-preparación-del-servidor)
3. [Configuración de la Base de Datos](#3-configuración-de-la-base-de-datos-postgresql)
4. [Instalación del Proyecto](#4-instalación-del-proyecto)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Migraciones y Datos Iniciales](#6-migraciones-y-datos-iniciales)
7. [Frontend (Build de Producción)](#7-frontend-build-de-producción)
8. [Gunicorn como Servicio systemd](#8-gunicorn-como-servicio-systemd)
9. [Configuración de Nginx](#9-configuración-de-nginx)
10. [Verificación Final](#10-verificación-final)
11. [Actualización de la Aplicación](#11-actualización-de-la-aplicación)

---

## 1. Requisitos del Sistema

| Componente | Versión mínima |
|---|---|
| Debian / Ubuntu | 11 (Bullseye) o superior |
| Python | 3.10+ |
| Node.js | 18+ (solo para compilar el frontend) |
| npm | 9+ |
| PostgreSQL | 14+ |
| Nginx | 1.18+ |
| Git | 2.34+ |

---

## 2. Preparación del Servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git nginx postgresql postgresql-contrib curl
```

Instalar Node.js 20 (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Configuración de la Base de Datos (PostgreSQL)

```bash
sudo -u postgres psql
```

Dentro de `psql`:
```sql
CREATE DATABASE crm_datacom;
CREATE USER crm_user WITH PASSWORD 'tu_password_seguro';
ALTER ROLE crm_user SET client_encoding TO 'utf8';
ALTER ROLE crm_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE crm_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE crm_datacom TO crm_user;
\q
```

---

## 4. Instalación del Proyecto

```bash
# Clonar el repositorio
cd /var/www
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom

# Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

---

## 5. Variables de Entorno

Copiar la plantilla y completar con los valores de producción:

```bash
cp .env.example .env
nano .env
```

Contenido de `.env` para producción:
```ini
SECRET_KEY=tu_clave_secreta_muy_larga_y_aleatoria
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,tu-ip-publica

DB_NAME=crm_datacom
DB_USER=crm_user
DB_PASSWORD=tu_password_seguro
DB_HOST=localhost
DB_PORT=5432

MEDIA_ROOT=/var/www/crm-datacom/media
```

---

## 6. Migraciones y Datos Iniciales

```bash
source venv/bin/activate

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario administrador
python manage.py createsuperuser

# Poblar catálogo de servicios (si existe el script)
python manage.py shell < populate_catalog.py

# Recolectar archivos estáticos del admin Django
python manage.py collectstatic --no-input
```

---

## 7. Frontend (Build de Producción)

```bash
cd frontend/
npm install
npm run build
cd ..
```

El build generará los archivos estáticos en `frontend/dist/`. Nginx los servirá directamente.

---

## 8. Gunicorn como Servicio systemd

Crear el archivo de socket:

```bash
sudo nano /etc/systemd/system/crm_datacom.socket
```

```ini
[Unit]
Description=CRM DataCom Gunicorn Socket

[Socket]
ListenStream=/run/crm_datacom.sock

[Install]
WantedBy=sockets.target
```

Crear el archivo de servicio:

```bash
sudo nano /etc/systemd/system/crm_datacom.service
```

```ini
[Unit]
Description=CRM DataCom Gunicorn Service
Requires=crm_datacom.socket
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/crm-datacom
ExecStart=/var/www/crm-datacom/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/run/crm_datacom.sock \
          crm_backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

Habilitar y arrancar:

```bash
sudo systemctl daemon-reload
sudo systemctl start crm_datacom.socket
sudo systemctl enable crm_datacom.socket
sudo systemctl start crm_datacom
sudo systemctl enable crm_datacom
```

---

## 9. Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/crm_datacom
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com tu-ip-publica;

    # Frontend React (SPA)
    root /var/www/crm-datacom/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Django
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/run/crm_datacom.sock;
    }

    # Django Admin
    location /admin/ {
        include proxy_params;
        proxy_pass http://unix:/run/crm_datacom.sock;
    }

    # Archivos estáticos del admin Django
    location /static/ {
        alias /var/www/crm-datacom/static_collected/;
    }

    # Archivos multimedia (evidencias, fotos de perfil)
    location /media/ {
        alias /var/www/crm-datacom/media/;
    }

    client_max_body_size 20M;
}
```

Habilitar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/crm_datacom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 10. Verificación Final

```bash
# Estado de servicios
sudo systemctl status crm_datacom
sudo systemctl status nginx

# Logs en tiempo real
sudo journalctl -u crm_datacom -f

# Verificar que el socket exista
ls -la /run/crm_datacom.sock
```

Acceder en el navegador a `http://tu-dominio.com` — debe cargar el frontend React.

Verificar la API: `http://tu-dominio.com/api/`

---

## 11. Actualización de la Aplicación

```bash
cd /var/www/crm-datacom

# Obtener cambios del repositorio
git pull origin main

# Activar entorno virtual
source venv/bin/activate

# Actualizar dependencias si cambiaron
pip install -r requirements.txt

# Ejecutar migraciones nuevas
python manage.py migrate

# Rebuildar el frontend si hubo cambios
cd frontend && npm install && npm run build && cd ..

# Reinicar Gunicorn
sudo systemctl restart crm_datacom

# Si hubo cambios en archivos estáticos del admin
python manage.py collectstatic --no-input
```

---

## Permisos de Carpetas

```bash
sudo chown -R www-data:www-data /var/www/crm-datacom/media/
sudo chown -R www-data:www-data /var/www/crm-datacom/static_collected/
sudo chmod -R 755 /var/www/crm-datacom/
```
