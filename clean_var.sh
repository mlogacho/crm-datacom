#!/bin/bash

# Asegurarse de que el script se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, ejecuta este script como root (usando sudo)."
  exit 1
fi

echo "========================================="
echo "Iniciando LIMPIEZA PROFUNDA de /var..."
echo "Objetivo: Reducir uso de disco significativamente"
echo "========================================="

# 1. Limpiar la caché del gestor de paquetes APT
echo "[1/6] Limpiando caché de apt y paquetes innecesarios..."
apt-get clean
apt-get autoremove --purge -y
apt-get autoclean

# 2. Limpiar logs del sistema (journalctl) - Más agresivo (1 día)
echo "[2/6] Reduciendo logs de journalctl al mínimo (1 día)..."
journalctl --vacuum-time=1d
journalctl --vacuum-size=50M

# 3. Limpiar archivos de registro (logs) tradicionales
echo "[3/6] Eliminando logs comprimidos y vaciando logs activos..."
find /var/log -type f -name "*.gz" -delete
find /var/log -type f -name "*.[0-9]" -delete

# Truncar logs actuales
find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
for f in syslog messages auth.log kern.log daemon.log mail.log; do
    [ -f /var/log/$f ] && truncate -s 0 /var/log/$f
done

# 4. Limpiar /var/tmp y /var/cache
echo "[4/6] Limpiando archivos temporales y caché del sistema..."
find /var/tmp -type f -atime +2 -delete
# Limpieza selectiva de caché (solo archivos, no directorios)
find /var/cache -type f -atime +7 -delete

# 5. LIMPIEZA DE DOCKER (El mayor consumidor de espacio)
if command -v docker >/dev/null 2>&1; then
    echo "[5/6] Detectado Docker. Limpiando contenedores, redes e imágenes huérfanas..."
    # Limpia todo lo que no esté en uso (fuerza la limpieza)
    docker system prune -f
    # Opcional: docker image prune -a -f # Para borrar TODAS las imágenes sin contenedores activos
    echo "Sugerencia: Si aún falta espacio, corre 'docker system prune -af --volumes' manualmente."
else
    echo "[5/6] Docker no está instalado. Saltando..."
fi

# 6. Identificar archivos grandes restantes (Informativo)
echo "[6/6] Analizando archivos grandes restantes en /var (Top 5)..."
du -ah /var | sort -rh | head -n 5

echo "========================================="
echo "¡Limpieza PROFUNDA completada!"
echo "Estado actual del disco en /var:"
df -h /var
echo "========================================="
