#!/bin/bash

# ============================================================
# SCRIPT DE LIMPIEZA PROFUNDA DEL SERVIDOR
# Versión mejorada - Libera espacio en disco agresivamente
# ============================================================

# Asegurarse de que el script se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, ejecuta este script como root (usando sudo)."
  exit 1
fi

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}   LIMPIEZA PROFUNDA DEL SERVIDOR        ${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# Función para mostrar espacio liberado
show_disk_usage() {
    df -h / | awk 'NR==2 {printf "  Usado: %s / %s  (%s)\n", $3, $2, $5}'
}

echo -e "${YELLOW}📊 Estado del disco ANTES de la limpieza:${NC}"
show_disk_usage
df -h /var | awk 'NR==2 {printf "  /var: %s usados\n", $3}'
echo ""

# ──────────────────────────────────────────────────────────────
# [1] APT - Gestor de paquetes
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/10] 🧹 Limpiando caché de APT y paquetes innecesarios...${NC}"
apt-get clean -y
apt-get autoremove --purge -y
apt-get autoclean -y

# Eliminar listas de apt (se regeneran con apt update)
rm -rf /var/lib/apt/lists/*
echo -e "${GREEN}  ✔ APT limpiado${NC}"

# ──────────────────────────────────────────────────────────────
# [2] JOURNALS / LOGS DE SYSTEMD
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[2/10] 📋 Reduciendo logs de journalctl al mínimo...${NC}"
journalctl --vacuum-time=3d
journalctl --vacuum-size=30M
echo -e "${GREEN}  ✔ Journals reducidos${NC}"

# ──────────────────────────────────────────────────────────────
# [3] LOGS TRADICIONALES (/var/log)
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[3/10] 📁 Eliminando logs comprimidos y vaciando logs activos...${NC}"

# Eliminar logs comprimidos (*.gz, rotados *.1, *.2, etc.)
find /var/log -type f \( -name "*.gz" -o -name "*.bz2" -o -name "*.xz" \) -delete
find /var/log -type f -name "*.[0-9]" -delete
find /var/log -type f -name "*.[0-9][0-9]" -delete

# Truncar logs activos (no borrar, para no romper servicios)
find /var/log -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null
find /var/log -type f \( \
    -name "syslog" -o -name "messages" -o -name "auth.log" \
    -o -name "kern.log" -o -name "daemon.log" -o -name "mail.log" \
    -o -name "dpkg.log" -o -name "apt/history.log" -o -name "apt/term.log" \
    -o -name "nginx/access.log" -o -name "nginx/error.log" \
    -o -name "apache2/access.log" -o -name "apache2/error.log" \
    \) -exec truncate -s 0 {} \; 2>/dev/null

echo -e "${GREEN}  ✔ Logs limpiados${NC}"

# ──────────────────────────────────────────────────────────────
# [4] ARCHIVOS TEMPORALES (/tmp y /var/tmp)
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/10] 🗑️  Limpiando archivos temporales...${NC}"

# /var/tmp: eliminar archivos con más de 1 día
find /var/tmp -type f -mtime +1 -delete 2>/dev/null
find /var/tmp -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} \; 2>/dev/null

# /tmp: eliminar todo lo que no esté en uso
find /tmp -type f -atime +1 -delete 2>/dev/null
find /tmp -mindepth 1 -maxdepth 1 -not -name ".*" -mtime +1 -exec rm -rf {} \; 2>/dev/null

echo -e "${GREEN}  ✔ Temporales limpiados${NC}"

# ──────────────────────────────────────────────────────────────
# [5] CACHÉ DEL SISTEMA (/var/cache)
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/10] 💾 Limpiando caché del sistema...${NC}"

# Caché de apt (ya limpiado, pero también debajo)
rm -rf /var/cache/apt/archives/*.deb 2>/dev/null
rm -rf /var/cache/apt/pkgcache.bin 2>/dev/null
rm -rf /var/cache/apt/srcpkgcache.bin 2>/dev/null

# Otras cachés
find /var/cache -type f -atime +3 -delete 2>/dev/null

echo -e "${GREEN}  ✔ Caché del sistema limpiada${NC}"

# ──────────────────────────────────────────────────────────────
# [6] BACKUPS DE DPKG Y CONFIGURACIONES OBSOLETAS
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[6/10] 📦 Eliminando backups obsoletos de dpkg...${NC}"

# Eliminar archivos .dpkg-old y .dpkg-bak
find /etc -name "*.dpkg-old" -delete 2>/dev/null
find /etc -name "*.dpkg-bak" -delete 2>/dev/null
find /etc -name "*.ucf-old" -delete 2>/dev/null

# Limpiar paquetes en estado rc (removidos pero con archivos de configuración)
ORPHAN_PKGS=$(dpkg -l | grep "^rc" | awk '{print $2}' | tr '\n' ' ')
if [ -n "$ORPHAN_PKGS" ]; then
    echo "  Eliminando paquetes huérfanos: $ORPHAN_PKGS"
    dpkg --purge $ORPHAN_PKGS 2>/dev/null
fi

echo -e "${GREEN}  ✔ Backups obsoletos eliminados${NC}"

# ──────────────────────────────────────────────────────────────
# [7] PYTHON - pip cache
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[7/10] 🐍 Limpiando caché de pip y paquetes Python...${NC}"

# Limpiar caché de pip para root y otros usuarios
pip cache purge 2>/dev/null || true
pip3 cache purge 2>/dev/null || true

# Caché de pip en directorios de usuario
find /root -name "*.pyc" -delete 2>/dev/null
find /root -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find /home -name "*.pyc" -delete 2>/dev/null
find /home -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Caché de pip
rm -rf /root/.cache/pip 2>/dev/null
find /home -type d -name "pip" -path "*/.cache/pip" -exec rm -rf {} + 2>/dev/null

echo -e "${GREEN}  ✔ Caché de Python limpiada${NC}"

# ──────────────────────────────────────────────────────────────
# [8] NODE / NPM cache
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[8/10] 🟢 Limpiando caché de npm/node...${NC}"

if command -v npm > /dev/null 2>&1; then
    npm cache clean --force 2>/dev/null || true
fi
rm -rf /root/.npm 2>/dev/null
find /home -type d -name ".npm" -exec rm -rf {} + 2>/dev/null
find /tmp -name "npm-*" -type d -exec rm -rf {} + 2>/dev/null

echo -e "${GREEN}  ✔ Caché de npm limpiada${NC}"

# ──────────────────────────────────────────────────────────────
# [9] DOCKER - Limpieza AGRESIVA
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[9/10] 🐳 Limpieza AGRESIVA de Docker...${NC}"

if command -v docker > /dev/null 2>&1; then

    # Detener contenedores detenidos y redes no usadas
    echo "  → Eliminando contenedores detenidos..."
    docker container prune -f

    echo "  → Eliminando imágenes sin contenedores activos..."
    docker image prune -a -f

    echo "  → Eliminando volúmenes sin uso..."
    docker volume prune -f

    echo "  → Eliminando redes sin uso..."
    docker network prune -f

    echo "  → Limpieza global del sistema Docker (build cache, etc.)..."
    docker system prune -af --volumes

    echo ""
    echo -e "${YELLOW}  📊 Estado de Docker después de la limpieza:${NC}"
    docker system df

else
    echo "  Docker no está instalado. Saltando..."
fi

echo -e "${GREEN}  ✔ Docker limpiado${NC}"

# ──────────────────────────────────────────────────────────────
# [10] CORES, CRASH DUMPS Y ARCHIVOS BASURA
# ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[10/10] 💥 Eliminando crash dumps, cores y archivos basura...${NC}"

# Core dumps (Restringido para no colapsar el disco)
find /var /tmp /home -xdev -name "core" -type f -size +1M -delete 2>/dev/null
find /var/crash -type f -delete 2>/dev/null
find /var/lib/systemd/coredump -type f -delete 2>/dev/null

# Thumbnails y cachés de usuario
rm -rf /root/.cache/thumbnails 2>/dev/null
find /home -type d -name "thumbnails" -path "*/.cache/thumbnails" -exec rm -rf {} + 2>/dev/null

# Archivos de swap temporales de editores (vim, nano) (Restringido)
find /var /tmp /home -xdev -name "*.swp" -delete 2>/dev/null
find /var /tmp /home -xdev -name "*~" -size +1M -delete 2>/dev/null

echo -e "${GREEN}  ✔ Archivos basura eliminados${NC}"

# ──────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${GREEN}  ✅ LIMPIEZA PROFUNDA COMPLETADA        ${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${YELLOW}📊 Estado del disco DESPUÉS de la limpieza:${NC}"
show_disk_usage
df -h /var | awk 'NR==2 {printf "  /var: %s usados\n", $3}'
echo ""

echo -e "${YELLOW}🔍 TOP 10 directorios más grandes en el sistema:${NC}"
du -h --max-depth=3 / 2>/dev/null | sort -rh | head -n 10

echo ""
echo -e "${YELLOW}🔍 TOP 10 archivos más grandes en /var:${NC}"
find /var -type f -exec du -h {} + 2>/dev/null | sort -rh | head -n 10

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "Si el disco sigue lleno, revisa los directorios de arriba"
echo -e "y considera ampliar el tamaño del disco o mover datos."
echo -e "${CYAN}=========================================${NC}"
