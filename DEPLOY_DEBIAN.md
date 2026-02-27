# Guía de Despliegue - CRM DATACOM (Debian)

## 1. Requisitos Previos en el Servidor Debian
Actualiza el sistema e instala los requerimientos esenciales. Para evitar el típico conflicto de dependencias de Debian con `npm`, instalaremos Node.js desde su repositorio oficial seguro:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-venv python3-pip postgresql postgresql-contrib nginx redis-server curl -y

# Instalar Node.js (que ya incluye npm automáticament) sin conflictos:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 2. Configurar PostgreSQL (Producción)
Ingresa al motor de base de datos que instalaste:
```bash
sudo -u postgres psql
```
Genera la base de datos empresarial y sus privilegios (cambia la contraseña de ser necesario):
```sql
CREATE DATABASE datacom_crm;
CREATE USER datacom_user WITH PASSWORD 'tu_password_segura';
ALTER ROLE datacom_user SET client_encoding TO 'utf8';
ALTER ROLE datacom_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE datacom_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE datacom_crm TO datacom_user;
\q
```

## 3. Configurar Backend (Django + API)
1. Copia toda esta carpeta `CRM Datacom` a tu servidor Debian, idealmente en `/var/www/crm_datacom`.
2. Crea el entorno virtual y actívalo:
   ```bash
   cd /var/www/crm_datacom
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt --break-system-packages
   pip install gunicorn --break-system-packages
   ```
3. Crea un archivo oculto llamadado `.env` en la raíz donde está `manage.py`:
   ```ini
   DB_NAME=datacom_crm
   DB_USER=datacom_user
   DB_PASSWORD=tu_password_segura
   DB_HOST=localhost
   DB_PORT=5432
   ```
4. Aplica las migraciones de Django directamente a tu servidor PostgreSQL:
   ```bash
   python3 manage.py migrate
   python3 manage.py createsuperuser
   python3 manage.py collectstatic
   ```

## 4. Demonizar Gunicorn
Para el servicio API necesitamos un Socket que comunique Django con Nginx todo el tiempo en segundo plano.

Genera el servicio: 
`sudo nano /etc/systemd/system/gunicorn.service`
```ini
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/crm_datacom
ExecStart=/var/www/crm_datacom/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/var/www/crm_datacom/crm_backend.sock crm_backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

Luego inicialízalo:
```bash
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
```

## 5. Compilar el Frontend de React
```bash
cd /var/www/crm_datacom/frontend
npm install
npm run build
```
*Vite compilará react y tailwind en la carpeta `dist`. Es extremadamente rápido y generará archivos puramente estáticos html+js+css.*

## 6. Configurar el Servidor Web Proxy (Nginx)
`sudo nano /etc/nginx/sites-available/crm_datacom`
```nginx
server {
    listen 80;
    server_name tu_dominio_o_ip_del_servidor; # Ej. 10.11.121.58

    # Redirige el tráfico de la API y el panel de Administrador al Socket de Python
    location ~ ^/(api|admin) {
        include proxy_params;
        proxy_pass http://unix:/var/www/crm_datacom/crm_backend.sock;
    }

    # Sirve los estáticos del Panel de Administrador nativo de Django
    location /static/ {
        alias /var/www/crm_datacom/static/;
    }

    # Sirve la aplicación de Single Page (React Dashboard) a los visitantes web
    location / {
        root /var/www/crm_datacom/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Habilítalo en tu Debian:
```bash
sudo ln -s /etc/nginx/sites-available/crm_datacom /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

¡Listo! Para este punto, al ingresar a tu servidor Debian por el navagador verás el moderno Dashboard de React, y si entras a `/admin` verás el panel oficial de Django, estando ambos comunicados a PostgreSQL.
