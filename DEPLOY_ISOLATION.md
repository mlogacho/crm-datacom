# Guía de Aislamiento de Múltiples Aplicaciones (Debian)

¡Felicidades por tener el CRM funcionando perfectamente con seguridad nivel bancario! 

Si deseas alojar múltiples aplicaciones (por ejemplo, `Datacom CRM` y `WebISO`) en el **mismo servidor Debian**, inevitablemente "chocarán" si intentan usar los mismos nombres genéricos para sus servicios, bases de datos o puertos.

Para asegurar de que ambas fluyan de forma **independiente y aislada**, debes establecer una regla sagrada: **El Principio del Sufijo Único**. A cada componente de infraestructura le debes inyectar el nombre de la app (ej. `-crm` o `-webiso`).

Aquí están los 4 pilares exactos para aislar cada aplicación. Aplica esta receta cada vez que crees un sistema nuevo en el servidor.

---

## 1. Aislamiento de Directorios
Cada aplicación debe vivir en su propia carpeta en `/var/www/`, y debe tener su propio entorno virtual (`venv`) para que las librerías de Python no se mezclen.

**App A (CRM):**
- Carpeta: `/var/www/crm_datacom`
- Venv: `/var/www/crm_datacom/venv`

**App B (WebISO):**
- Carpeta: `/var/www/webiso`
- Venv: `/var/www/webiso/venv`

---

## 2. Aislamiento de Base de Datos (PostgreSQL)
Nunca mezcles tablas en una misma base de datos. Crea una base exclusiva y un usuario de Postgres exclusivo por proyecto.

**App A (CRM):**
- Base de datos: `datacom_crm`
- Usuario: `datacom_user`

**App B (WebISO):**
- Base de datos: `webiso_db`
- Usuario: `webiso_user`

*(Por lo tanto, cada proyecto tendrá un archivo `.env` diferente apuntando a su propia DB).*

---

## 3. Aislamiento del Motor Gunicorn (Servicios SystemD)
Este es el error más común. No puedes llamar al servicio simplemente `gunicorn.service` porque la última app que instales aplastará a la anterior. **Debes crear archivos `.service` con nombres únicos**, y muy importante: **los Sockets (archivos `.sock`) deben ser diferentes**.

**App A (CRM):**
- Nombre del servicio: `sudo nano /etc/systemd/system/gunicorn-crm.service`
- Socket Binding: `--bind unix:/var/www/crm_datacom/crm_backend.sock`
- Para encenderlo: `sudo systemctl start gunicorn-crm`

**App B (WebISO):**
- Nombre del servicio: `sudo nano /etc/systemd/system/gunicorn-webiso.service`
- Socket Binding: `--bind unix:/var/www/webiso/webiso_backend.sock`
- Para encenderlo: `sudo systemctl start gunicorn-webiso`

*(Así, cuando necesites reiniciar el CRM no apagarás el sistema de calidad WebISO).*

---

## 4. Aislamiento del Tráfico Web (Nginx)
Nginx es el policía de tránsito que recibe todas las visitas por el puerto 80/443. Si las dos apps web escuchan a través de la misma IP genérica, Nginx se confunde. Aquí tienes dos caminos:

**Camino 1: Subdominios (El Mejor Método)**
Diferencias el tráfico indicándole a Nginx qué bloque usar en función del Subdominio (`server_name`) que digitó el usuario:

*Bloque en Nginx para CRM (`/etc/nginx/sites-available/crm`):*
```nginx
server {
    listen 80;
    server_name crm.tuempresa.com; # <- Tráfico sólo para CRM
    location ~ ^/(api|admin) {
        # ...
        proxy_pass http://unix:/var/www/crm_datacom/crm_backend.sock; # Pasa al socket del CRM
    }
    # ...
}
```

*Bloque en Nginx para WebISO (`/etc/nginx/sites-available/webiso`):*
```nginx
server {
    listen 80;
    server_name iso.tuempresa.com; # <- Tráfico sólo para WebISO
    location ~ ^/(api|admin) {
        # ...
        proxy_pass http://unix:/var/www/webiso/webiso_backend.sock; # Pasa al socket de WebISO
    }
    # ...
}
```

**Camino 2: Diferentes Puertos (Método Interno sin dominios)**
Si usas solo IPs internas (ej. `10.11.121.58`), Nginx no sabe diferenciarlas por el "nombre". En este caso aislas asignando puertos de entrada diferentes:

*Bloque Nginx CRM:*
```nginx
server {
    listen 80; # <- CRM vive en el puerto 80 por defecto
    server_name 10.11.121.58;
    # ...
```

*Bloque Nginx WebISO:*
```nginx
server {
    listen 81; # <- WebISO lo mueves al puerto 81
    server_name 10.11.121.58;
    # ...
```
*(Para entrar a WebISO las personas tendrían que digitar obligatoriamente en el navegador: `http://10.11.121.58:81`)*.

### Resumen de la Receta:
Si sigues esta metodología (Venv únicos, Bases únicas, Servicios `.service` nombrados únicos, Sockets únicos, y Bloques Nginx separados por subdominio o puerto), ¡puedes tener 10, 20 o 50 aplicaciones conviviendo pacíficamente bajo la cubierta metálica de un solo servidor Debian!
