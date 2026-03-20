#!/bin/bash
# =============================================================================
# deploy.sh - Script de actualización COMPLETO (Backend & Frontend)
# =============================================================================
set -e

CRM_DIR="/var/www/crm-datacom"
VENV_DIR="$CRM_DIR/venv"
SERVICE="gunicorn-crm"

echo "🚀 Iniciando despliegue en $CRM_DIR..."

# 1. Actualizar código
cd "$CRM_DIR"
echo "[1/6] Sincronizando con GitHub..."
git fetch origin
git reset --hard origin/main

# 2. Reconstruir Frontend
echo "[2/6] Construyendo Frontend (Vite)..."
cd "$CRM_DIR/frontend"
# Usamos --no-fund --no-audit para minimizar logs y tiempo
npm install --no-fund --no-audit --quiet
npm run build
cd "$CRM_DIR"

# 3. Entorno Virtual Python
echo "[3/6] Recreando entorno virtual..."
rm -rf "$VENV_DIR"
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --quiet -r requirements.txt gunicorn==25.1.0 Pillow pyotp qrcode

# 4. Estáticos de Django
echo "[4/6] Recolectando archivos estáticos..."
# Solo si STATIC_ROOT está configurado, si no, ignorar
"$VENV_DIR/bin/python" manage.py collectstatic --no-input --quiet || echo "⚠️ Skip collectstatic"

# 5. Migraciones
echo "[5/6] Aplicando migraciones..."
"$VENV_DIR/bin/python" manage.py migrate --no-input

# 6. Reiniciar Servicios
echo "[6/6] Reiniciando Gunicorn..."
systemctl restart "$SERVICE"
sleep 2
systemctl is-active "$SERVICE"

echo "✅ DESPLIEGUE EXITOSO"
echo "Recuerda limpiar el caché de tu navegador (Ctrl+F5) para ver los cambios."
