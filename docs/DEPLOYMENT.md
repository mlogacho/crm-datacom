# Guía de Despliegue — CRM DataCom

**Documento de Instalación y Configuración**  
**Versión**: 0.1.0-alpha  
**Última actualización**: Marzo 2026

---

## 1. Requisitos del Servidor

### Hardware Mínimo

- **CPU**: 2 cores (4 recomendado para producción)
- **RAM**: 2 GB (4-8 GB recomendado de acuerdo con concurrencia esperada)
- **Almacenamiento**: 10 GB (SSD recomendado, HDD mínimo 20 GB)
- **Ancho de banda**: 50 Mbps (depende de uso)

### Sistema Operativo Soportado

- **Linux**: Ubuntu 20.04 LTS, Ubuntu 22.04 LTS, Debian 11+ (recomendado)
- **macOS**: Big Sur 11+ (desarrollo)
- **Windows**: WSL2 (development solamente, no producción)

### Requisitos de Software

**Desarrollo**:
```bash
Python 3.10+
pip (gestor de paquetes Python)
Git
Node.js 16+ (para frontend)
```

**Producción**:
```bash
Python 3.10+
PostgreSQL 9.6+
Gunicorn o similar (WSGI application server)
Nginx (reverse proxy/web server)
Supervisor o systemd (process management)
```

---

## 2. Clone e Instalación Inicial

### 2.1 Clonar Repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom

# Verificar rama principal
git status
```

### 2.2 Crear Entorno Virtual

**En Linux/macOS**:
```bash
# Crear ambiente virtual
python3 -m venv venv

# Activar
source venv/bin/activate
```

**En Windows (PowerShell)**:
```powershell
# Crear ambiente virtual
python -m venv venv

# Activar
.\venv\Scripts\Activate.ps1
```

### 2.3 Instalar Dependencias Backend

```bash
# Actualizar pip
pip install --upgrade pip

# Instalar requisitos
pip install -r requirements.txt

# Verificar instalación
python manage.py --version
```

### 2.4 Instalar Dependencias Frontend (Opcional para Desarrollo)

```bash
cd frontend

# Instalar dependencias npm
npm install

# Verificar
npm --version
```

---

## 3. Configuración de Variables de Entorno

### 3.1 Crear Archivo .env

```bash
# Copiar plantilla
cp .env.example .env

# Editar con valores del entorno
nano .env
# o
vim .env
```

### 3.2 Configurar por Entorno

**Desarrollo** (SQLite3, DEBUG=True):
```bash
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1
# Base de datos SQLite (por defecto, no configurar DB_* variables)
```

**Producción** (PostgreSQL, DEBUG=False):
```bash
DEBUG=False
SECRET_KEY=your-very-long-random-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_NAME=crm_datacom_prod
DB_USER=crm_user
DB_PASSWORD=strong-password-here
DB_HOST=db.yourdomain.com
DB_PORT=5432
# Correo
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=crm@yourdomain.com
EMAIL_HOST_PASSWORD=app-password
```

Ver sección 3.3 para tabla completa de variables.

### 3.3 Variables de Entorno Disponibles

Todas las variables están documentadas en `.env.example`. Consulta ese archivo para descripciones y valores de ejemplo.

---

## 4. Configuración de Base de Datos

### 4.1 Desarrollo (SQLite3 - Defecto)

SQLite está configurado por defecto. No requiere configuración:

```bash
# Django usará: db.sqlite3 (en raíz del proyecto)
# No necesitas variables de entorno de BD
```

**Ventajas**:
- Sin instalación requerida
- Perfecto para desarrollo local
- Incluye datos en archivo

**Desventajas**:
- No soporta usuarios/permisos
- No es concurrente
- No para producción

### 4.2 Producción (PostgreSQL)

#### Instalación de PostgreSQL

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Crear Base de Datos y Usuario

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# En la consola PostgreSQL:
CREATE DATABASE crm_datacom;
CREATE USER crm_user WITH PASSWORD 'your-secure-password';
ALTER ROLE crm_user SET client_encoding TO 'utf8';
ALTER ROLE crm_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE crm_user SET default_transaction_deferrable TO on;
ALTER ROLE crm_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE crm_datacom TO crm_user;
\q
```

#### Configurar .env para PostgreSQL

```bash
DB_NAME=crm_datacom
DB_USER=crm_user
DB_PASSWORD=your-secure-password
DB_HOST=localhost          # o si es remoto: db.empresa.com
DB_PORT=5432
```

#### Instalar Driver Python

```bash
pip install psycopg2-binary
```

---

## 5. Aplicación de Migraciones

Las migraciones actualizan la base de datos al esquema definido en los modelos.

### 5.1 Command de Migración

```bash
# Ver estado de migraciones
python manage.py showmigrations

# Aplicar todas las migraciones pendientes
python manage.py migrate

# Si algo sale mal, rollback a versión anterior
python manage.py migrate [app_name] [migration_name]
```

### 5.2 Ejecutar desde Cero (Nueva Instalación)

```bash
# Asegúrate que .env esté configurado correctamente

# Aplicar migraciones de todas las apps
python manage.py migrate

# Verificar que se crearon las tablas
python manage.py sqlmigrate clients 0001  # muestra SQL de migración
```

### 5.3 Crear Migraciones para Cambios en Modelos

Si modificas `models.py`:

```bash
# Crear nueva migración
python manage.py makemigrations

# Revisar cambios antes de aplicar
python manage.py sqlmigrate [app] [number]

# Aplicar
python manage.py migrate
```

---

## 6. Carga de Datos Iniciales

### 6.1 Fixtures (Datos de Prueba)

Si existen archivos de fixtures con catálogos iniciales:

```bash
# Cargar fixture específico
python manage.py loaddata [fixture_name]

# Ejemplo (si existe):
python manage.py loaddata service_catalog
```

**Nota**: Actualmente no hay fixtures predefinidas. Se completarán cuando el admin cree datos iniciales.

### 6.2 Catálogos Iniciales (Manual)

Accede a: http://localhost:8000/admin

1. **Catálogos de Servicios**: Services → Service Catalog
   - Agregar servicios estándar (Housing, Telecom, App Dev)
   - Definir precios base y costos

2. **Roles**: Core → Roles
   - Admin, Sales Manager, Support Agent, etc.
   - Listadeview permitidas para cada rol

3. **Usuarios Iniciales**: Creados en paso siguiente

---

## 7. Creación de Superusuario

El superusuario es el usuario administrador con acceso total.

```bash
# Comando interactivo
python manage.py createsuperuser

# Ejemplo de entrada:
# Username: admin
# Email: admin@datacom.com.ec
# Password: (entra contraseña segura)
# Password (again): (confirma)
# Superuser created successfully.
```

Luego accede a: **http://localhost:8000/admin**

---

## 8. Ejecución en Desarrollo

### 8.1 Levantar Django Development Server

```bash
# Desde venv activado, en raíz del proyecto
python manage.py runserver

# Por defecto en: http://localhost:8000
# Acceso admin: http://localhost:8000/admin
```

### 8.2 Levantar Frontend en Paralelo (opcional)

En otra terminal:

```bash
cd frontend
npm run dev

# Por defecto en: http://localhost:5173
```

### 8.3 Verificar Salud del Sitio

```bash
# En navegador o curl:
curl http://localhost:8000/api/

# Debería retornar un JSON con endpoints disponibles
```

---

## 9. Despliegue en Producción

### 9.1 Preparación Pre-Despliegue

```bash
# 1. Actualizar .env con credenciales reales
DEBUG=False
SECRET_KEY=[generar clave segura]
ALLOWED_HOSTS=yourdomain.com

# 2. Colectar archivos estáticos
python manage.py collectstatic --noinput

# 3. Verificar configuración
python manage.py check --deploy
```

### 9.2 Opción 1: Gunicorn + Nginx (Recomendado)

#### Instalar Gunicorn

```bash
pip install gunicorn
```

#### Script de Inicio (systemd)

Crear `/etc/systemd/system/crm-datacom.service`:

```ini
[Unit]
Description=CRM DataCom Django Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/home/appuser/crm-datacom
Environment="PATH=/home/appuser/crm-datacom/venv/bin"
ExecStart=/home/appuser/crm-datacom/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    --timeout 60 \
    crm_backend.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Iniciar Servicio

```bash
sudo systemctl daemon-reload
sudo systemctl start crm-datacom
sudo systemctl enable crm-datacom
```

#### Configuración Nginx (Reverse Proxy)

Crear `/etc/nginx/sites-available/crm-datacom`:

```nginx
upstream crm_app {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://crm_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/appuser/crm-datacom/staticfiles/;
        expires 30d;
    }

    location /media/ {
        alias /home/appuser/crm-datacom/media/;
        expires 7d;
    }
}
```

#### Habilitar Sitio Nginx

```bash
sudo ln -s /etc/nginx/sites-available/crm-datacom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9.3 Opción 2: Docker (Futuro)

Dockerfile y docker-compose.yml están pendientes de creación.

---

## 10. Reinicio y Gestión de Servicios

### 10.1 Reinicio de Gunicorn

```bash
sudo systemctl restart crm-datacom
```

### 10.2 Reinicio de Nginx

```bash
sudo systemctl restart nginx
```

### 10.3 Ver Logs

```bash
# Logs de aplicación
sudo journalctl -u crm-datacom -f

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### 10.4 Recargar en Vivo (sin downtime)

```bash
# Gunicorn
sudo systemctl reload crm-datacom

# Nginx
sudo nginx -s reload
```

---

## 11. Acceso Inicial al Sistema

### 11.1 URLs de Acceso

| URL | Propósito | Acceso |
|-----|-----------|--------|
| `http://yourdomain.com/` | Frontend principal | Público |
| `http://yourdomain.com/admin/` | Panel administrativo | Autenticado (staff) |
| `http://yourdomain.com/api/` | API REST | Token auth requerido |

### 11.2 Usuario por Defecto

- **Username**: admin (creado en paso "Creación de Superusuario")
- **Email**: admin@datacom.com.ec (o el ingresado)
- **Contraseña**: La ingresada durante creación

### 11.3 Primeros Pasos en Producción

1. Acceder a `/admin/` con superusuario
2. Crear catálogo inicial de servicios
3. Crear roles para el equipo
4. Crear usuarios regular (no superusers)
5. Configurar correo (EMAIL_* en .env)
6. Testar API: `curl -H "Authorization: Token YOUR_TOKEN" http://yourdomain.com/api/`

---

## 12. Backup y Recuperación

### 12.1 Backup de Base de Datos

**PostgreSQL**:
```bash
# Full backup
pg_dump crm_datacom > backups/crm_datacom_$(date +%Y%m%d).sql

# Con compresión
pg_dump crm_datacom | gzip > backups/crm_datacom_$(date +%Y%m%d).sql.gz
```

**SQLite**:
```bash
cp db.sqlite3 backups/db.sqlite3.$(date +%Y%m%d)
```

### 12.2 Backup de Archivos Subidos

```bash
# Media files
tar -czf backups/media_$(date +%Y%m%d).tar.gz media/
```

### 12.3 Restauración

**PostgreSQL**:
```bash
# Restaurar desde backup
psql crm_datacom < backups/crm_datacom_YYYYMMDD.sql

# O con compresión
gunzip < backups/crm_datacom_YYYYMMDD.sql.gz | psql crm_datacom
```

### 12.4 Script de Backup Automático

Crear `/home/appuser/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/crm-datacom"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup BD
pg_dump crm_datacom | gzip > ${BACKUP_DIR}/db_${DATE}.sql.gz

# Backup media
tar -czf ${BACKUP_DIR}/media_${DATE}.tar.gz /home/appuser/crm-datacom/media

# Mantener solo últimos 30 días
find ${BACKUP_DIR} -type f -mtime +30 -delete

echo "Backup completado: ${DATE}"
```

Programar con cron:
```bash
0 2 * * * /home/appuser/backup.sh  # A las 2 AM diariamente
```

---

## 13. Monitoreo y Logs

### 13.1 Logs de Aplicación

```bash
# En desarrollo
python manage.py runserver 2>&1 | tee logs/development.log
```

**En producción**, los logs están en:
- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`
- `journalctl -u crm-datacom`

### 13.2 Configurar Logging Avanzado

En `crm_backend/settings.py` (futuro):
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/crm.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

---

## 14. Troubleshooting

### 14.1 Error: "ModuleNotFoundError: No module named 'django'"

**Solución**: Verificar que venv esté activado
```bash
# Verificar
echo $VIRTUAL_ENV
# Debe mostrar ruta a venv/

# Si no, activar
source venv/bin/activate
```

### 14.2 Error: "ProgrammingError: column does not exist"

**Solución**: Migraciones no aplicadas
```bash
python manage.py migrate
```

### 14.3 Error: "CORS origin not allowed"

**Solución**: En `.env`, configurar CORS_ALLOWED_ORIGINS o cambiar en settings.py (no recomendado en producción)

### 14.4 Puerto 8000 ya en uso

```bash
# Buscar qué process lo está usando
lsof -i :8000

# O ejecutar en puerto diferente
python manage.py runserver 8001
```

### 14.5 Static files no cargando

```bash
# Colectar estáticos
python manage.py collectstatic --noinput

# Verificar directorios existen
ls -la staticfiles/
```

---

## 15. Checklist de Despliegue

- [ ] Clonar repositorio
- [ ] Crear venv e instalar dependencias
- [ ] Configurar .env con valores reales
- [ ] Aplicar migraciones de BD
- [ ] Colectar estáticos
- [ ] Crear superusuario
- [ ] Cargar catálogos iniciales (fixtures o manual)
- [ ] Testear en desarrollo (runserver)
- [ ] Pasar .env a valores de producción
- [ ] Instalar PostgreSQL (si es producción)
- [ ] Instalar y configurar Gunicorn
- [ ] Configurar Nginx como reverse proxy
- [ ] Habilitar HTTPS con SSL certificate (Let's Encrypt)
- [ ] Configurar systemd para autoinicio
- [ ] Testear en producción
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo y alertas

---

**Documento de referencia**: Marco Logacho, Director de Desarrollo Digital e IA  
**Organización**: DataCom S.A.  
**Soporte técnico**: [contacto en desarrollo]  
**Última actualización**: Marzo 2026
