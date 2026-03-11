# TASKS.md — BargAIn Task Tracker

> **Fuente de verdad única** para el seguimiento de tareas del proyecto BargAIn.
> Sincronizado con GitHub (git) y espejo del Notion Backlog.
>
> **Notion Backlog:** https://www.notion.so/234f4ce235f74bf388c3892e44bd5667
> **Notion Página principal:** https://www.notion.so/31e6a05f573681c496a6d24e99290150
> **GitHub Repo:** https://github.com/QHX0329/bargain-tfg
> **GitHub Issues:** https://github.com/QHX0329/bargain-tfg/issues
>
> Última sincronización: 2026-03-10 (F1-14 completada — wireframes UI)

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

**Fase activa:** F1/F2 — Análisis y Diseño / Infraestructura
**Semana estimada:** S3
**Horas consumidas:** ~63 h / 300 h totales
**Progreso global:** █████░░░░░░░░░░░░░░░ 21%

---

## F1 — Análisis y Diseño (45 h) · 🟡 En progreso

> Semanas S1–S3

| ID | Tarea | Tipo | Módulo | Prioridad | Estado | Horas est. | Horas reales | Entregable |
|----|-------|------|--------|-----------|--------|:---:|:---:|------------|
| F1-01 | Estudio de mercado y competidores | Documentación | Documentación | 🟠 Alta | ✅ | 6 | 6 | `docs/memoria/03-antecedentes.md`, `04-comparativa.md` |
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

**Subtotal F1:** 54 h completadas / 45 h estimadas (F1-14 completada el 2026-03-10)

---

## F2 — Infraestructura Base (30 h) · ⬜ Pendiente

> Semanas S3–S5

| ID | Tarea | Tipo | Módulo | Prioridad | Estado | Horas est. | Entregable |
|----|-------|------|--------|-----------|--------|:---:|------------|
| F2-01 | Inicialización repositorio GitHub + CI/CD | Infraestructura | Infraestructura | 🔴 Crítica | ✅ | 3 | `.github/workflows/`, `Makefile` |
| F2-02 | Configuración Docker + Docker Compose | Infraestructura | Infraestructura | 🔴 Crítica | ✅ | 4 | `Dockerfile`, `docker-compose.*.yml` |
| F2-03 | Setup proyecto Django + settings multi-entorno | Tarea técnica | Infraestructura | 🔴 Crítica | ✅ | 4 | `backend/config/` |
| F2-04 | Configuración PostgreSQL + PostGIS | Tarea técnica | Infraestructura | 🔴 Crítica | ✅ | 3 | Migraciones iniciales |
| F2-05 | Setup React Native + Expo + navegación base | Tarea técnica | Infraestructura | 🔴 Crítica | ⬜ | 5 | `frontend/` scaffolding |
| F2-06 | Configuración Celery + Redis | Tarea técnica | Infraestructura | 🟠 Alta | ⬜ | 2 | `backend/config/celery.py` |
| F2-07 | Setup linters (Ruff, ESLint, Prettier) | Infraestructura | Infraestructura | 🟡 Media | ⬜ | 2 | Config files |
| F2-08 | Configuración Sentry + logging estructurado | Infraestructura | Infraestructura | 🟡 Media | ⬜ | 2 | `backend/config/settings/` |
| F2-09 | Seed de datos de prueba (fixtures) | Tarea técnica | Infraestructura | 🟡 Media | ⬜ | 3 | `backend/scripts/seed.py` |
| F2-10 | Documentación de herramientas usadas | Documentación | Documentación | 🟡 Media | ⬜ | 2 | `docs/memoria/05-herramientas.md` |

---

## F3 — Desarrollo Core Backend (95 h) · ⬜ Pendiente

> Semanas S5–S12

| ID | Tarea | Módulo | Prioridad | Estado | Horas est. |
|----|-------|--------|-----------|--------|:---:|
| F3-01 | Modelo User + roles | Users | 🔴 Crítica | ⬜ | 4 |
| F3-02 | Registro + Login con JWT | Users | 🔴 Crítica | ⬜ | 5 |
| F3-03 | Perfil de usuario + preferencias | Users | 🟠 Alta | ⬜ | 3 |
| F3-04 | Tests unitarios módulo Users | Users | 🟠 Alta | ⬜ | 3 |
| F3-05 | Modelo Product + Category + Brand | Products | 🔴 Crítica | ⬜ | 4 |
| F3-06 | API CRUD productos con filtros y búsqueda | Products | 🔴 Crítica | ⬜ | 4 |
| F3-07 | Normalización de nombres (matching fuzzy) | Products | 🟠 Alta | ⬜ | 3 |
| F3-08 | Tests unitarios módulo Products | Products | 🟠 Alta | ⬜ | 2 |
| F3-09 | Modelo Store con PostGIS PointField | Stores | 🔴 Crítica | ⬜ | 4 |
| F3-10 | API tiendas con búsqueda geoespacial | Stores | 🔴 Crítica | ⬜ | 5 |
| F3-11 | Integración Google Places API | Stores | 🟡 Media | ⬜ | 3 |
| F3-12 | Tests unitarios módulo Stores | Stores | 🟠 Alta | ⬜ | 2 |
| F3-13 | Modelo Price + PriceHistory | Prices | 🔴 Crítica | ⬜ | 3 |
| F3-14 | API de precios con comparación multi-tienda | Prices | 🔴 Crítica | ⬜ | 5 |
| F3-15 | Sistema de caducidad de precios (Celery) | Prices | 🟠 Alta | ⬜ | 3 |
| F3-16 | Tests unitarios módulo Prices | Prices | 🟠 Alta | ⬜ | 2 |
| F3-17 | Modelo ShoppingList + ShoppingListItem | Shopping Lists | 🔴 Crítica | ⬜ | 3 |
| F3-18 | API CRUD listas de la compra | Shopping Lists | 🔴 Crítica | ⬜ | 4 |
| F3-19 | Compartir listas entre usuarios | Shopping Lists | 🟡 Media | ⬜ | 2 |
| F3-20 | Tests unitarios módulo Shopping Lists | Shopping Lists | 🟠 Alta | ⬜ | 2 |
| F3-21 | Modelo BusinessProfile + Subscription | Business | 🟠 Alta | ⬜ | 3 |
| F3-22 | Portal de gestión de precios para PYMEs | Business | 🟠 Alta | ⬜ | 5 |
| F3-23 | Sistema de promociones | Business | 🟡 Media | ⬜ | 3 |
| F3-24 | Tests módulo Business | Business | 🟡 Media | ⬜ | 2 |
| F3-25 | Notificaciones push + email | Notifications | 🟡 Media | ⬜ | 4 |
| F3-26 | Tests módulo Notifications | Notifications | 🟡 Media | ⬜ | 2 |
| F3-27 | Tests de integración y E2E backend | Infraestructura | 🟠 Alta | ⬜ | 6 |
| F3-28 | Documentación API (OpenAPI/Swagger) | Documentación | 🟡 Media | ⬜ | 3 |

---

## F4 — Desarrollo Frontend (70 h) · ⬜ Pendiente

> Semanas S8–S16

| ID | Tarea | Módulo | Prioridad | Estado | Horas est. |
|----|-------|--------|-----------|--------|:---:|
| F4-01 | Sistema de navegación (tabs + stack) | Infraestructura | 🔴 Crítica | ⬜ | 3 |
| F4-02 | Tema global (colores, tipografía) | Infraestructura | 🟠 Alta | ⬜ | 3 |
| F4-03 | Componentes reutilizables base | Infraestructura | 🔴 Crítica | ⬜ | 4 |
| F4-04 | Pantallas Login + Registro | Users | 🔴 Crítica | ⬜ | 4 |
| F4-05 | Gestión JWT (interceptor Axios, refresh) | Users | 🔴 Crítica | ⬜ | 3 |
| F4-06 | Pantalla de perfil de usuario | Users | 🟠 Alta | ⬜ | 2 |
| F4-07 | Pantalla principal de listas | Shopping Lists | 🔴 Crítica | ⬜ | 4 |
| F4-08 | Buscador de productos con autocompletado | Products | 🔴 Crítica | ⬜ | 4 |
| F4-09 | Gestión de ítems de lista | Shopping Lists | 🔴 Crítica | ⬜ | 3 |
| F4-10 | Pantalla de comparación de precios | Prices | 🟠 Alta | ⬜ | 4 |
| F4-11 | Mapa con tiendas cercanas | Stores | 🟠 Alta | ⬜ | 5 |
| F4-12 | Pantalla configuración optimizador | Optimizer | 🔴 Crítica | ⬜ | 3 |
| F4-13 | Visualización de ruta en mapa | Optimizer | 🔴 Crítica | ⬜ | 6 |
| F4-14 | Desglose de ahorro por parada | Optimizer | 🟠 Alta | ⬜ | 3 |
| F4-15 | Pantalla de captura OCR (cámara/galería) | OCR | 🟠 Alta | ⬜ | 3 |
| F4-16 | Revisión y edición de productos OCR | OCR | 🟠 Alta | ⬜ | 4 |
| F4-17 | Interfaz de chat del asistente | Assistant | 🟠 Alta | ⬜ | 5 |
| F4-18 | Historial de conversaciones | Assistant | 🟡 Media | ⬜ | 2 |
| F4-19 | Dashboard PYME (portal Business web) | Business | 🟡 Media | ⬜ | 4 |
| F4-20 | Tests frontend (Jest + RNTL) | Infraestructura | 🟠 Alta | ⬜ | 4 |

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
| 05 — Herramientas | `docs/memoria/05-herramientas.md` | ⬜ |
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
