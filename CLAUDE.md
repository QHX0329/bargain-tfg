# CLAUDE.md — Instrucciones del Proyecto AURA

## 🎯 Resumen del Proyecto

**AURA** (Asistente Unificado de Rutas y Ahorro) es una aplicación web/móvil de compra inteligente que optimiza la cesta de la compra del usuario cruzando **precio**, **distancia** y **tiempo** entre múltiples supermercados y comercios locales.

**Tipo:** Trabajo Fin de Grado — Grado en Ingeniería Informática (Ingeniería del Software), Universidad de Sevilla.

**Autor:** Nicolás Parrilla Geniz
**Tutor:** Juan Vicente Gutiérrez Santacreu
**Departamento:** Matemática Aplicada I

---

## 🏗️ Arquitectura y Stack Tecnológico

### Backend
- **Framework:** Django 5.x (Python 3.12+)
- **Base de datos:** PostgreSQL 16 + PostGIS 3.4 (cálculos geoespaciales)
- **API:** Django REST Framework (DRF) con autenticación JWT
- **Tareas asíncronas:** Celery + Redis
- **Web Scraping:** Scrapy + Playwright (precios de supermercados)

### Frontend
- **Framework móvil:** React Native con Expo
- **Web companion:** React (compartir código con RN)
- **Mapas:** React Native Maps + Google Maps API
- **Estado global:** Zustand
- **HTTP:** Axios con interceptores JWT

### IA y ML
- **Asistente LLM:** Claude API (Anthropic) vía backend proxy
- **OCR/Visión:** Tesseract.js + modelo fine-tuned para tickets
- **Optimización de rutas:** OR-Tools (Google) + algoritmo propio ponderado

### Infraestructura
- **Contenedores:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:** Render (staging) / AWS (producción futura)
- **Monitorización:** Sentry (errores) + Prometheus + Grafana (métricas)

---

## 📁 Estructura del Repositorio

```
aura-tfg/
├── CLAUDE.md                    # Este archivo
├── README.md                    # Presentación del proyecto
├── LICENSE                      # MIT License
├── .github/
│   ├── workflows/
│   │   ├── ci-backend.yml       # Tests + lint backend
│   │   ├── ci-frontend.yml      # Tests + lint frontend
│   │   └── deploy-staging.yml   # Deploy automático a staging
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── user_story.md
│   └── pull_request_template.md
│
├── docs/                        # Documentación del TFG (Memoria)
│   ├── memoria/
│   │   ├── 01-introduccion.md
│   │   ├── 02-objetivos.md
│   │   ├── 03-antecedentes.md
│   │   ├── 04-comparativa.md
│   │   ├── 05-herramientas.md
│   │   ├── 06-planificacion.md
│   │   ├── 07-requisitos.md
│   │   ├── 08-diseno-implementacion.md
│   │   ├── 09-manual-usuario.md
│   │   ├── 10-pruebas.md
│   │   ├── 11-conclusiones.md
│   │   └── 12-bibliografia.md
│   ├── diagramas/
│   │   ├── arquitectura/
│   │   ├── clases/
│   │   ├── casos-uso/
│   │   ├── secuencia/
│   │   └── er/
│   ├── api/                     # Documentación OpenAPI / Swagger
│   └── decisiones/              # ADR (Architecture Decision Records)
│       └── 001-eleccion-django.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── manage.py
│   ├── config/                  # Settings de Django
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   ├── prod.py
│   │   │   └── test.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/               # Autenticación, perfiles, roles
│   │   ├── products/            # Catálogo de productos normalizados
│   │   ├── stores/              # Supermercados y comercios (PostGIS)
│   │   ├── prices/              # Precios actuales e histórico
│   │   ├── scraping/            # Spiders de Scrapy + pipeline
│   │   ├── shopping_lists/      # Listas de la compra del usuario
│   │   ├── optimizer/           # Algoritmo Precio-Distancia-Tiempo
│   │   ├── ocr/                 # Procesamiento de fotos/tickets
│   │   ├── assistant/           # Integración LLM (Claude API)
│   │   ├── business/            # Portal PYMES, suscripciones
│   │   └── notifications/       # Push + email
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── scripts/                 # Utilidades de gestión
│
├── frontend/
│   ├── package.json
│   ├── app.json                 # Config Expo
│   ├── babel.config.js
│   ├── src/
│   │   ├── api/                 # Capa de servicios HTTP
│   │   ├── components/          # Componentes reutilizables
│   │   ├── screens/             # Pantallas principales
│   │   ├── navigation/          # React Navigation config
│   │   ├── store/               # Zustand stores
│   │   ├── hooks/               # Custom hooks
│   │   ├── utils/               # Helpers y constantes
│   │   ├── theme/               # Colores, tipografía, espaciado
│   │   └── assets/              # Imágenes, fuentes, iconos
│   └── __tests__/
│
├── scraping/                    # Proyecto Scrapy independiente
│   ├── scrapy.cfg
│   └── aura_scraping/
│       ├── spiders/
│       │   ├── mercadona.py
│       │   ├── carrefour.py
│       │   ├── lidl.py
│       │   ├── dia.py
│       │   └── alcampo.py
│       ├── items.py
│       ├── pipelines.py
│       └── middlewares.py
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile                     # Comandos útiles
└── .env.example
```

---

## 📐 Convenciones de Código

### Python (Backend)
- **Estilo:** PEP 8, máx 99 caracteres por línea
- **Linter:** Ruff (ruff check + ruff format)
- **Type hints:** Obligatorios en funciones públicas
- **Docstrings:** Google style en clases y funciones públicas
- **Tests:** pytest + pytest-django. Cobertura mínima 80%
- **Imports:** isort con perfil black

```python
# Ejemplo de estilo esperado
class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet para operaciones CRUD de productos."""

    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_active"]

    def get_queryset(self) -> QuerySet[Product]:
        """Filtra productos por usuario si no es admin."""
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            return qs.filter(is_active=True)
        return qs
```

### JavaScript/TypeScript (Frontend)
- **Estilo:** ESLint + Prettier (printWidth: 100, singleQuote: true)
- **Componentes:** Functional components con hooks
- **Nombrado:** PascalCase para componentes, camelCase para funciones/variables
- **Tests:** Jest + React Native Testing Library

```typescript
// Ejemplo de componente esperado
interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { name, price, store } = product;

  return (
    <TouchableOpacity onPress={() => onPress(product.id)} style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.price}>{formatCurrency(price)}</Text>
      <Text style={styles.store}>{store.name}</Text>
    </TouchableOpacity>
  );
};
```

### Git
- **Ramas:** `main` (producción), `develop` (integración), `feature/*`, `fix/*`, `docs/*`
- **Commits:** Conventional Commits en español
  - `feat(optimizer): implementar algoritmo de ruta ponderada`
  - `fix(scraping): corregir parser de precios Mercadona`
  - `docs(memoria): añadir sección de requisitos funcionales`
  - `test(prices): añadir tests unitarios del servicio de precios`
  - `refactor(stores): extraer lógica PostGIS a servicio`
  - `chore(ci): configurar workflow de despliegue staging`
- **PRs:** Siempre contra `develop`, con descripción y checklist

---

## 🧪 Testing

### Backend
```bash
# Tests unitarios
pytest backend/tests/unit/ -v

# Tests de integración
pytest backend/tests/integration/ -v

# Cobertura
pytest --cov=backend/apps --cov-report=html

# Lint
ruff check backend/ && ruff format --check backend/
```

### Frontend
```bash
# Tests
npx jest --coverage

# Lint
npx eslint src/ --ext .ts,.tsx
npx prettier --check "src/**/*.{ts,tsx}"
```

---

## 🔄 Flujo de Desarrollo con Claude Code

### Antes de cada tarea
1. Lee este archivo `CLAUDE.md` completo
2. Revisa el issue o historia de usuario asignada
3. Identifica la app/módulo afectado
4. Revisa tests existentes del módulo

### Durante el desarrollo
1. Crea rama `feature/XX-descripcion` desde `develop`
2. Implementa con TDD cuando sea posible: test → código → refactor
3. Escribe docstrings y type hints
4. Ejecuta tests y lint antes de hacer commit
5. Haz commits atómicos con mensajes descriptivos

### Al finalizar
1. Ejecuta suite completa de tests
2. Actualiza documentación si la API cambió
3. Actualiza la memoria del TFG si es relevante
4. Crea PR con descripción detallada

---

## 🗃️ Modelos de Datos Clave

### Product (Producto normalizado)
- `id`, `name`, `normalized_name`, `barcode` (EAN-13)
- `category` (FK), `brand`, `unit`, `unit_quantity`
- `image_url`, `is_active`, `created_at`, `updated_at`

### Store (Tienda con geolocalización)
- `id`, `name`, `chain` (FK a cadena), `address`
- `location` (PostGIS PointField), `opening_hours` (JSON)
- `is_local_business`, `subscription_tier` (para PYMEs)

### Price (Precio de producto en tienda)
- `id`, `product` (FK), `store` (FK)
- `price`, `unit_price`, `offer_price`, `offer_end_date`
- `source` (scraping/crowdsourcing/api), `verified_at`
- `created_at` (para histórico)

### ShoppingList (Lista de la compra)
- `id`, `user` (FK), `name`, `created_at`
- Items: `product` (FK), `quantity`, `is_checked`

### OptimizationResult (Resultado de optimización)
- `id`, `shopping_list` (FK), `user_location` (PostGIS)
- `max_distance_km`, `optimization_mode` (precio/tiempo/balanced)
- `total_price`, `total_distance_km`, `estimated_time_minutes`
- `route_data` (JSON con paradas ordenadas)

---

## 🧠 Algoritmo de Optimización (Core del TFG)

El algoritmo pondera tres variables para encontrar la combinación óptima:

```
Score = w_precio * (ahorro_normalizado)
      - w_distancia * (distancia_extra_normalizada)
      - w_tiempo * (tiempo_extra_normalizado)
```

Donde los pesos `w_*` los configura el usuario según sus preferencias (ej: "me importa más el precio que la distancia").

### Pasos del algoritmo:
1. **Ingesta:** Recopilar precios de todos los productos de la lista en tiendas del radio configurado
2. **Generación de candidatos:** Combinaciones de tiendas (max 3-4 paradas)
3. **Evaluación geoespacial:** Calcular distancia real con PostGIS + OSRM
4. **Scoring:** Aplicar función de scoring multicriterio
5. **Ranking:** Devolver top-3 rutas ordenadas por score
6. **Presentación:** Ruta en mapa + desglose de ahorro

---

## 📋 Reglas de Negocio

1. El radio máximo de búsqueda por defecto es 10 km (configurable por el usuario)
2. Máximo 4 paradas por ruta optimizada (configurable, defecto 3)
3. Los precios tienen una caducidad de 48h para scraping y 24h para crowdsourcing
4. Las PYMEs pueden actualizar sus precios manualmente desde el portal business
5. El sistema prioriza fuentes verificadas: API oficial > Scraping > Crowdsourcing
6. La foto de lista/ticket se procesa con OCR + matching fuzzy contra catálogo
7. El asistente LLM solo responde consultas relacionadas con la compra

---

## 🚨 Manejo de Errores

- Usar excepciones Django personalizadas en `backend/apps/core/exceptions.py`
- API siempre responde con formato consistente:
```json
{
  "success": false,
  "error": {
    "code": "STORE_NOT_FOUND",
    "message": "No se encontraron tiendas en el radio especificado",
    "details": {}
  }
}
```
- Logging estructurado con `structlog`
- Errores críticos notificados a Sentry

---

## 🔐 Seguridad

- Nunca hardcodear secrets: usar variables de entorno (.env)
- JWT con refresh tokens y rotación
- Rate limiting en endpoints de scraping y asistente LLM
- CORS configurado solo para dominios autorizados
- Sanitización de inputs en OCR (prevenir inyección)
- HTTPS obligatorio en producción
- Datos sensibles (ubicación usuario) encriptados en reposo

---

## 📝 Documentación de la Memoria

Cada vez que se complete un hito de desarrollo, actualizar la sección correspondiente
en `docs/memoria/`. La memoria sigue la estructura de TFG de la ETSII-US:

1. **Introducción** — Contexto, motivación, alcance
2. **Objetivos** — Objetivo principal + específicos medibles
3. **Antecedentes** — Estado del arte, análisis del sector
4. **Comparativa** — Tabla detallada vs competidores
5. **Herramientas** — Stack con justificación de cada elección
6. **Planificación** — Cronograma, estimación horas y costes
7. **Requisitos** — Actores, RI, RF, RNF, HU, RN
8. **Diseño e implementación** — Arquitectura, modelos, diagramas, UI
9. **Manual de usuario** — Capturas + instrucciones paso a paso
10. **Pruebas** — Estrategia, resultados, cobertura
11. **Conclusiones** — Logros, limitaciones, trabajo futuro
12. **Bibliografía** — IEEE format

---

## ⚡ Comandos Rápidos (Makefile)

```makefile
make setup          # Instalar dependencias y configurar entorno
make dev            # Levantar entorno de desarrollo completo
make test           # Ejecutar todos los tests
make lint           # Lint backend + frontend
make migrate        # Aplicar migraciones Django
make seed           # Poblar BD con datos de prueba
make scrape         # Ejecutar spiders de scraping
make docs           # Generar documentación API
make build          # Build de producción
make deploy-staging # Deploy a staging
```
