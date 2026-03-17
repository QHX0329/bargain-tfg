# ADR-003: Decisiones de diseño de la API REST (Fase 1)

## Fecha: 2026-03-17

## Estado: Aceptado

## Contexto

Durante la implementación del backend en la Fase 1 (tareas F3-01 a F3-06) se tomaron decisiones de diseño que afectan a la consistencia, seguridad y mantenibilidad de la API. Este documento registra cada una de ellas junto con su justificación.

---

## Decisiones

### 1. pg_trgm para búsqueda fuzzy de productos

**Decisión:** Se usa `django.contrib.postgres.search.TrigramSimilarity` sobre el campo `normalized_name` con un índice GIN. El umbral de similitud es 0.3 para el listado general y 0.1 para el endpoint de autocompletado.

**Contexto:** Los términos parciales cortos (por ejemplo "lec" → "leche entera") tienen una similitud trigramática de aproximadamente 0.21, por debajo del umbral estándar de 0.3. Si se aplica el mismo umbral en autocompletado, estas búsquedas no devuelven resultados.

**Justificación:** Bajar el umbral a 0.1 solo en `autocomplete/` permite un comportamiento de prefijo funcional sin degradar la precisión del listado principal, que conserva 0.3 para evitar resultados irrelevantes cuando el usuario escribe términos completos.

**Alternativas descartadas:**
- `LIKE '%...%'`: no usa el índice GIN, rendimiento O(n) a gran escala.
- `SearchVector` con `to_tsvector`: orientado a búsqueda de documentos en lenguaje natural, peor para nombres de productos cortos y marcas.

---

### 2. JWT con vida útil configurable por entorno

**Decisión:** El token de acceso dura 5 minutos en producción y 60 minutos en desarrollo. El parámetro es configurable con `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` en `.env`.

**Justificación:** El estándar de seguridad para tokens de acceso es una vida útil corta (5 min) combinada con rotación del token de refresco, para limitar la ventana de abuso en caso de robo. Sin embargo, durante las pruebas de aceptación (UAT) y el desarrollo local, tokens de 5 minutos interrumpen el flujo de trabajo de forma constante. La externalización a `.env` evita cambios de código entre entornos.

**Consecuencias:** El archivo `.env.example` documenta ambas variables (`JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`) con sus valores de referencia para producción y desarrollo.

---

### 3. Helper `success_response()` en lugar de `Response()` directo

**Decisión:** Se centraliza el formato de respuesta en `apps/core/responses.py` mediante funciones helper (`success_response`, `error_response`). Todos los ViewSets y vistas los usan en lugar de instanciar `Response()` directamente.

**Justificación:** La consistencia del contrato `{success, data}` / `{success, error}` es crítica para el cliente (frontend React Native y Expo). Si cada vista construye la estructura manualmente, es fácil que divergan. Los exception handlers de DRF configurados en `settings.py` también usan el mismo helper para que los errores de validación estándar (400, 401, 403, 404) respondan con el mismo formato que los errores de dominio.

**Consecuencias:** Cualquier nuevo endpoint debe importar y usar `success_response` / `error_response`. El uso directo de `Response()` queda restringido a casos excepcionales que requieran cabeceras personalizadas.

---

### 4. Soft-delete en PriceAlert

**Decisión:** `DELETE /prices/alerts/<id>/` no elimina el registro de la base de datos; pone `is_active=False`.

**Justificación:**
- Permite auditoría completa del historial de alertas del usuario.
- Evita romper referencias en tareas Celery de notificación que estén en cola y aún no hayan procesado la alerta.
- El hard-delete podría generar `ObjectDoesNotExist` en workers asíncronos.

**Consecuencias:** El endpoint devuelve 204 (sin cuerpo) para mantener la semántica HTTP estándar de DELETE, aunque internamente sea una actualización. Los listados de alertas del usuario deben filtrar por `is_active=True`.

---

### 5. Validación del límite de 20 listas activas en la capa de ViewSet

**Decisión:** La regla de negocio RN-003 (máximo 20 listas activas por usuario) se valida en `perform_create()` del `ShoppingListViewSet`, no en el modelo ni con un `constraint` de base de datos.

**Justificación:** La validación a nivel de modelo no permite lanzar respuestas HTTP con código 409. Un `constraint` de PostgreSQL devolvería una excepción de base de datos genérica difícil de transformar en un error semántico de API. Colocando la validación en `perform_create()` se puede lanzar `ActiveListLimitError` con el código `ACTIVE_LIST_LIMIT` y HTTP 409, siguiendo el contrato de errores de la API.

**Consecuencias:** El ViewSet es la única puerta de creación pública de listas. Las importaciones de datos o seeding de desarrollo pueden saltarse este límite accediendo directamente al ORM, lo cual es intencionado.

---

### 6. `related_name` explícito en colaboradores de lista

**Decisión:** El modelo `ListCollaborator` usa `related_name='listcollaborator_set'` en su FK a `ShoppingList`.

**Justificación:** La clase de permisos `IsOwnerOrCollaborator` necesita filtrar listas con `Q(listcollaborator_set__user=user)`. Un `related_name` explícito hace este filtro legible y estable frente a futuros refactors. Si se añaden más modelos de colaboración (por ejemplo, para plantillas compartidas), el nombre genérico `collaborator_set` generaría colisiones o ambigüedad.

---

### 7. `CategoryViewSet` sin paginación

**Decisión:** El endpoint `GET /products/categories/` devuelve el árbol completo de categorías sin paginación.

**Justificación:** La interfaz de usuario necesita el árbol entero para construir el selector de categorías (dropdown jerarquizado). Con la arquitectura de 2 niveles y un máximo estimado de ~200 categorías, el payload es manejable (menos de 10 KB). Paginar el árbol de categorías obligaría al cliente a realizar múltiples peticiones y reconstruir el árbol localmente, añadiendo complejidad sin beneficio real a esta escala.

**Consecuencias:** Si el número de categorías crece significativamente (más de 500), se deberá revisar esta decisión e implementar carga bajo demanda por nivel.

---

### 8. `StoreViewSet` público con `@action favorite` autenticado

**Decisión:** `StoreViewSet` tiene `permission_classes = []` a nivel de clase, lo que hace todas sus acciones públicas. La acción `favorite` sobreescribe esto con `permission_classes = [IsAuthenticated]`.

**Justificación:** Requerir autenticación en la búsqueda de tiendas crearía una barrera de entrada innecesaria: un usuario que aún no tiene cuenta no podría consultar qué tiendas hay en su zona antes de registrarse. La búsqueda de tiendas y precios es el flujo de descubrimiento principal de la aplicación. En cambio, marcar favoritas es una acción de usuario registrado que requiere identificación.

**Consecuencias:** Cualquier nueva acción en `StoreViewSet` que requiera autenticación debe declarar explícitamente `permission_classes = [IsAuthenticated]` en su decorador `@action`.

---

### 9. `@extend_schema` explícito en endpoints con query params manuales

**Decisión:** Se añade el decorador `@extend_schema` de `drf-spectacular` en todos los endpoints que leen parámetros con `request.query_params.get(...)` en lugar de usar `filterset_fields` o serializers de query.

**Justificación:** `drf-spectacular` introspecciona automáticamente los filtros declarados en `filterset_class` y los parámetros de los serializers, pero no detecta lectura directa de `query_params`. Sin `@extend_schema`, el esquema OpenAPI generado no documentaría esos parámetros, produciendo una documentación Swagger incompleta e inutilizable.

**Afecta a:** `ProductViewSet.list()`, `ProductViewSet.autocomplete()`, `StoreViewSet.list()`, `PriceCompareView`, `PriceHistoryView`, `ListTotalView`, y las acciones de colaboradores y plantillas en `ShoppingListViewSet`.

---

### 10. Precio histórico sin hard-delete inmediato

**Decisión:** Los registros `Price` no se eliminan cuando se actualizan. La tarea Celery `mark_stale_prices` solo pone `is_stale=True`. La tarea `purge_old_price_history` hace hard-delete solo de registros con más de 90 días de antigüedad.

**Justificación:** El endpoint `GET /prices/<product_id>/history/` necesita acceder al histórico completo para construir la serie temporal de los últimos 90 días. Si los precios se eliminasen al actualizarse, no habría datos históricos que mostrar. Los precios obsoletos (`is_stale=True`) siguen siendo válidos como dato histórico aunque no sean el precio vigente.

**Consecuencias:** La tabla `Price` crece de forma sostenida. El índice en `(product_id, store_id, created_at)` es necesario para que las consultas de histórico sean eficientes. La tarea de purga a 90 días mantiene el tamaño acotado.

---

## Consecuencias generales

- Todos los endpoints nuevos deben respetar el contrato `{success, data/error}` usando los helpers de `apps/core/responses.py`.
- Las decisiones de autenticación a nivel de acción deben documentarse en el ViewSet con un comentario indicando el porqué, para facilitar revisiones de seguridad.
- Los parámetros de configuración sensibles al entorno (como tiempos de vida de tokens) deben estar siempre en `.env` y documentados en `.env.example`.
