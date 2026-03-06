#!/bin/bash

# Asegurarse de que el script se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, ejecuta este script como root (usando sudo)."
  exit 1
fi

echo "Iniciando limpieza segura del directorio /var..."

# 1. Limpiar la caché del gestor de paquetes APT (paquetes .deb descargados)
echo "[1/4] Limpiando la caché de apt..."
apt-get clean
apt-get autoremove -y

# 2. Limpiar logs del sistema de systemd (journalctl)
echo "[2/4] Limitando el tamaño de los logs de journalctl a 100M y 3 días..."
journalctl --vacuum-time=3d
journalctl --vacuum-size=100M

# 3. Rotar y truncar (vaciar) archivos de registro (logs) tradicionales
echo "[3/4] Limpiando archivos de logs antiguos y vaciando los actuales..."
# Eliminar logs comprimidos antiguos (más de 3 días)
find /var/log -type f -name "*.gz" -mtime +3 -delete
find /var/log -type f -name "*.[0-9]" -mtime +3 -delete

# Truncar los logs actuales sin borrarlos (para no romper servicios que los tienen abiertos)
find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
[ -f /var/log/syslog ] && truncate -s 0 /var/log/syslog
[ -f /var/log/messages ] && truncate -s 0 /var/log/messages
[ -f /var/log/auth.log ] && truncate -s 0 /var/log/auth.log
[ -f /var/log/kern.log ] && truncate -s 0 /var/log/kern.log
[ -f /var/log/daemon.log ] && truncate -s 0 /var/log/daemon.log

# 4. Limpiar /var/tmp (archivos temporales con más de 7 días de antigüedad)
echo "[4/4] Limpiando archivos temporales en /var/tmp..."
find /var/tmp -type f -mtime +7 -delete

echo "========================================="
echo "¡Limpieza completada con éxito!"
echo "Espacio en disco actual en /var:"
df -h /var
echo "========================================="
