#!/usr/bin/env bash
# scripts/setup.sh — Configuración del entorno de desarrollo para CRM DataCom
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. Verificar Python ──────────────────────────────────────────────────────
info "Verificando Python 3.10+..."
PYTHON=$(command -v python3 || command -v python || error "Python no encontrado. Instala Python 3.10+")
PYVER=$("$PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
[[ "${PYVER%%.*}" -ge 3 && "${PYVER##*.}" -ge 10 ]] || \
    error "Se requiere Python 3.10+. Versión detectada: $PYVER"
info "Python $PYVER encontrado: $PYTHON"

# ── 2. Entorno virtual ───────────────────────────────────────────────────────
if [ ! -d "venv" ]; then
    info "Creando entorno virtual..."
    "$PYTHON" -m venv venv
else
    warn "Entorno virtual ya existe, omitiendo creación."
fi

# shellcheck disable=SC1091
source venv/bin/activate
info "Entorno virtual activado."

# ── 3. Dependencias Python ───────────────────────────────────────────────────
info "Instalando dependencias de Python..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
info "Dependencias instaladas."

# ── 4. Archivo .env ──────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        warn ".env creado desde .env.example. Edítalo antes de continuar."
    else
        warn "No se encontró .env ni .env.example. Crea el archivo .env manualmente."
    fi
else
    info "Archivo .env encontrado."
fi

# ── 5. Migraciones ───────────────────────────────────────────────────────────
info "Ejecutando migraciones de la base de datos..."
python manage.py migrate --no-input
info "Migraciones completadas."

# ── 6. Superusuario ─────────────────────────────────────────────────────────
echo ""
read -r -p "¿Crear superusuario Django ahora? [s/N]: " CREATE_SU
if [[ "$CREATE_SU" =~ ^[sS]$ ]]; then
    python manage.py createsuperuser
fi

# ── 7. Frontend ──────────────────────────────────────────────────────────────
if command -v node &>/dev/null && [ -d "frontend" ]; then
    echo ""
    read -r -p "¿Instalar dependencias del frontend (npm install)? [s/N]: " INSTALL_FE
    if [[ "$INSTALL_FE" =~ ^[sS]$ ]]; then
        info "Instalando dependencias del frontend..."
        cd frontend && npm install && cd ..
        info "Frontend listo. Usa 'make dev-fe' para iniciar el servidor de desarrollo."
    fi
fi

echo ""
info "─────────────────────────────────────────────────────────────"
info "Configuración completada."
info "  Backend:  source venv/bin/activate && python manage.py runserver"
info "  Frontend: cd frontend && npm run dev"
info "─────────────────────────────────────────────────────────────"
