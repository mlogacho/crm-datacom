# Convenciones de Desarrollo — CRM DataCom

**Guía para Contribuir al Proyecto**

---

## 1. Convenciones de Commits

El proyecto usa commits semánticos para facilitar el seguimiento y changelog automático.

### Formato de Mensaje de Commit

```
<tipo>(<ámbito>): <sujeto>

<cuerpo>

<pie>
```

### Tipos de Commits

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| **feat** | Nueva funcionalidad comercial | `feat(clients): agregar campo 'segmento' a Cliente` |
| **fix** | Corrección de error/bug | `fix(billing): corregir cálculo de IVA en decimales` |
| **docs** | Cambios en documentación | `docs: actualizar README con instrucciones Docker` |
| **refactor** | Refactorización sin cambio funcional | `refactor(services): simplificar lógica de sync status` |
| **test** | Adición/corrección de pruebas | `test(clients): agregar tests para creación de contacto` |
| **chore** | Mantenimiento (deps, CI, config) | `chore: actualizar Django a 5.3.0` |
| **crm** | Cambios específicos de lógica comercial | `crm(clients): activar cliente automáticamente en estado INSTALLED` |

### Ejemplo de Commits Correctos

```bash
# Bueno 1: Simple y directo
git commit -m "feat(services): agregar estado DEMO al pipeline"

# Bueno 2: Con cuerpo explicativo
git commit -m "fix(billing): corregir orden de cálculos en BillingRecord

- IVA se calcula DESPUÉS de service_amount
- total = service_amount + iva_amount
- Round de decimales en ciertos casos"

# Bueno 3: Con referencia a issue
git commit -m "feat(clients): implementar ClientStatusHistory

Cierra #142

Se registra cada cambio de estado de cliente con:
- Razón del cambio
- Evidencia (archivo adjunto)
- Valores NRC/MRC asociados"
```

### Ejemplo de Commits Incorrectos

```bash
# Incorrecto: Sin tipo/ámbito
git commit -m "actualizar cosas"

# Incorrecto: Múltiples cambios desagregados
git commit -m "feat: agregar invoice, fix bug, refactor views"

# Incorrecto: Especificidad vaga
git commit -m "fix: problemas varios"

# Incorrecto: Sin verbo en infinitivo
git commit -m "feat: agregando nuevo campo al modelo"  # ❌ "agrega" vs "agregar"
```

### Ámbitos Recomendados

- **core**: Módulo de autenticación/usuarios
- **clients**: Módulo de clientes
- **services**: Módulo de servicios/catálogo
- **support**: Módulo de tickets
- **billing**: Módulo de facturación
- **api**: General de REST API
- **frontend**: Cambios en Vue.js
- **docs**: Documentación en general

---

## 2. Convenciones de Código

### Python (Backend - PEP 257)

Docstrings en inglés, comentarios en inglés, nombre de variables en inglés.

```python
# ✅ CORRECTO

def calculate_invoice_total(invoice):
    """
    Calculate the total amount due for an invoice.
    
    Includes subtotal, tax amount, and any additional charges.
    
    Args:
        invoice (Invoice): Invoice instance to calculate
        
    Returns:
        Decimal: Total amount including tax
        
    Raises:
        ValueError: If invoice has invalid data
    """
    if not invoice.subtotal:
        raise ValueError("Invoice must have subtotal > 0")
    
    tax = invoice.subtotal * Decimal('0.15')  # 15% IVA Ecuador
    total = invoice.subtotal + tax
    return round(total, 2)


class ClientService(models.Model):
    """
    Represents a service instance sold to a specific client.
    
    Tracks the commercial pipeline status and technical configuration.
    """
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    # ...


# ❌ INCORRECTO

def calc_total(inv):
    # calcular el total
    tax = inv.subtotal * 0.15
    total = inv.subtotal + tax
    return total

class ClientService(models.Model):
    # Este es el servicio del cliente
    cl = ForeignKey(Client)
```

### JavaScript/Vue (Frontend)

CamelCase, comentarios en inglés, componentes reutilizables.

```javascript
// ✅ CORRECTO

/**
 * ClientForm Component
 * 
 * Form for creating or editing a client
 */
export default {
  props: {
    clientId: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      formData: {
        name: '',
        email: '',
        classification: 'PROSPECT'
      }
    }
  },
  methods: {
    async submitForm() {
      try {
        await this.$api.clients.save(this.formData)
      } catch (error) {
        this.handleError(error)
      }
    }
  }
}

// ❌ INCORRECTO

export default {
  props: ['cli_id'],
  data() {
    return { f: { n: '', e: '', c: 'PROSPECT' } }
  },
  methods: {
    sumbit() {  // typo
      this.$api.clientes.guardar(this.f)  // Spanish naming
    }
  }
}
```

---

## 3. Flujo de Trabajo (Git Workflow)

### Branch Naming Convention

```
<tipo>/<descripcion-corta>
```

**Tipos**:
- `feature/` — Nuevas funcionalidades
- `bugfix/` — Corrección de errores
- `refactor/` — Refactorización
- `docs/` — Documentación

**Ejemplos**:
```bash
git checkout -b feature/client-status-history
git checkout -b bugfix/invoice-iva-calculation
git checkout -b docs/deployment-guide
```

### Proceso de Desarrollo

```bash
# 1. Crear branch desde main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. Hacer commits semánticos
git add .
git commit -m "feat(module): descripción"

# 3. Push a rama remota
git push -u origin feature/my-feature

# 4. Crear Pull Request en GitHub
# (Asignar reviewer, ligar a issues si aplica)

# 5. Después de aprobación y merge
git checkout main
git pull origin main

# 6. Borrar rama local
git branch -D feature/my-feature
git push origin --delete feature/my-feature
```

---

## 4. Estructura de Directorios

```
crm-datacom/
├── crm_backend/           # Configuración principal Django
│   ├── settings.py        # Settings principales
│   ├── urls.py            # URLs raíz
│   ├── asgi.py
│   └── wsgi.py
│
├── <app>/                 # Cada módulo Django
│   ├── models.py          # Modelos ORM [Documentados]
│   ├── serializers.py     # Serializadores DRF [Documentados]
│   ├── views.py           # Vistas API [Documentadas]
│   ├── urls.py            # URLs [Comentadas por secciones]
│   ├── admin.py           # Admin Django
│   ├── tests.py           # Tests unitarios
│   └── migrations/
│
├── frontend/              # Vue.js app (si aplica)
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   └── services/
│   └── vite.config.js
│
├── docs/                  # Documentación técnica
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── scripts/               # Scripts de utilidad
│   └── setup.sh
│
├── tests/                 # Tests globales (si aplica)
│   └── ...
│
├── README.md              # Descripción general
├── CHANGELOG.md           # Historial de versiones
├── Makefile               # Tareas automatizadas
└── requirements.txt       # Dependencias Python
```

---

## 5. Pruebas (Testing)

### Ejecución de Tests

```bash
# Todos los tests
python manage.py test

# Tests de app específica
python manage.py test clients

# Tests de módulo específico
python manage.py test clients.tests.TestClient

# Verbose
python manage.py test -v 2
```

### Estructura de Tests

```python
# tests.py en cada app

from django.test import TestCase
from .models import Client

class ClientTestCase(TestCase):
    """Test suite for Client model"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client.objects.create(
            name="Test Corp",
            tax_id="1234567890",
            email="test@example.com"
        )
    
    def test_client_creation(self):
        """Test that client is created correctly"""
        self.assertEqual(self.client.name, "Test Corp")
        self.assertTrue(self.client.is_active)
    
    def test_client_str(self):
        """Test string representation"""
        self.assertEqual(str(self.client), "Test Corp")
```

### Cobertura de Tests

```bash
# Instalar coverage
pip install coverage

# Ejecutar con coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Genera reporte HTML
```

---

## 6. Documentación de Código

### Docstrings de Modelos

```python
class Client(models.Model):
    """
    Core Client model representing a prospect or active customer.
    
    [Descripción breve de qué representa]
    
    Fields:
        name (str): [Descripción]
        email (str): [Descripción]
        classification (str): Whether PROSPECT or ACTIVE
        
    Relations:
        - contacts: Related Contact records (one-to-many)
        
    Business Logic:
        - [Lógica especial]
        - [Invariantes]
    """
```

### Docstrings de Vistas/Endpoints

```python
class ClientListView(generics.ListCreateAPIView):
    """
    List and create clients.
    
    GET /api/clients/ - List all clients (paginated)
    POST /api/clients/ - Create new client
    
    Permissions:
        - GET: IsAuthenticated
        - POST: IsAuthenticated + sales role
    
    Filters:
        - classification: PROSPECT or ACTIVE
        - region: Geographic region
        
    Returns:
        200: List of clients with pagination
        400: Invalid filters or data
        401: Unauthorized
    """
```

---

## 7. Antes de hacer Push

### Checklist Pre-Push

- [ ] Código sigue convenciones del proyecto
- [ ] Se agregó/actualizó documentación (docstrings)
- [ ] Tests pasan: `python manage.py test`
- [ ] Migraciones creadas si hay cambios en modelos
- [ ] Mensaje de commit es semántico y descriptivo
- [ ] No hay archivos de debug (print statements, debugger)
- [ ] No hay secretos en el código (passwords, keys)
- [ ] Código está formateado (PEP 8 para Python)

### Herramientas Recomendadas

```bash
# Instalar linter Python
pip install flake8

# Verificar estilo
flake8 . --max-line-length=120

# Auto-formatear
pip install black
black .
```

---

## 8. Revisión de Código (Code Review)

### Al crear Pull Request

1. **Descripción clara**: Qué cambios se hacen y por qué
2. **Referencia a issues**: Ligar al issue que cierra (Cierra #123)
3. **Screenshots** (si UI): Mostrar cambios visuales
4. **Testing**: Describir tests realizados

### Al revisar PR

- [ ] Código sigue convenciones
- [ ] Lógica es correcta y eficiente
- [ ] No hay código duplicado
- [ ] Existe documentación adecuada
- [ ] Tests están agregados/actualizados
- [ ] No hay regresiones obvias

---

## 9. Versionamiento y Tags de Release

### Crear Release

```bash
# Ejemplo: releasing v0.2.0

# 1. Actualizar CHANGELOG.md
# (agregar sección ## [0.2.0] — YYYY-MM-DD)

# 2. Commit de versión
git commit -m "chore: prepare release v0.2.0"

# 3. Crear tag
git tag -a v0.2.0 -m "Release version 0.2.0 - Sales Pipeline MVP"

# 4. Push tags
git push origin main
git push origin v0.2.0
```

### Mensaje de Tag

```
<titulo breve>

<descripción más larga>

- Feature 1
- Feature 2
- Bug fix 1
```

---

## 10. Comunicación

### Reportar Bugs

Usar GitHub Issues con template (si existe):
- **Título**: [BUG] Descripción breve
- **Pasos a reproducir**: Detallado
- **Comportamiento esperado**: Qué debería pasar
- **Comportamiento actual**: Qué sucede
- **Environment**: Python version, OS, navegador si aplica

### Sugerir Mejoras

- **Título**: [FEATURE] Descripción breve
- **Motivación**: Por qué se necesita
- **Solución propuesta**: Cómo implementarla
- **Alternativas**: Opciones consideradas

---

## 11. Contacto y Preguntas

- **Mantenedor Principal**: Marco Logacho (@mlogacho)
- **Repositorio**: https://github.com/mlogacho/crm-datacom
- **Issues**: https://github.com/mlogacho/crm-datacom/issues

---

**Es importante que todo el equipo siga estas convenciones para mantener la calidad y consistencia del proyecto.**

¡Gracias por contribuir a CRM DataCom! 🚀
