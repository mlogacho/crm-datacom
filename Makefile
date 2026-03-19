# Makefile — CRM DataCom
.PHONY: help setup run migrate fixtures freeze test lint clean dev-fe build

PYTHON   := venv/bin/python
PIP      := venv/bin/pip
MANAGE   := $(PYTHON) manage.py

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Configurar entorno desde cero (venv + deps + migrate + superuser)
	bash scripts/setup.sh

run: ## Iniciar servidor de desarrollo Django
	$(MANAGE) runserver

migrate: ## Crear y aplicar migraciones
	$(MANAGE) makemigrations
	$(MANAGE) migrate

fixtures: ## Poblar catálogo de servicios inicial
	$(PYTHON) manage.py shell < populate_catalog.py

test: ## Ejecutar tests del backend
	$(MANAGE) test

lint: ## Verificar estilo de código Python
	$(PYTHON) -m flake8 . --exclude=venv,migrations,__pycache__

freeze: ## Actualizar requirements.txt con las dependencias actuales del venv
	$(PIP) freeze > requirements.txt

clean: ## Eliminar archivos compilados y caché
	find . -type d -name __pycache__ -not -path "*/venv/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -not -path "*/venv/*" -delete 2>/dev/null || true

dev-fe: ## Iniciar servidor de desarrollo del frontend React
	cd frontend && npm run dev

build: ## Build de producción del frontend
	cd frontend && npm run build
