# Guia de Despliegue — CRM DataCom

## 1. Requisitos del servidor

- Sistema operativo recomendado: Debian 11+ o Ubuntu 22.04+
- Python: 3.10 o superior
- pip: actualizado
- Git: para clonar y actualizar codigo
- Node.js 18+ (si se compila frontend en el servidor)

Estado detectado en repositorio:
- Entorno de desarrollo activo con Django
- Base por defecto SQLite y soporte opcional para PostgreSQL mediante variables DB_*

## 2. Clonacion del repositorio

```bash
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom
```

Si ya existe copia local:

```bash
git pull origin main
```

## 3. Creacion y activacion del entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

## 4. Instalacion de dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 5. Configuracion de variables de entorno

```bash
cp .env.example .env
```

Completar variables del archivo .env segun el entorno.

Referencia:
- Archivo plantilla: `.env.example`
- Variables detectadas en codigo: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

## 6. Aplicacion de migraciones

```bash
python manage.py migrate
```

## 7. Carga de datos iniciales (fixtures)

No se detectaron fixtures de negocio en el repositorio actual.

Comando a usar cuando existan:

```bash
python manage.py loaddata <fixture_name>
```

Marcador:
- [PENDIENTE — completar cuando se implemente] catalogos iniciales oficiales

## 8. Creacion de superusuario

```bash
python manage.py createsuperuser
```

## 9. Automatización de despliegue (Recomendado)

Para entornos de producción (como el servidor `10.11.121.58`), se ha implementado un script de automatización que realiza la actualización de código, reconstrucción del entorno virtual, instalación de dependencias y reinicio del servicio de forma segura.

### Uso del script deploy.sh

El script se encuentra en la raíz del proyecto y debe ejecutarse con privilegios de superusuario:

```bash
sudo bash /var/www/crm-datacom/deploy.sh
```

**Lo que hace el script:**
1.  **Actualización**: Hace un `git fetch` y `git reset --hard origin/main` para asegurar que el servidor tenga la versión exacta de GitHub.
2.  **Entorno**: Borra y recrea el `venv` para evitar conflictos de librerías o symlinks rotos.
3.  **Dependencias**: Instala todo lo listado en `requirements.txt` junto con `gunicorn`, `Pillow`, `pyotp` y `qrcode`.
4.  **Migraciones**: Ejecuta `python manage.py migrate` automáticamente.
5.  **Reinicio**: Reinicia el servicio `gunicorn-crm` mediante `systemctl`.

## 10. Ejecución en desarrollo vs producción

### Desarrollo

```bash
python manage.py runserver
```

Backend disponible en:
- http://127.0.0.1:8000

Frontend (si se usa en local):

```bash
cd frontend
npm install
npm run dev
```

### Producción

El servidor de producción utiliza **Gunicorn** como servidor de aplicaciones WSGI y **Nginx** como proxy inverso.

Servidor actual: `10.11.121.58`
Servicio systemd: `gunicorn-crm.service`
Directorio base: `/var/www/crm-datacom`

## 11. Reinicio de servicios manual

Si no deseas usar el script automático, puedes reiniciar el servicio manualmente:

```bash
sudo systemctl restart gunicorn-crm
sudo systemctl restart nginx
```

## 12. Acceso inicial al sistema

- Backend API: http://127.0.0.1:8000/api/
- Admin Django: http://127.0.0.1:8000/admin/

Usuario inicial:
- Se define durante `createsuperuser`
- No existe usuario por defecto versionado en el repositorio
