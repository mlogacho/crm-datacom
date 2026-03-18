.PHONY: help setup run migrate fixtures test clean freeze collectstatic createsuperuser shell dbshell coverage lint format install-deps

# ============================================================================
# CRM DataCom — Makefile
# 
# Tareas automatizadas para desarrollo y despliegue
# 
# Uso:
#   make help              - Mostrar esta ayuda
#   make setup             - Configuración inicial completa
#   make run               - Iniciar servidor de desarrollo
#   make migrate           - Aplicar migraciones
#   make fixtures          - Cargar datos iniciales
#   make test              - Ejecutar pruebas
#   make freeze            - Actualizar requirements.txt
#   make clean             - Limpiar archivos temporales
#
# ============================================================================

# Variables
PYTHON := python3
DJANGO_MANAGE := python manage.py
PIP := pip3
VENV := venv
SHELL := /bin/bash

# Detectar OS
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    DETECTED_OS := macOS
else ifeq ($(UNAME_S),Linux)
    DETECTED_OS := Linux
else
    DETECTED_OS := Windows
endif

# ============================================================================
# TARGETS PRINCIPALES
# ============================================================================

help:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           CRM DataCom — Makefile Help                 ║"
	@echo "║                                                        ║"
	@echo "║        Marco Logacho — Director de Desarrollo         ║"
	@echo "║        DataCom S.A.                                   ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "CONFIGURACIÓN INICIAL:"
	@echo "  make setup              Configuración rápida del entorno"
	@echo "  make install-deps       Instalar todas las dependencias"
	@echo "  make createsuperuser    Crear usuario administrador"
	@echo ""
	@echo "DESARROLLO:"
	@echo "  make run                Iniciar servidor (localhost:8000)"
	@echo "  make shell              Django shell interactivo"
	@echo "  make dbshell            Acceso directo a base de datos"
	@echo ""
	@echo "BASE DE DATOS:"
	@echo "  make migrate            Aplicar migraciones pendientes"
	@echo "  make fixtures           Cargar datos iniciales"
	@echo "  make makemigrations     Detectar cambios en modelos"
	@echo ""
	@echo "TESTING & QUALITY:"
	@echo "  make test               Ejecutar suite de pruebas"
	@echo "  make coverage           Análisis de cobertura de tests"
	@echo "  make lint               Verificación de estilo (PEP8)"
	@echo "  make format             Auto-formatea código (Black)"
	@echo ""
	@echo "MANTENIMIENTO:"
	@echo "  make freeze             Actualizar requirements.txt"
	@echo "  make collectstatic      Recolectar archivos estáticos"
	@echo "  make clean              Limpiar temporales y cache"
	@echo ""
	@echo "OBTENER INFORMACIÓN:"
	@echo "  make status             Ver estado del sistema"
	@echo "  make info               Información del entorno"
	@echo ""

# ============================================================================
# CONFIGURACIÓN INICIAL
# ============================================================================

setup:
	@echo "Iniciando configuración del entorno CRM DataCom..."
	@chmod +x scripts/setup.sh
	@bash scripts/setup.sh

install-deps:
	@echo "Instalando dependencias de Python..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "✓ Dependencias instaladas"

createsuperuser:
	@echo "Crear usuario administrador..."
	$(DJANGO_MANAGE) createsuperuser

changepassword:
	@echo "Cambiar contraseña de usuario..."
	@ $(DJANGO_MANAGE) changepassword

# ============================================================================
# DESARROLLO
# ============================================================================

run:
	@echo "Iniciando servidor de desarrollo (http://localhost:8000)..."
	@echo "Presiona Ctrl+C para detener"
	$(DJANGO_MANAGE) runserver

runserver: run

run-port:
	@read -p "Puerto [8000]: " port; \
	if [ -z "$$port" ]; then port=8000; fi; \
	echo "Iniciando servidor en puerto $$port..."; \
	$(DJANGO_MANAGE) runserver 0.0.0.0:$$port

shell:
	@echo "Abriendo Django shell..."
	$(DJANGO_MANAGE) shell

dbshell:
	@echo "Abriendo shell de base de datos..."
	$(DJANGO_MANAGE) dbshell

# ============================================================================
# BASE DE DATOS
# ============================================================================

migrate:
	@echo "Aplicando migraciones de base de datos..."
	$(DJANGO_MANAGE) migrate
	@echo "✓ Migraciones aplicadas"

makemigrations:
	@echo "Detectando cambios en modelos..."
	$(DJANGO_MANAGE) makemigrations
	@echo "✓ Migraciones creadas (si había cambios)"

showmigrations:
	@echo "Estado de migraciones:"
	$(DJANGO_MANAGE) showmigrations

fixtures:
	@echo "Cargando datos iniciales (fixtures)..."
	@for fixture in $$(find . -name "*.json" -path "*/fixtures/*" -type f 2>/dev/null | sort); do \
		echo "Cargando: $$fixture"; \
		$(DJANGO_MANAGE) loaddata $$fixture || true; \
	done
	@echo "✓ Fixtures cargadas"

dumpdata:
	@echo "Exportando datos actuales a dump.json..."
	$(DJANGO_MANAGE) dumpdata --indent 2 > dump.json
	@echo "✓ Archivo dump.json creado"

# ============================================================================
# TESTING & QUALITY
# ============================================================================

test:
	@echo "Ejecutando suite de pruebas..."
	$(DJANGO_MANAGE) test --verbosity=2

test-quick:
	@echo "Ejecutando tests rápido..."
	$(DJANGO_MANAGE) test --verbosity=1

test-app:
	@read -p "Nombre de app [clients]: " app; \
	if [ -z "$$app" ]; then app=clients; fi; \
	echo "Testing app: $$app"; \
	$(DJANGO_MANAGE) test $$app --verbosity=2

coverage:
	@echo "Ejecutando análisis de cobertura de tests..."
	@if command -v coverage &> /dev/null; then \
		coverage run --source='.' manage.py test; \
		coverage report; \
		coverage html; \
		echo "✓ Reporte HTML generado en htmlcov/index.html"; \
	else \
		echo "coverage no está instalado, instalando..."; \
		$(PIP) install coverage; \
		coverage run --source='.' manage.py test; \
		coverage report; \
		coverage html; \
		echo "✓ Reporte HTML generado"; \
	fi

lint:
	@echo "Verificando estilo PEP8..."
	@if command -v flake8 &> /dev/null; then \
		flake8 . --max-line-length=120 --exclude=venv,migrations; \
	else \
		echo "flake8 no está instalado. Instalar con: pip install flake8"; \
	fi

format:
	@echo "Formateando código con Black..."
	@if command -v black &> /dev/null; then \
		black . --exclude=venv; \
		echo "✓ Código formateado"; \
	else \
		echo "black no está instalado. Instalar con: pip install black"; \
	fi

# ============================================================================
# MANTENIMIENTO & OPERACIONAL
# ============================================================================

freeze:
	@echo "Actualizando requirements.txt con versiones actuales..."
	$(PIP) freeze > requirements.txt
	@echo "✓ requirements.txt actualizado"

collectstatic:
	@echo "Recolectando archivos estáticos..."
	$(DJANGO_MANAGE) collectstatic --noinput
	@echo "✓ Archivos estáticos recolectados"

clean:
	@echo "Limpiando archivos temporales..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type f -name "*.pyd" -delete 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name ".DS_Store" -delete 2>/dev/null || true
	@echo "✓ Archivos temporales eliminados"

clean-cache:
	@echo "Limpiando cache de Django..."
	$(DJANGO_MANAGE) clear_cache 2>/dev/null || echo "Cache limpiado"
	@echo "✓ Cache limpio"

# ============================================================================
# INFORMACIÓN & DIAGNÓSTICO
# ============================================================================

check:
	@echo "Ejecutando Django system checks..."
	$(DJANGO_MANAGE) check

check-deploy:
	@echo "Verificando configuración para producción..."
	$(DJANGO_MANAGE) check --deploy

status:
	@echo "╔════════════════════════════════════════════════╗"
	@echo "║       Estado del Sistema CRM DataCom          ║"
	@echo "╚════════════════════════════════════════════════╝"
	@echo ""
	@echo "Sistema Operativo: $(DETECTED_OS)"
	@echo "Python: $$($(PYTHON) --version)"
	@echo "Django: $$($(DJANGO_MANAGE) --version)"
	@echo ""
	@if [ -d "$(VENV)" ]; then \
		echo "✓ Entorno virtual creado"; \
	else \
		echo "✗ Entorno virtual no encontrado"; \
	fi
	@if [ -f ".env" ]; then \
		echo "✓ Archivo .env existe"; \
	else \
		echo "✗ Archivo .env no existe"; \
	fi
	@if [ -f "db.sqlite3" ] || [ -n "$$DB_NAME" ]; then \
		echo "✓ Base de datos configurada"; \
	else \
		echo "✗ Base de datos no configurada"; \
	fi
	@echo ""

info:
	@echo "╔════════════════════════════════════════════════╗"
	@echo "║    Información del Entorno de Desarrollo      ║"
	@echo "╚════════════════════════════════════════════════╝"
	@echo ""
	@echo "Versión de Python:"
	@$(PYTHON) --version
	@echo ""
	@echo "Ubicación de Python:"
	@which $(PYTHON)
	@echo ""
	@echo "Paquetes instalados:"
	@$(PIP) list
	@echo ""

# ============================================================================
# TAREAS ESPECIALES
# ============================================================================

watch-tests:
	@echo "Ejecutando tests en modo watch..."
	@echo "Los tests se ejecutarán automáticamente cuando cambies archivos .py"
	@if command -v pytest-watch &> /dev/null; then \
		$(PYTHON) -m pytest_watch; \
	else \
		echo "pytest-watch no instalado. Instalar con: pip install pytest-watch"; \
	fi

debug:
	@echo "Ejecutando servidor con debugger activado..."
	$(DJANGO_MANAGE) runserver --pdb

# ============================================================================
# DOCKER (Futuro)
# ============================================================================

docker-build:
	@echo "Construcción de imagen Docker (cuando Dockerfile esté disponible)..."
	@if [ -f "Dockerfile" ]; then \
		docker build -t crm-datacom:latest .; \
	else \
		echo "Dockerfile no encontrado"; \
	fi

docker-run:
	@echo "Ejecutando contenedor Docker..."
	@if command -v docker &> /dev/null; then \
		docker run -p 8000:8000 crm-datacom:latest; \
	else \
		echo "Docker no está instalado"; \
	fi

# ============================================================================
# DESARROLLO RÁPIDO
# ============================================================================

quick-setup: install-deps migrate
	@echo "✓ Configuración rápida completada"

full-reset: clean
	@echo "Reseteando base de datos..."
	@rm -f db.sqlite3
	$(DJANGO_MANAGE) migrate
	@echo "✓ Base de datos reseteada"

dev-start: run
	@# Alias para iniciar servidor

dev-reset: full-reset createsuperuser

# ============================================================================
# NOTAS
# ============================================================================

.DEFAULT_GOAL := help

# Prevenir que 'make' confunda archivos con targets
.PRECIOUS: $(VENV)

# ============================================================================
# Fin de Makefile
# 
# Última actualización: Marzo 2026
# Autor: Marco Logacho
# Organización: DataCom S.A.
# ============================================================================
