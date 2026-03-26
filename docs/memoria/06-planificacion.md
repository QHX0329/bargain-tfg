# 6. Análisis Temporal y de Costes de Desarrollo

## Resumen Ejecutivo

El proyecto BargAIn se planifica con una duración estimada de **20 semanas** (5 meses), con una dedicación media de 15 horas semanales, totalizando aproximadamente **300 horas de trabajo**. El desarrollo se organiza en 6 fases principales que se solapan parcialmente para optimizar el tiempo.

---

## 6.1 Cronograma General

| Fase                            | Semanas | Duración       | Horas        |
| ------------------------------- | ------- | -------------- | ------------ |
| F1 — Análisis y Diseño          | S1–S3   | 3 semanas      | 45 h         |
| F2 — Infraestructura Base       | S3–S5   | 3 semanas      | 30 h         |
| F3 — Desarrollo Core Backend    | S5–S12  | 8 semanas      | 95 h         |
| F4 — Desarrollo Frontend        | S8–S16  | 9 semanas      | 70 h         |
| F5 — IA, Optimizador y Scraping | S10–S17 | 8 semanas      | 35 h         |
| F6 — Pruebas, Deploy y Memoria  | S1–S20  | Continua       | 25 h         |
| **Documentación (transversal)** | S1–S20  | Continua       | **Incluida** |
| **TOTAL**                       |         | **20 semanas** | **~300 h**   |

---

## 6.2 Desglose Detallado por Tareas

### FASE 1 — Análisis y Diseño (45 h)

| Tarea                                       | Horas  | Semana | Entregable                                             |
| ------------------------------------------- | ------ | ------ | ------------------------------------------------------ |
| Estudio de mercado y competidores           | 6      | S1     | `docs/memoria/03-antecedentes.md`, `04-comparativa.md` |
| Definición de objetivos del TFG             | 3      | S1     | `docs/memoria/02-objetivos.md`                         |
| Especificación de actores del sistema       | 3      | S1     | `docs/memoria/07-requisitos.md` (actores)              |
| Requisitos de información (RI-001 a RI-012) | 6      | S1–S2  | `docs/memoria/07-requisitos.md` (RI)                   |
| Requisitos funcionales (RF-001 a RF-035)    | 8      | S2     | `docs/memoria/07-requisitos.md` (RF)                   |
| Requisitos no funcionales (RNF)             | 3      | S2     | `docs/memoria/07-requisitos.md` (RNF)                  |
| Historias de usuario (30 HU)                | 5      | S2     | `docs/memoria/07-requisitos.md` (HU)                   |
| Reglas de negocio                           | 2      | S2     | `docs/memoria/07-requisitos.md` (RN)                   |
| Diseño de arquitectura (diagrama de capas)  | 3      | S3     | `docs/diagramas/arquitectura/`                         |
| Modelo de clases (diagrama UML)             | 3      | S3     | `docs/diagramas/clases/`                               |
| Diagramas de casos de uso                   | 2      | S3     | `docs/diagramas/casos-uso/`                            |
| Diseño de modelo E-R de base de datos       | 3      | S3     | `docs/diagramas/er/`                                   |
| Wireframes / Mockups de UI                  | 5      | S3     | `docs/diagramas/ui-mockups/`                           |
| **Subtotal**                                | **45** |        |                                                        |

### FASE 2 — Infraestructura Base (30 h)

| Tarea                                          | Horas  | Semana | Entregable                                           |
| ---------------------------------------------- | ------ | ------ | ---------------------------------------------------- |
| Inicialización repositorio GitHub + CI/CD      | 3      | S3     | `.github/workflows/`, `Makefile`                     |
| Configuración Docker + Docker Compose          | 4      | S3     | `Dockerfile`, `docker-compose.*.yml`                 |
| Setup proyecto Django + settings multi-entorno | 4      | S4     | `backend/config/`                                    |
| Configuración PostgreSQL + PostGIS             | 3      | S4     | Migraciones iniciales                                |
| Setup React Native + Expo + navegación base    | 5      | S4     | `frontend/` scaffolding                              |
| Configuración Celery + Redis                   | 2      | S4     | `backend/config/celery.py`                           |
| Setup linters (Ruff, ESLint, Prettier)         | 2      | S5     | Config files                                         |
| Configuración Sentry + logging estructurado    | 2      | S5     | `backend/config/settings/`                           |
| Seed de datos de prueba (fixtures)             | 3      | S5     | `backend/apps/core/management/commands/seed_data.py` |
| Documentación de herramientas usadas           | 2      | S5     | `docs/memoria/05-herramientas.md`                    |
| **Subtotal**                                   | **30** |        |                                                      |

### FASE 3 — Desarrollo Core Backend (95 h)

| Tarea                                          | Horas  | Semana | Entregable                              |
| ---------------------------------------------- | ------ | ------ | --------------------------------------- |
| **Módulo Users**                               |        |        |                                         |
| Modelo User + roles (consumidor, PYME, admin)  | 4      | S5     | `apps/users/models.py`                  |
| Registro + Login con JWT (access + refresh)    | 5      | S5     | `apps/users/views.py`, `serializers.py` |
| Perfil de usuario + preferencias               | 3      | S6     | Endpoints CRUD perfil                   |
| Tests unitarios módulo users                   | 3      | S6     | `tests/unit/test_users.py`              |
| **Módulo Products**                            |        |        |                                         |
| Modelo Product + Category + Brand              | 4      | S6     | `apps/products/models.py`               |
| API CRUD productos con filtros y búsqueda      | 4      | S6     | Endpoints + serializers                 |
| Normalización de nombres de producto           | 3      | S7     | Servicio de matching fuzzy              |
| Tests unitarios módulo products                | 2      | S7     | `tests/unit/test_products.py`           |
| **Módulo Stores**                              |        |        |                                         |
| Modelo Store con PostGIS PointField            | 4      | S7     | `apps/stores/models.py`                 |
| API de tiendas con búsqueda geoespacial        | 5      | S7     | Filtros por radio, coordenadas          |
| Integración Google Places API (datos tiendas)  | 3      | S8     | Servicio externo                        |
| Tests unitarios módulo stores                  | 2      | S8     | `tests/unit/test_stores.py`             |
| **Módulo Prices**                              |        |        |                                         |
| Modelo Price + PriceHistory                    | 3      | S8     | `apps/prices/models.py`                 |
| API de precios con comparación multi-tienda    | 5      | S8     | Endpoints + lógica                      |
| Sistema de verificación y caducidad de precios | 3      | S9     | Tarea Celery periódica                  |
| Tests unitarios módulo prices                  | 2      | S9     | `tests/unit/test_prices.py`             |
| **Módulo Shopping Lists**                      |        |        |                                         |
| Modelo ShoppingList + ShoppingListItem         | 3      | S9     | `apps/shopping_lists/models.py`         |
| API CRUD listas de la compra                   | 4      | S9     | Endpoints completos                     |
| Compartir listas entre usuarios                | 2      | S10    | Lógica de permisos                      |
| Tests unitarios módulo shopping_lists          | 2      | S10    | `tests/unit/test_shopping.py`           |
| **Módulo Business (Portal PYMES)**             |        |        |                                         |
| Modelo BusinessProfile + Subscription          | 3      | S10    | `apps/business/models.py`               |
| Portal de gestión de precios para PYMES        | 5      | S10    | Endpoints + permisos                    |
| Sistema de promociones                         | 3      | S11    | Modelo + API                            |
| Tests módulo business                          | 2      | S11    | `tests/unit/test_business.py`           |
| **Módulo Notifications**                       |        |        |                                         |
| Notificaciones push + email con templates      | 4      | S11    | `apps/notifications/`                   |
| Tests módulo notifications                     | 2      | S11    | Tests                                   |
| **Integración y tests E2E backend**            | 6      | S12    | `tests/integration/`, `tests/e2e/`      |
| Documentación API (OpenAPI/Swagger)            | 3      | S12    | `docs/api/`                             |
| **Subtotal**                                   | **95** |        |                                         |

### FASE 4 — Desarrollo Frontend (70 h)

| Tarea                                               | Horas  | Semana  | Entregable            |
| --------------------------------------------------- | ------ | ------- | --------------------- |
| **Navegación y Layout**                             |        |         |                       |
| Sistema de navegación (tabs + stack)                | 3      | S8      | `navigation/`         |
| Tema global (colores, tipografía, componentes base) | 3      | S8      | `theme/`              |
| Componentes reutilizables (botones, cards, inputs)  | 4      | S9      | `components/`         |
| **Autenticación**                                   |        |         |                       |
| Pantallas Login + Registro                          | 4      | S9      | `screens/auth/`       |
| Gestión JWT (interceptor Axios, refresh automático) | 3      | S9      | `api/client.ts`       |
| Pantalla de perfil de usuario                       | 2      | S10     | `screens/profile/`    |
| **Lista de la Compra**                              |        |         |                       |
| Pantalla principal de listas                        | 4      | S10     | `screens/shopping/`   |
| Buscador de productos con autocompletado            | 4      | S11     | Componente + servicio |
| Gestión de ítems (añadir, eliminar, cantidad)       | 3      | S11     | CRUD frontend         |
| **Comparación de Precios**                          |        |         |                       |
| Pantalla de comparación por producto                | 4      | S12     | `screens/prices/`     |
| Vista de mapa con tiendas cercanas                  | 5      | S12     | React Native Maps     |
| **Optimizador de Ruta**                             |        |         |                       |
| Pantalla de configuración de optimización           | 3      | S13     | Sliders preferencias  |
| Visualización de ruta optimizada en mapa            | 6      | S13–S14 | Polylines + markers   |
| Desglose de ahorro por parada                       | 3      | S14     | Componente resumen    |
| **OCR / Visión**                                    |        |         |                       |
| Pantalla de captura de foto (cámara/galería)        | 3      | S14     | Expo Camera           |
| Visualización y edición de productos reconocidos    | 4      | S15     | Lista editable        |
| **Asistente LLM**                                   |        |         |                       |
| Interfaz de chat con el asistente                   | 5      | S15     | `screens/assistant/`  |
| Historial de conversaciones                         | 2      | S15     | Persistencia local    |
| **Portal Business (Web)**                           |        |         |                       |
| Dashboard de PYME (gestión precios y promos)        | 4      | S16     | React web companion   |
| **Tests frontend**                                  | 4      | S16     | Jest + RNTL           |
| **Subtotal**                                        | **70** |         |                       |

### FASE 5 — IA, Optimizador y Scraping (35 h)

| Tarea                                                     | Horas  | Semana | Entregable                      |
| --------------------------------------------------------- | ------ | ------ | ------------------------------- |
| **Web Scraping**                                          |        |        |                                 |
| Spider Mercadona                                          | 4      | S10    | `scraping/spiders/mercadona.py` |
| Spider Carrefour                                          | 3      | S11    | `scraping/spiders/carrefour.py` |
| Spider Lidl + DIA                                         | 4      | S12    | Spiders adicionales             |
| Pipeline de normalización e inserción en BD               | 3      | S12    | `scraping/pipelines.py`         |
| Programación de tareas con Celery Beat                    | 2      | S13    | Cron de scraping                |
| **Algoritmo Optimizador**                                 |        |        |                                 |
| Implementación función de scoring multicriterio           | 5      | S13    | `apps/optimizer/services.py`    |
| Integración OR-Tools para rutas                           | 4      | S14    | Motor de optimización           |
| Integración OSRM/Google Directions para distancias reales | 3      | S14    | Servicio externo                |
| Tests del optimizador (casos borde, rendimiento)          | 3      | S15    | Tests especializados            |
| **OCR Backend**                                           |        |        |                                 |
| Servicio de procesamiento de imágenes (Google Vision API) | 3      | S15    | `apps/ocr/services.py`          |
| Matching fuzzy de texto OCR contra catálogo               | 2      | S16    | Integración                     |
| **Asistente LLM**                                         |        |        |                                 |
| Integración Claude API con contexto de compra             | 3      | S16    | `apps/assistant/services.py`    |
| Prompt engineering y guardrails                           | 2      | S17    | Templates de prompts            |
| **Subtotal**                                              | **35** |        |                                 |

### FASE 6 — Pruebas, Deploy y Cierre (25 h)

| Tarea                                       | Horas  | Semana  | Entregable                |
| ------------------------------------------- | ------ | ------- | ------------------------- |
| Tests de integración completos              | 4      | S17     | Suites de tests           |
| Tests E2E (flujo completo usuario)          | 4      | S17     | Cypress / Detox           |
| Pruebas de usabilidad (3-5 usuarios reales) | 3      | S18     | Informe de usabilidad     |
| Deploy a staging (Render)                   | 3      | S18     | Entorno staging operativo |
| Corrección de bugs post-testing             | 4      | S18–S19 | Fixes                     |
| Redacción final de la memoria               | 4      | S19–S20 | Memoria completa          |
| Preparación de la defensa                   | 2      | S20     | Presentación              |
| Grabación de demo / vídeo                   | 1      | S20     | Demo funcional            |
| **Subtotal**                                | **25** |         |                           |

---

## 6.3 Resumen de Horas por Fase

| Fase                            | Horas Estimadas | % del Total |
| ------------------------------- | :-------------: | :---------: |
| F1 — Análisis y Diseño          |      45 h       |    15.0%    |
| F2 — Infraestructura Base       |      30 h       |    10.0%    |
| F3 — Desarrollo Core Backend    |      95 h       |    31.7%    |
| F4 — Desarrollo Frontend        |      70 h       |    23.3%    |
| F5 — IA, Optimizador y Scraping |      35 h       |    11.7%    |
| F6 — Pruebas, Deploy y Cierre   |      25 h       |    8.3%     |
| **TOTAL**                       |    **300 h**    |  **100%**   |

---

## 6.4 Estimación de Costes

Basado en el _Informe final de la consulta preliminar del mercado de perfiles profesionales en el ámbito informático_ (Junta de Andalucía, 2018), columna "Media acotada todos valores" para perfiles junior (<6 años de experiencia):

| Fase                       |  Horas  | Rol                                | Tarifa (€/h) |  Coste (€)   |
| -------------------------- | :-----: | ---------------------------------- | :----------: | :----------: |
| Análisis y Diseño          |   45    | Analista funcional de aplicaciones |    33,12     |   1.490,40   |
| Infraestructura Base       |   30    | Administrador de sistemas          |    28,72     |    861,60    |
| Desarrollo Backend         |   95    | Programador J2EE/Web               |    28,72     |   2.728,40   |
| Desarrollo Frontend        |   70    | Programador J2EE/Web               |    28,72     |   2.010,40   |
| IA, Optimizador y Scraping |   35    | Programador J2EE/Web               |    28,72     |   1.005,20   |
| Pruebas y Deploy           |   25    | Tester de calidad                  |    23,77     |    594,25    |
| **TOTAL**                  | **300** |                                    |              | **8.690,25** |

El coste total estimado del proyecto BargAIn asciende a **8.690,25 € (sin IVA)**.

### Costes de infraestructura (estimación anual)

| Servicio               | Coste mensual | Notas                            |
| ---------------------- | :-----------: | -------------------------------- |
| Render (Staging)       |      0 €      | Plan gratuito durante desarrollo |
| PostgreSQL (Render)    |      0 €      | Plan gratuito (90 días)          |
| Google Maps API        |     ~10 €     | Crédito gratuito 200$/mes        |
| Claude API (Anthropic) |     ~15 €     | Consumo moderado                 |
| Sentry                 |      0 €      | Plan developer                   |
| **Total mensual**      |   **~25 €**   |                                  |

---

## 6.5 Gestión de Riesgos

| Riesgo                                           | Probabilidad | Impacto | Mitigación                                                     |
| ------------------------------------------------ | :----------: | :-----: | -------------------------------------------------------------- |
| Cambios en estructura web de supermercados       |     Alta     |  Medio  | Spiders modulares, tests de validación, fallback crowdsourcing |
| API de Google Maps excede crédito gratuito       |     Baja     |  Bajo   | Caché agresivo, OSRM como alternativa OSS                      |
| Rendimiento del optimizador con muchos productos |    Media     |  Alto   | Limitar combinaciones, pre-filtrado geoespacial, caché         |
| Bloqueo de scraping por supermercados            |    Media     |  Alto   | Rotación de User-Agents, Playwright, respetar robots.txt       |
| Disponibilidad limitada por estudios             |     Alta     |  Medio  | Buffer de 2 semanas, planificación flexible                    |
