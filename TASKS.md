# TASKS.md — BarGAIN Task Tracker

> **Fuente de verdad única** para el seguimiento de tareas del proyecto BarGAIN.
> Sincronizado con GitHub (git) y espejo del Notion Backlog.
>
> **Notion Backlog:** https://www.notion.so/234f4ce235f74bf388c3892e44bd5667
> **Notion Página principal:** https://www.notion.so/31e6a05f573681c496a6d24e99290150
> **GitHub Repo:** https://github.com/QHX0329/bargain-tfg
> **GitHub Issues:** https://github.com/QHX0329/bargain-tfg/issues
>
> Última sincronización: 2026-03-19 (F4-27 completada — CTA de crear lista en estado vacío de Home, paneles plegables en catálogo y mapa, mejora visual de carteles del mapa y acceso a perfil desde favoritas)

---

## Leyenda de estados

| Símbolo | Estado | Noción equivalente |
|---------|--------|--------------------|
| ⬜ | Pendiente | Not started |
| 🔄 | En progreso | In progress |
| 🔁 | En revisión | In review |
| ✅ | Completada | Done |
| ❌ | Bloqueada | Blocked |

## Leyenda de prioridad

| Símbolo | Prioridad |
|---------|-----------|
| 🔴 | Crítica |
| 🟠 | Alta |
| 🟡 | Media |
| 🟢 | Baja |

---

## Estado actual del proyecto

**Fase activa:** F4 — Desarrollo Frontend (en progreso)
**Semana estimada:** S9
**Horas consumidas:** ~185 h / 300 h totales
**Progreso global:** █████████████░░░░░░░ ~62%

---

## F1 — Análisis y Diseño (45 h) · ✅ Completada

> Semanas S1–S3

| ID | Tarea | Tipo | Módulo | Prioridad | Estado | Horas est. | Horas reales | Entregable |
|----|-------|------|--------|-----------|--------|:---:|:---:|------------|
| F1-01 | Estudio de mercado y competidores | Documentación | Documentación | 🟠 Alta | ✅ | 6 | 7 | `docs/memoria/03-antecedentes.md`, `04-comparativa.md` |
| F1-02 | Definición de objetivos del TFG | Documentación | Documentación | 🔴 Crítica | ✅ | 3 | 3 | `docs/memoria/02-objetivos.md` |
| F1-03 | Especificación de actores del sistema | Documentación | Users | 🟠 Alta | ✅ | 3 | 3 | `docs/memoria/07-requisitos.md` §7.1 |
| F1-04 | Requisitos de información (RI-001–RI-012) | Documentación | Documentación | 🔴 Crítica | ✅ | 6 | 6 | `docs/memoria/07-requisitos.md` §7.2 |
| F1-05 | Requisitos funcionales (RF-001–RF-035) | Documentación | Documentación | 🔴 Crítica | ✅ | 8 | 8 | `docs/memoria/07-requisitos.md` §7.3 |
| F1-06 | Requisitos no funcionales (RNF) | Documentación | Documentación | 🟠 Alta | ✅ | 3 | 3 | `docs/memoria/07-requisitos.md` §7.4 |
| F1-07 | Historias de usuario (HU-001–HU-030) | Historia de Usuario | Documentación | 🟠 Alta | ✅ | 5 | 5 | `docs/memoria/07-requisitos.md` §7.5 |
| F1-08 | Reglas de negocio (RN-001–RN-010) | Documentación | Documentación | 🟠 Alta | ✅ | 2 | 2 | `docs/memoria/07-requisitos.md` §7.6 |
| F1-09 | Sección 8: Diseño e Implementación | Documentación | Documentación | 🔴 Crítica | ✅ | 5 | 5 | `docs/memoria/08-diseno-implementacion.md` |
| F1-10 | Diagrama de arquitectura (capas) | Tarea técnica | Infraestructura | 🟠 Alta | ✅ | 3 | 3 | `docs/diagramas/arquitectura/` |
| F1-11 | Modelo de clases (UML) | Tarea técnica | Documentación | 🟠 Alta | ✅ | 3 | 3 | `docs/diagramas/clases/` |
| F1-12 | Diagramas de casos de uso | Tarea técnica | Documentación | 🟡 Media | ✅ | 2 | 2 | `docs/diagramas/casos-uso/` |
| F1-13 | Diseño de modelo E-R de base de datos | Tarea técnica | Documentación | 🔴 Crítica | ✅ | 3 | 3 | `docs/diagramas/er/` |
| F1-14 | Wireframes / Mockups de UI | Tarea técnica | Documentación | 🟡 Media | ✅ | 5 | 5 | `docs/diagramas/ui-mockups/` |

**Subtotal F1:** 55 h completadas / 45 h estimadas (F1-14 completada el 2026-03-10; F1-01 ampliado con análisis competitivo completo el 2026-03-11)

---

## F2 — Infraestructura Base (30 h) · ✅ Completada

> Semanas S3–S5

| ID | Tarea | Tipo | Módulo | Prioridad | Estado | Horas est. | Entregable |
|----|-------|------|--------|-----------|--------|:---:|------------|
| F2-01 | Inicialización repositorio GitHub + CI/CD | Infraestructura | Infraestructura | 🔴 Crítica | ✅ | 3 | `.github/workflows/`, `Makefile` |
| F2-02 | Configuración Docker + Docker Compose | Infraestructura | Infraestructura | 🔴 Crítica | ✅ | 4 | `Dockerfile`, `docker-compose.*.yml` |
| F2-03 | Setup proyecto Django + settings multi-entorno | Tarea técnica | Infraestructura | 🔴 Crítica | ✅ | 4 | `backend/config/` |
| F2-04 | Configuración PostgreSQL + PostGIS | Tarea técnica | Infraestructura | 🔴 Crítica | ✅ | 3 | Migraciones iniciales |
| F2-05 | Setup React Native + Expo + navegación base (Híbrido) | Tarea técnica | Infraestructura | 🔴 Crítica | ✅ | 5 | Nativo en host |
| F2-06 | Configuración Celery + Redis | Tarea técnica | Infraestructura | 🟠 Alta | ✅ | 2 | `backend/config/celery.py`, `backend/config/__init__.py`, `backend/config/settings/base.py`, `backend/apps/prices/tasks.py`, `backend/apps/scraping/tasks.py` |
| F2-07 | Setup linters (Ruff, ESLint, Prettier) | Infraestructura | Infraestructura | 🟡 Media | ✅ | 2 | 2 | Config files |
| F2-08 | Configuración Sentry + logging estructurado | Infraestructura | Infraestructura | 🟡 Media | ✅ | 2 | 2 | `backend/config/settings/` |
| F2-09 | Seed de datos de prueba (fixtures) | Tarea técnica | Infraestructura | 🟡 Media | ✅ | 3 | `backend/apps/core/management/commands/seed_data.py` |
| F2-10 | Documentación de herramientas usadas | Documentación | Documentación | 🟡 Media | ✅ | 2 | `docs/memoria/05-herramientas.md` |

**Subtotal F2:** 30 h completadas / 30 h estimadas (F2-10 completada el 2026-03-14)

---

## F3 — Desarrollo Core Backend (95 h) · ✅ Completada

> Semanas S5–S12

| ID | Tarea | Módulo | Prioridad | Estado | Horas est. | Horas reales | Notas |
|----|-------|--------|-----------|--------|:---:|:---:|-------|
| F3-01 | Modelo User + roles | Users | 🔴 Crítica | ✅ | 4 | 4 | 01-01, JWT auth, custom User model with phone/role |
| F3-02 | Registro + Login con JWT | Users | 🔴 Crítica | ✅ | 5 | 5 | 01-01, registration, login, token refresh |
| F3-03 | Perfil de usuario + preferencias | Users | 🟠 Alta | ✅ | 3 | 3 | 01-01, profile PATCH, preferences JSON |
| F3-04 | Tests unitarios módulo Users | Users | 🟠 Alta | ✅ | 3 | 2 | 01-01, 22 tests |
| F3-05 | Modelo Product + Category + Brand | Products | 🔴 Crítica | ✅ | 4 | 4 | 01-02, 2-level Category, Product with pg_trgm |
| F3-06 | API CRUD productos con filtros y búsqueda | Products | 🔴 Crítica | ✅ | 4 | 4 | 01-02, fuzzy search, barcode, category filter |
| F3-07 | Normalización de nombres (matching fuzzy) | Products | 🟠 Alta | ✅ | 3 | 3 | 01-02, pg_trgm GIN index, normalized_name |
| F3-08 | Tests unitarios módulo Products | Products | 🟠 Alta | ✅ | 2 | 2 | 01-02, 33 tests |
| F3-09 | Modelo Store con PostGIS PointField | Stores | 🔴 Crítica | ✅ | 4 | 4 | 01-03, StoreChain + Store with PointField |
| F3-10 | API tiendas con búsqueda geoespacial | Stores | 🔴 Crítica | ✅ | 5 | 5 | 01-03, radius search ordered by distance, favorites toggle |
| F3-11 | Integración Google Places API | Stores | 🟡 Media | ➡️ | 3 | - | Movida a F4-21 — requiere pantalla de mapa (F4-11) |
| F3-12 | Tests unitarios módulo Stores | Stores | 🟠 Alta | ✅ | 2 | 2 | 01-03 |
| F3-13 | Modelo Price + PriceHistory | Prices | 🔴 Crítica | ✅ | 3 | 3 | 01-04, Price, PriceAlert, soft-delete pattern |
| F3-14 | API de precios con comparación multi-tienda | Prices | 🔴 Crítica | ✅ | 5 | 5 | 01-04, compare, history, list-total, crowdsource |
| F3-15 | Sistema de caducidad de precios (Celery) | Prices | 🟠 Alta | ✅ | 3 | 3 | 01-04, mark_stale_prices + purge_old_price_history tasks |
| F3-16 | Tests unitarios módulo Prices | Prices | 🟠 Alta | ✅ | 2 | 2 | 01-04 |
| F3-17 | Modelo ShoppingList + ShoppingListItem | Shopping Lists | 🔴 Crítica | ✅ | 3 | 3 | 01-05, ShoppingList, Item, ListCollaborator, ListTemplate |
| F3-18 | API CRUD listas de la compra | Shopping Lists | 🔴 Crítica | ✅ | 4 | 4 | 01-05, CRUD + 20-list limit + enriched items |
| F3-19 | Compartir listas entre usuarios | Shopping Lists | 🟡 Media | ✅ | 2 | 2 | 01-05, collaborators invite by username |
| F3-20 | Tests unitarios módulo Shopping Lists | Shopping Lists | 🟠 Alta | ✅ | 2 | 2 | 01-05 |
| F3-21 | Modelo BusinessProfile + verificación admin | Business | 🟠 Alta | ✅ | 3 | 4 | 02-01, BusinessProfile (tax_id, is_verified, rejection_reason, price alerts), admin verify endpoint |
| F3-22 | Portal de gestión de precios para PYMEs | Business | 🟠 Alta | ✅ | 5 | 5 | 02-01, BusinessPriceViewSet, bulk-update CSV, competidor alert Celery task |
| F3-23 | Sistema de promociones | Business | 🟡 Media | ✅ | 3 | 3 | 02-01, Promotion (product+store FK, discount_type, min_quantity, views), promo active endpoint |
| F3-24 | Tests módulo Business | Business | 🟡 Media | ✅ | 2 | 3 | 02-01, 48 tests (models + API + Celery tasks) |
| F3-25 | Notificaciones push + email | Notifications | 🟡 Media | ✅ | 4 | 5 | 02-02, Notification + UserPushToken models, Expo push tasks, event hooks (price_alert, new_promo, shared_list_changed, business_approved/rejected) |
| F3-26 | Tests módulo Notifications | Notifications | 🟡 Media | ✅ | 2 | 3 | 02-02, 36 tests (models + API inbox + Celery tasks) |
| F3-27 | Tests de integración y E2E backend | Infraestructura | 🟠 Alta | ✅ | 6 | 4 | 01-06, cross-domain happy path, 179 tests total |
| F3-28 | Documentación API (OpenAPI/Swagger) | Documentación | 🟡 Media | ✅ | 3 | 2 | 01-06, Swagger UI + ReDoc at /api/v1/schema/ |

**Subtotal F3:** ~83 h completadas. F3-11 (Google Places) movida a F4-21. Business portal + Notifications completados en Phase 2 GSD.

---

## F4 — Desarrollo Frontend (70 h) · 🔄 En progreso

> Semanas S8–S16

| ID | Tarea | Módulo | Prioridad | Estado | Horas est. | Horas reales | Notas |
|----|-------|--------|-----------|--------|:---:|:---:|-------|
| F4-01 | Sistema de navegación (tabs + stack) | Infraestructura | 🔴 Crítica | ✅ | 3 | 3 | Tab navigator (5 tabs) + stack por sección; verificado con Playwright |
| F4-02 | Tema global (colores, tipografía) | Infraestructura | 🟠 Alta | ✅ | 3 | 4 | Design system "Mercado Mediterráneo Digital": colors, typography, spacing, shadows |
| F4-03 | Componentes reutilizables base | Infraestructura | 🔴 Crítica | ✅ | 4 | 5 | BargainButton, SkeletonBox, SearchBar, PriceTag, ProductCard, AppModal (input/confirm/info) |
| F4-04 | Pantallas Login + Registro | Users | 🔴 Crítica | ✅ | 4 | 5 | Login válido/inválido, registro con 6 campos, auto-login post-registro; verificado |
| F4-05 | Gestión JWT (interceptor Axios, refresh) | Users | 🔴 Crítica | ✅ | 3 | 3 | SecureStore, rehydration al arrancar, auth guard, interceptor refresh |
| F4-06 | Pantalla de perfil de usuario | Users | 🟠 Alta | ✅ | 2 | 3 | Info usuario, sliders optimización independientes (0-100, normalización al guardar), toggles notif, cambio contraseña |
| F4-07 | Pantalla principal de listas | Shopping Lists | 🔴 Crítica | ✅ | 4 | 4 | CRUD listas, AppModal para crear/eliminar, pull-to-refresh, skeleton loading |
| F4-08 | Buscador de productos con autocompletado | Products | 🔴 Crítica | ✅ | 4 | 4 | Autocomplete contra API, sugerencias en tiempo real, añadir producto a lista |
| F4-09 | Gestión de ítems de lista | Shopping Lists | 🔴 Crítica | ✅ | 3 | 3 | Añadir/eliminar/marcar ítems, toggle checked, enrichment product_name |
| F4-10 | Pantalla de comparación de precios | Prices | 🟠 Alta | ✅ | 4 | 3 | PriceCompareScreen: /prices/compare/ con filtro de ubicación, alertas de precio, ordenado por precio efectivo |
| F4-11 | Mapa con tiendas cercanas | Stores | 🟠 Alta | ✅ | 5 | 5 | MapScreen nativa con react-native-maps, markers por cadena, panel inferior de tiendas; web fallback |
| F4-12 | Pantalla configuración optimizador | Optimizer | 🔴 Crítica | ✅ | 3 | 2 | OptimizerConfigScreen: radio, paradas, modo (price/distance/time/balanced), pesos normalizados |
| F4-13 | Visualización de ruta en mapa | Optimizer | 🔴 Crítica | ✅ | 6 | 3 | RouteScreen tab Ruta: paradas ordenadas con conectores, ítems por tienda, subtotales; mock UI lista para API |
| F4-14 | Desglose de ahorro por parada | Optimizer | 🟠 Alta | ✅ | 3 | 2 | RouteScreen tab Ahorro: hero de ahorro, barra comparativa, desglose por tienda y producto; mock UI |
| F4-15 | Pantalla de captura OCR (cámara/galería) | OCR | 🟠 Alta | ✅ | 3 | 2 | OCRScreen tab Captura: permisos cámara/galería, animación de escáner, simulación de procesamiento |
| F4-16 | Revisión y edición de productos OCR | OCR | 🟠 Alta | ✅ | 4 | 2 | OCRScreen tab Revisión: edición de nombre/cantidad/precio, indicador de confianza, añadir a lista |
| F4-17 | Interfaz de chat del asistente | Assistant | 🟠 Alta | ✅ | 5 | 3 | AssistantScreen: chat con burbujas, typing indicator animado, sugerencias rápidas, respuestas mock |
| F4-18 | Historial de conversaciones | Assistant | 🟡 Media | ✅ | 2 | 1 | Integrado en AssistantScreen: historial local de sesión, botón de nueva conversación |
| F4-19 | Dashboard PYME (portal Business web) | Business | 🟡 Media | ✅ | 4 | 5 | Vite+React+AntD: Login, Dashboard, Precios, Promociones, Perfil; auth guard, token refresh |
| F4-20 | Tests frontend (Jest + RNTL) | Infraestructura | 🟠 Alta | ✅ | 4 | 3 | Tests actualizados para reflejar shapes reales de API y cambios de pantallas |
| F4-21 | Integración Google Places API | Stores | 🟡 Media | ⬜ | 3 | - | |
| F4-22 | Flujo catálogo-producto-listas (añadir desde lista + detalle con precios) | Products/Shopping Lists | 🔴 Crítica | ✅ | 6 | 6 | Botón en detalle de lista para abrir catálogo; catálogo con precio mínimo + añadir a listas; detalle de producto con comparación de precios |
| F4-23 | Pulido UX catálogo/listas (cantidad + suma duplicados + simplificación detalle) | Products/Shopping Lists | 🟠 Alta | ✅ | 4 | 4 | Selector de cantidad al añadir producto, backend suma cantidades para duplicados, toast UX en catálogo y eliminación del buscador en detalle de lista |
| F4-24 | Ajuste interacción cantidad y acciones rápidas (quick-add + control item + SearchBar Home) | Products/Shopping Lists | 🟠 Alta | ✅ | 3 | 3 | Quick-add con cantidad desde tarjeta en catálogo; botones +/- por ítem en detalle (si llega a 0 se elimina); eliminación de botón de filtros en SearchBar de Home |
| F4-25 | Alertas de precio + perfil de tienda en mapa + colaboradores de listas | Prices/Stores/Shopping Lists | 🔴 Crítica | ✅ | 8 | 8 | Crear alertas desde pantalla dedicada; abrir perfil de tienda desde mapa (info, favoritos y productos); gestión de colaboradores en detalle de lista |
| F4-26 | CRUD completo alertas + listas renombrables/plantillas + paginación catálogo + refresco en vivo | Prices/Notifications/Shopping Lists/Products | 🔴 Crítica | ✅ | 10 | 10 | Mostrar nombre de producto y modal editable en alertas; botón eliminar de notificaciones funcional; renombrar listas y crear plantilla desde listas; paginación real en catálogo; refresco automático sin recarga manual |
| F4-27 | Mejora UX Home/Catálogo/Mapa/Favoritas (CTA listas + paneles plegables + perfil tienda) | Shopping Lists/Products/Stores | 🔴 Crítica | ✅ | 5 | 5 | Botón crear lista cuando no hay listas en Home; filtros de catálogo plegables; panel de tiendas del mapa plegable (native/web); carteles de markers más cuidados; acceso a StoreProfile desde favoritas |

---

## F5 — IA, Optimizador y Scraping (35 h) · ⬜ Pendiente

> Semanas S10–S17

| ID | Tarea | Módulo | Prioridad | Estado | Horas est. |
|----|-------|--------|-----------|--------|:---:|
| F5-01 | Spider Mercadona | Scraping | 🔴 Crítica | ⬜ | 4 |
| F5-02 | Spider Carrefour | Scraping | 🟠 Alta | ⬜ | 3 |
| F5-03 | Spider Lidl + DIA | Scraping | 🟠 Alta | ⬜ | 4 |
| F5-04 | Pipeline normalización e inserción en BD | Scraping | 🔴 Crítica | ⬜ | 3 |
| F5-05 | Programación tareas con Celery Beat | Scraping | 🟠 Alta | ⬜ | 2 |
| F5-06 | Implementación función de scoring multicriterio | Optimizer | 🔴 Crítica | ⬜ | 5 |
| F5-07 | Integración OR-Tools para rutas | Optimizer | 🟠 Alta | ⬜ | 4 |
| F5-08 | Integración OSRM/Google Directions | Optimizer | 🟠 Alta | ⬜ | 3 |
| F5-09 | Tests del optimizador (casos borde, rendimiento) | Optimizer | 🔴 Crítica | ⬜ | 3 |
| F5-10 | Servicio OCR con Tesseract | OCR | 🟠 Alta | ⬜ | 3 |
| F5-11 | Matching fuzzy OCR → catálogo | OCR | 🟠 Alta | ⬜ | 2 |
| F5-12 | Integración Claude API con contexto de compra | Assistant | 🟠 Alta | ⬜ | 3 |
| F5-13 | Prompt engineering y guardrails del asistente | Assistant | 🟠 Alta | ⬜ | 2 |

---

## F6 — Pruebas, Deploy y Cierre (25 h) · ⬜ Pendiente

> Semanas S17–S20

| ID | Tarea | Tipo | Prioridad | Estado | Horas est. |
|----|-------|------|-----------|--------|:---:|
| F6-01 | Tests de integración completos | Tarea técnica | 🔴 Crítica | ⬜ | 4 |
| F6-02 | Tests E2E (flujo completo usuario) | Tarea técnica | 🟠 Alta | ⬜ | 4 |
| F6-03 | Pruebas de usabilidad (3-5 usuarios reales) | Tarea técnica | 🟠 Alta | ⬜ | 3 |
| F6-04 | Deploy a staging (Render) | Infraestructura | 🔴 Crítica | ⬜ | 3 |
| F6-05 | Corrección de bugs post-testing | Bug | 🔴 Crítica | ⬜ | 4 |
| F6-06 | Redacción final de la memoria | Documentación | 🔴 Crítica | ⬜ | 4 |
| F6-07 | Preparación de la defensa | Documentación | 🟠 Alta | ⬜ | 2 |
| F6-08 | Grabación de demo / vídeo | Documentación | 🟡 Media | ⬜ | 1 |

---

## Memoria del TFG — Estado de secciones

| Sección | Archivo | Estado |
|---------|---------|--------|
| 01 — Introducción | `docs/memoria/01-introduccion.md` | ✅ |
| 02 — Objetivos | `docs/memoria/02-objetivos.md` | ✅ |
| 03 — Antecedentes | `docs/memoria/03-antecedentes.md` | ✅ |
| 04 — Comparativa | `docs/memoria/04-comparativa.md` | ✅ |
| 05 — Herramientas | `docs/memoria/05-herramientas.md` | ✅ |
| 06 — Planificación | `docs/memoria/06-planificacion.md` | ✅ |
| 07 — Requisitos | `docs/memoria/07-requisitos.md` | ✅ |
| 08 — Diseño e Implementación | `docs/memoria/08-diseno-implementacion.md` | ✅ |
| 09 — Manual de usuario | `docs/memoria/09-manual-usuario.md` | ⬜ |
| 10 — Pruebas | `docs/memoria/10-pruebas.md` | ⬜ |
| 11 — Conclusiones | `docs/memoria/11-conclusiones.md` | ⬜ |
| 12 — Bibliografía | `docs/memoria/12-bibliografia.md` | ⬜ |

---

## Convenciones para agentes IA

> Esta sección es de lectura obligatoria para Claude, Gemini, Codex y cualquier otro agente que trabaje en este proyecto.

### Cómo actualizar este archivo

1. **Al empezar una tarea:** Cambiar estado de `⬜` a `🔄` y anotar la fecha en un comentario inline `<!-- YYYY-MM-DD -->`.
2. **Al terminar una tarea:** Cambiar estado a `✅`, rellenar columna `Horas reales` y actualizar el campo "Última sincronización" al principio del archivo.
3. **Al bloquear una tarea:** Cambiar estado a `❌` y añadir nota bajo la tabla con el motivo del bloqueo.
4. **Al añadir una tarea nueva:** Seguir el esquema de ID `FX-NN` (fase + número secuencial), rellenar todos los campos y añadirla en la fase correspondiente.

### Sincronización con Notion

El Notion Backlog (`https://www.notion.so/234f4ce235f74bf388c3892e44bd5667`) es la **fuente de verdad** para vistas Kanban y filtros por semana. Este archivo es el espejo en texto plano, legible por todos los agentes y versionado con git.

Cuando un agente complete una tarea:
- Actualizar este archivo (obligatorio, sin permisos especiales)
- Actualizar la entrada correspondiente en Notion si tiene acceso MCP

### Sincronización con GitHub Issues

Cada tarea de prioridad **Crítica** o **Alta** debe tener un Issue de GitHub asociado. Formato de referencia: `F3-01 → Issue #12`. Al crear un PR relacionado con una tarea, incluir en el título el ID: `feat(users): implementar modelo User (F3-01)`.

### Qué NO hacer

- No reordenar filas sin motivo — el orden es cronológico dentro de cada fase.
- No eliminar tareas completadas — son parte del historial.
- No cambiar IDs de tareas existentes — rompe referencias en commits y PRs.
- No actualizar horas estimadas sin anotar el motivo.
