#!/bin/bash

# Script de Limpieza de Emergencia para /var (Debian)
# Ejecutar con: sudo bash cleanup_var.sh

echo "--- Iniciando limpieza de /var ---"

# 1. Limpiar caché de apt
echo "Limpiando caché de paquetes (apt)..."
apt-get clean
apt-get autoremove -y

# 2. Limpiar logs del journal (sistema) - mantener solo últimos 3 días
echo "Limpiando logs de systemd-journald..."
journalctl --vacuum-time=3d

# 3. Eliminar logs rotados (.gz y .1) que suelen ocupar mucho espacio
echo "Eliminando logs antiguos rotados..."
find /var/log -type f -name "*.gz" -delete
find /var/log -type f -name "*.1" -delete

# 4. Vaciar archivos de log que ya fueron procesados pero no rotados (opcional pero efectivo)
# Nota: Esto mantiene el archivo pero lo deja en 0 bytes.
truncate -s 0 /var/log/syslog
truncate -s 0 /var/log/auth.log
truncate -s 0 /var/log/kern.log

echo "--- Limpieza completada ---"
df -h /var
