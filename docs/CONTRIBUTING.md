# Guía de Contribución — CRM DataCom

---

## Convenciones de Commits

Se usa la especificación [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

Formato:
```
<tipo>(<módulo>): <descripción corta en imperativo>
```

### Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `style` | Formato, espacios, sin cambio lógico |
| `refactor` | Refactorización sin cambio de comportamiento |
| `test` | Agregar o corregir pruebas |
| `chore` | Tareas de mantenimiento, dependencias, config |
| `crm` | Cambios específicos de reglas de negocio del CRM |

### Módulos de referencia

`core`, `clients`, `services`, `billing`, `support`, `frontend`, `ci`, `deploy`

### Ejemplos

```
feat(clients): agregar exportación CSV de la lista de clientes
fix(services): corregir sincronización de estado al crear orden de trabajo
docs(deploy): actualizar guía de despliegue para Ubuntu 24.04
crm(billing): cambiar cálculo de MRC para incluir impuestos
chore(deps): actualizar Django a 5.2.3
```

---

## Flujo de Trabajo Git

1. Crear una rama por funcionalidad desde `main`:
   ```bash
   git checkout -b feat/nombre-de-la-funcionalidad
   ```

2. Hacer commits pequeños y atómicos siguiendo las convenciones.

3. Pushear y abrir un Pull Request hacia `main`.

4. El PR debe incluir descripción del cambio y, si aplica, capturas de pantalla.

---

## Estructura del Proyecto

Ver [docs/ARCHITECTURE.md](ARCHITECTURE.md) para el detalle técnico completo.

```
crm-datacom/
├── core/           # Usuarios, roles, 2FA
├── clients/        # Clientes, contactos, historial
├── services/       # Catálogo, servicios asignados, órdenes de trabajo
├── billing/        # Facturas y registros financieros
├── support/        # [En desarrollo]
├── crm_backend/    # Settings, URLs raíz, wsgi
├── frontend/       # React + Vite (npm)
├── docs/           # Documentación técnica
├── scripts/        # Scripts de operación
└── tests/          # Pruebas
```

---

## Configuración del Entorno de Desarrollo

```bash
# Clonar
git clone https://github.com/mlogacho/crm-datacom.git
cd crm-datacom

# Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Editar .env con valores locales
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (en otra terminal)
cd frontend/
npm install
npm run dev
```

---

## Estilo de Código

- **Python**: PEP 8. Docstrings en español para modelos y funciones de negocio.
- **JavaScript/JSX**: ESLint configurado (ver `eslint.config.js`). Componentes funcionales con hooks.
- **CSS**: Tailwind CSS en el frontend. Evitar CSS en línea.

---

## Contacto

Marco Logacho — Director de Desarrollo Digital e IA, DataCom S.A.
