#!/bin/bash

################################################################################
# CRM DataCom — Setup Script
# 
# Quick recovery and environment setup for CRM DataCom
# 
# Usage:
#   bash scripts/setup.sh
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
#
# Description:
#   - Verifies Python 3.x installation
#   - Creates virtual environment (venv/)
#   - Installs Python dependencies
#   - Verifies .env file
#   - Runs database migrations
#   - Optionally loads initial fixtures
#   - Prompts to create superuser
#   - Displays startup instructions
#
# Author: Marco Logacho
# Organization: DataCom S.A.
# Version: 1.0
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

################################################################################
# 1. Banner
################################################################################

clear
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                     CRM DataCom - Setup Script                        ║"
echo "║                                                                        ║"
echo "║           Configuración Rápida del Entorno - DataCom S.A.            ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

################################################################################
# 2. Check Python Installation
################################################################################

log_info "Verificando instalación de Python..."

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    log_success "Python 3 encontrado: $PYTHON_VERSION"
else
    log_error "Python 3 no está instalado o no está en PATH"
    log_info "Instalar Python 3.10+ desde: https://www.python.org/"
    exit 1
fi

# Check version is 3.10+
PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]); then
    log_error "Se requiere Python 3.10 o superior (encontrado: $PYTHON_MAJOR.$PYTHON_MINOR)"
    exit 1
fi

echo ""

################################################################################
# 3. Check/Create Virtual Environment
################################################################################

log_info "Configurando entorno virtual..."

if [ -d "venv" ]; then
    log_warning "El directorio 'venv/' ya existe"
    read -p "¿Recrarlo? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm -rf venv
        log_info "Directorio venv/ eliminado"
    fi
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
    log_success "Entorno virtual creado en ./venv"
else
    log_success "Entorno virtual existente (./venv)"
fi

echo ""

################################################################################
# 4. Activate Virtual Environment
################################################################################

log_info "Activando entorno virtual..."

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    log_success "Entorno virtual activado"
elif [ -f "venv\\Scripts\\activate" ]; then
    # Windows
    source venv/Scripts/activate
    log_success "Entorno virtual activado (Windows)"
else
    log_error "No se puede encontrar script de activación del venv"
    exit 1
fi

echo ""

################################################################################
# 5. Upgrade pip
################################################################################

log_info "Actualizando pip..."
pip install --upgrade pip --quiet
log_success "pip actualizado"

echo ""

################################################################################
# 6. Install Dependencies
################################################################################

log_info "Instalando dependencias de Python..."

if [ ! -f "requirements.txt" ]; then
    log_error "No se encontró requirements.txt"
    exit 1
fi

pip install -r requirements.txt --quiet

if [ $? -eq 0 ]; then
    log_success "Dependencias instaladas correctamente"
else
    log_error "Error al instalar dependencias"
    exit 1
fi

echo ""

################################################################################
# 7. Check/Create .env file
################################################################################

log_info "Configurando variables de entorno..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_success "Archivo .env creado desde .env.example"
        log_warning "IMPORTANTE: Editar .env con valores reales para este entorno"
        log_info "Editar archivo: nano .env"
    else
        log_error "No se encontró .env.example"
        exit 1
    fi
else
    log_success "Archivo .env existe"
fi

echo ""

################################################################################
# 8. Run Migrations
################################################################################

log_info "Aplicando migraciones de base de datos..."

if python manage.py migrate --noinput 2>&1 | grep -q "No changes detected"; then
    log_success "Base de datos actualizada (sin cambios nuevos)"
elif python manage.py migrate --noinput > /dev/null 2>&1; then
    log_success "Migraciones aplicadas correctamente"
else
    log_error "Error al aplicar migraciones"
    log_info "Intenta ejecutar: python manage.py migrate"
    exit 1
fi

echo ""

################################################################################
# 9. Load Initial Fixtures (Optional)
################################################################################

# Check if fixtures exist
FIXTURE_COUNT=$(find . -name "*.json" -path "*/fixtures/*" 2>/dev/null | wc -l)

if [ "$FIXTURE_COUNT" -gt 0 ]; then
    log_info "Se encontraron $FIXTURE_COUNT fixtures de datos iniciales"
    read -p "¿Cargar datos iniciales? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        # Load all fixtures
        for fixture in $(find . -name "*.json" -path "*/fixtures/*" 2>/dev/null | sort); do
            FIXTURE_NAME=$(basename "$fixture" .json)
            python manage.py loaddata "$FIXTURE_NAME" 2>/dev/null && \
                log_success "Fixture cargada: $FIXTURE_NAME" || \
                log_warning "Fixture no se pudo cargar: $FIXTURE_NAME"
        done
    fi
else
    log_info "No hay fixtures predefinidas (cargar datos vía admin después)"
fi

echo ""

################################################################################
# 10. Create Superuser (Optional)
################################################################################

log_info "Configuración de usuario administrador..."

read -p "¿Crear/resetear usuario superusuario? (s/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "Sigue las instrucciones para crear el superusuario:"
    echo ""
    python manage.py createsuperuser
    log_success "Superusuario creado/actualizado"
else
    log_info "Saltando creación de superusuario"
    log_info "Puedes crear uno después con: python manage.py createsuperuser"
fi

echo ""

################################################################################
# 11. Verify Installation
################################################################################

log_info "Verificando instalación..."

# Test Django
if python manage.py check > /dev/null 2>&1; then
    log_success "Django system check OK"
else
    log_warning "Algunos warnings en Django system check (revisar con: python manage.py check)"
fi

# Test imports
if python -c "import rest_framework; import corsheaders; import django_filters" 2>/dev/null; then
    log_success "Todas las librerías importan correctamente"
fi

echo ""

################################################################################
# 12. Success Message & Next Steps
################################################################################

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✓ CONFIGURACIÓN COMPLETADA                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

log_success "Entorno listo para desarrollo"
echo ""

echo "PRÓXIMOS PASOS:"
echo "──────────────"
echo ""
echo "1. Editar variables de entorno (si necesario):"
echo "   ${BLUE}nano .env${NC}"
echo ""
echo "2. Iniciar servidor de desarrollo:"
echo "   ${BLUE}python manage.py runserver${NC}"
echo ""
echo "3. Acceder a la aplicación:"
echo "   URL:             http://localhost:8000"
echo "   Admin:           http://localhost:8000/admin"
echo "   API:             http://localhost:8000/api"
echo ""
echo "4. (Opcional) Iniciar frontend Vue.js:"
echo "   ${BLUE}cd frontend && npm run dev${NC}"
echo "   Frontend:        http://localhost:5173"
echo ""
echo "5. Consultar documentación:"
echo "   Despliegue:      ${BLUE}cat docs/DEPLOYMENT.md${NC}"
echo "   Arquitectura:    ${BLUE}cat docs/ARCHITECTURE.md${NC}"
echo "   Desarrollo:      ${BLUE}cat docs/CONTRIBUTING.md${NC}"
echo ""

log_info "Entorno virtual activado: $(which python3)"
log_info "Ubicación venv: $(cd venv && pwd)"
echo ""

echo "════════════════════════════════════════════════════════════════════════════"
echo "Gracias por usar CRM DataCom — DataCom S.A."
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
