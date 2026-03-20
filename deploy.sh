#!/bin/bash
# =============================================================================
# deploy.sh - Script de actualización del CRM DataCom en producción
# =============================================================================
# Uso:
#   sudo bash /var/www/crm-datacom/deploy.sh
#
# Este script realiza los siguientes pasos en orden:
#   1. Sincroniza el código desde GitHub (origin/main)
#   2. Recrea el entorno virtual Python
#   3. Instala/actualiza dependencias desde requirements.txt
#   4. Aplica migraciones pendientes de la base de datos
#   5. Reinicia el servicio gunicorn-crm
# =============================================================================

set -e  # Detener ejecución si cualquier comando falla

CRM_DIR="/var/www/crm-datacom"
VENV_DIR="$CRM_DIR/venv"
SERVICE="gunicorn-crm"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        CRM DataCom — Deploy de Producción       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── PASO 1: Actualizar código ───────────────────────────────────────────────
echo "[1/5] Actualizando código desde GitHub..."
cd "$CRM_DIR"
git fetch origin
git reset --hard origin/main
echo "      ✓ Código actualizado → $(git log --oneline -1)"

# ─── PASO 2: Recrear entorno virtual ─────────────────────────────────────────
echo "[2/5] Recreando entorno virtual Python..."
rm -rf "$VENV_DIR"
python3 -m venv "$VENV_DIR"
echo "      ✓ Virtualenv creado con $(python3 --version)"

# ─── PASO 3: Instalar dependencias ───────────────────────────────────────────
echo "[3/5] Instalando dependencias..."
"$VENV_DIR/bin/pip" install --quiet \
    -r "$CRM_DIR/requirements.txt" \
    gunicorn==25.1.0 \
    Pillow==11.3.0 \
    pyotp==2.9.0 \
    qrcode==8.2
echo "      ✓ Dependencias instaladas"

# ─── PASO 4: Migraciones de base de datos ────────────────────────────────────
echo "[4/5] Aplicando migraciones de base de datos..."
"$VENV_DIR/bin/python" "$CRM_DIR/manage.py" migrate --no-input
echo "      ✓ Migraciones aplicadas"

# ─── PASO 5: Reiniciar servicio ──────────────────────────────────────────────
echo "[5/5] Reiniciando servicio Gunicorn..."
systemctl restart "$SERVICE"
sleep 3
STATUS=$(systemctl is-active "$SERVICE")
if [ "$STATUS" = "active" ]; then
    echo "      ✓ Servicio $SERVICE activo y corriendo"
else
    echo "      ✗ ERROR: El servicio $SERVICE no arrancó (status: $STATUS)"
    systemctl status "$SERVICE" --no-pager | tail -10
    exit 1
fi

# ─── RESUMEN ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Deploy completado exitosamente               ║"
echo "╚══════════════════════════════════════════════════╝"
echo "   Commit: $(git log --oneline -1)"
echo "   Servicio: $STATUS"
echo "   Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
