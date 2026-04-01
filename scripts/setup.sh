#!/bin/bash
# setup.sh - Quick environment recovery for CRM DataCom
# DataCom S.A. - Run with: bash scripts/setup.sh

set -e

log() {
  echo "[setup] $1"
}

# 1) Verify Python 3.x is available.
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is not installed or not in PATH."
  exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')
log "Detected Python ${PY_VERSION}"

# 2) Create virtual environment if missing.
if [ ! -d "venv" ]; then
  log "Creating virtual environment in venv/"
  python3 -m venv venv
else
  log "Using existing virtual environment in venv/"
fi

# 3) Activate virtual environment.
# shellcheck disable=SC1091
source venv/bin/activate

# 4) Install dependencies.
if [ ! -f "requirements.txt" ]; then
  echo "Error: requirements.txt not found in repository root."
  exit 1
fi
log "Installing Python dependencies"
pip install --upgrade pip
pip install -r requirements.txt

# 5) Ensure .env file exists.
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    log "Created .env from .env.example"
    log "Please review .env before using production credentials"
  else
    echo "Error: .env.example not found."
    exit 1
  fi
else
  log ".env already exists"
fi

# 6) Run migrations.
log "Applying database migrations"
python manage.py migrate

# 7) Load initial fixtures if they exist.
FIXTURES=$(find . -path "*/fixtures/*.json" -type f 2>/dev/null)
if [ -n "$FIXTURES" ]; then
  log "Loading detected fixtures"
  while IFS= read -r fixture; do
    log "Loading fixture: $fixture"
    python manage.py loaddata "$fixture"
  done <<< "$FIXTURES"
else
  log "No business fixtures found in repository"
fi

# 8) Ask if user wants to create a superuser.
read -r -p "Do you want to create a superuser now? [y/N]: " CREATE_SU
if [[ "$CREATE_SU" =~ ^[Yy]$ ]]; then
  python manage.py createsuperuser
fi

# 9) Success message.
log "Setup completed successfully"
log "Start development server with: source venv/bin/activate && python manage.py runserver"
