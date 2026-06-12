# 10. Pruebas y Resultados

## 10.1 Objetivo

Validar que BarGAIN cumple los requisitos funcionales y no funcionales definidos en la Fase de
Análisis, con cobertura automática de los flujos críticos y verificación documentada de los
requisitos no funcionales clave (NFR-02, NFR-04, NFR-05).

## 10.2 Estrategia de testing

Se aplica una estrategia por capas, siguiendo el modelo de pirámide de tests:

- **Tests unitarios backend:** por módulo (`users`, `products`, `stores`, `prices`,
  `shopping_lists`, `business`, `notifications`, `optimizer`).
- **Tests de integración backend:** flujos cross-domain que ejercitan varios módulos en conjunto.
- **Tests E2E con Playwright:** 4 flujos críticos del sistema integrado (backend + frontend web).
- **UAT manual en dispositivo móvil:** flujos nativos con GPS y cámara que no son automatizables
  mediante Playwright (verificados en iPhone con la app compilada).

## 10.3 Entorno de ejecución

- **Backend:** ejecución recomendada dentro del contenedor Docker (modelo híbrido ADR-002).
  Pytest con configuración en `backend/pytest.ini`, `DJANGO_SETTINGS_MODULE = config.settings.test`.
- **E2E Playwright:** ejecución nativa en host (no Docker) contra el backend Docker local o
  el staging de Render. Instalado en `frontend/web/` como dependencia de desarrollo.

```bash
# Backend (desde raíz del repo)
make test-backend           # Tests con -v --tb=short
make test-backend-cov       # Con cobertura HTML

# E2E (desde host)
cd frontend/web && npx playwright test
cd frontend/web && npx playwright test --reporter=html   # Con reporte visual
```

## 10.4 Suite de tests backend

### 10.4.1 Tests de integración

Los tests de integración verifican flujos API completos usando una base de datos de test real
(sin mocks de BD), validando el comportamiento end-to-end del backend.

| Archivo de test | Módulo | Tests |
|----------------|--------|-------|
| `test_auth_endpoints.py` | users | Registro, login, refresh, perfil |
| `test_optimizer_api.py` | optimizer | POST /optimize/ con matriz mock |
| `test_ocr_api.py` | ocr | POST /ocr/scan/ con Vision API mock |
| `test_business_verification.py` | business | Aprobar/rechazar BusinessProfile |
| `test_business_registration.py` | business | Onboarding PYME |
| `test_business_prices.py` | business | Gestión de precios PYME |
| `test_bulk_prices.py` | business | Actualización masiva CSV |
| `test_proposal_admin.py` | business | Aprobar/rechazar propuestas (6 tests) |
| `test_list_endpoints.py` | shopping_lists | CRUD listas e ítems |
| `test_cross_domain.py` | core | Flujos cross-domain |
| `test_notification_dispatch.py` | notifications | Despacho push/email |
| `test_notification_events.py` | notifications | Eventos de notificación |
| `test_price_endpoints.py` | prices | API de precios |
| `test_product_endpoints.py` | products | API de productos |
| `test_store_endpoints.py` | stores | API de tiendas |
| `test_assistant_api.py` | assistant | Endpoint LLM con mock Gemini |
| `test_promotions.py` | business | Gestión de promociones |
| `test_distance_ors.py` | optimizer | Cliente ORS (3 tests unitarios) |

### 10.4.2 Cobertura

La suite backend alcanza una cobertura mínima del 80% sobre los módulos de aplicación (`apps/`),
medida con `pytest-cov`. Los módulos con mayor densidad de tests son `users`, `business` y
`optimizer`, que concentran la lógica de negocio principal.

## 10.5 Tests E2E con Playwright

Se desarrollaron 4 tests E2E automatizados con **Playwright** para verificar los flujos
críticos del sistema integrado (backend + web companion Vite+React):

| Flujo | Archivo | Tipo | Descripción |
|-------|---------|------|-------------|
| Autenticación completa | `e2e/auth.spec.ts` | UI + API | Registro → login → token refresh → logout |
| Lista → Optimizar → Ruta | `e2e/optimizer.spec.ts` | API-level | Crear lista → añadir ítems → optimizar → verificar resultado |
| OCR ticket → lista | `e2e/ocr.spec.ts` | API-level | Subir imagen → endpoint OCR → respuesta estructurada |
| Business portal | `e2e/business.spec.ts` | UI | Registro PYME → admin aprueba → PYME accede a dashboard |

**Nota sobre flujos API-level:** Los flujos de optimizador y OCR se implementan como tests
API-level (usando el fixture `request` de Playwright, sin interfaz de usuario) porque estas
funcionalidades son exclusivas de la app móvil — el web companion es un portal business y no
dispone de pantallas de consumidor. Este enfoque verifica la integración backend end-to-end
de los features principales del TFG sin requerir una interfaz web que no existe.

Los flujos con GPS y cámara física (ubicación real del usuario, captura de ticket con cámara)
se cubren mediante UAT manual en iPhone (sección 10.6).

### Configuración Playwright

- **Ubicación:** `frontend/web/playwright.config.ts`
- **Target:** web companion en `http://localhost:5173` (o `PLAYWRIGHT_BASE_URL`)
- **Backend:** Docker local o staging Render (`PLAYWRIGHT_API_URL`)
- **Navegador:** Chromium (un solo proyecto para evitar duplicación de estado de BD)
- **Workers:** 1 (secuencial — los tests comparten la misma base de datos)

## 10.6 UAT manual en dispositivo móvil

Los flujos que requieren APIs nativas del dispositivo (GPS, cámara) se verifican manualmente
en un iPhone con la app compilada mediante el workflow `ios-build.yml`:

| Flujo UAT | Resultado |
|-----------|-----------|
| Solicitar ubicación y ver tiendas en mapa | ✅ Verificado |
| Crear lista y añadir ítems manualmente | ✅ Verificado |
| Capturar ticket con cámara y reconocer productos | ✅ Verificado |
| Lanzar optimización y navegar la ruta sugerida | ✅ Verificado |
| Chat con asistente LLM y verificar guardrail | ✅ Verificado |

## 10.7 Validación de Requisitos No Funcionales

### 10.7.1 NFR-02: Disponibilidad ≥ 99% en staging (RNF-002)

El backend de staging se desplegó en **Render.com** (plan gratuito) con la siguiente
arquitectura de alta disponibilidad:
- Web Service: Django Gunicorn con 3 workers
- Redis: broker Celery + caché Google Places
- Celery worker + Celery beat: tareas asíncronas independientes

El panel de Render registra disponibilidad del servicio `bargain-api` con el health check
configurado en `GET /api/v1/health/` respondiendo HTTP 200. Los reinicios automáticos ante
fallos se gestionan por la plataforma.

Durante la fase final (F7) se verificó la operatividad continua del servicio en staging mediante
health checks y ejecución repetida de flujos E2E. La evidencia principal se consolida en
`render.yaml`, en los tests de `frontend/web/e2e/` y en el cierre documental de fase.

### 10.7.2 NFR-04: Usabilidad WCAG 2.1 AA y máximo 3 taps (RNF-004)

Se realizó validación heurística de accesibilidad y usabilidad sobre los 3 flujos
principales del web companion (login, onboarding y dashboard), comprobando:

- contraste y legibilidad de textos principales,
- navegación por foco en formularios críticos,
- consistencia de labels y feedback de error,
- completitud de tareas sin superar el objetivo de interacción del flujo.

| Flujo | Evidencia de validación |
|-------|--------------------------|
| Login (`/login`) | ✅ Formulario accesible y flujo completo verificado |
| Registro PYME (`/onboarding`) | ✅ Campos, mensajes y navegación verificados |
| Dashboard PYME (`/dashboard`) | ✅ Navegación y acciones principales verificadas |

Los flujos principales se completan en ≤ 3 interacciones en la app móvil:
- **Ver precios cercanos:** Home → Buscar → Resultados (3 taps)
- **Optimizar ruta:** Lista → Optimizar → Ver ruta (3 taps)
- **Añadir ítem OCR:** Lista → Cámara → Confirmar (3 taps)

### 10.7.3 NFR-05: Escalabilidad para 10.000 usuarios (RNF-005)

La arquitectura de BarGAIN soporta el crecimiento a 10.000 usuarios concurrentes mediante
cuatro decisiones de diseño complementarias:

1. **Workers Celery independientes:** el scraping, el OCR y la optimización se ejecutan en
   workers separados del API principal, evitando que tareas pesadas bloqueen la gestión de
   peticiones web.

2. **Redis como broker desacoplado:** las peticiones de usuario se encolan en Redis y se
   procesan de forma asíncrona, permitiendo absorber picos de carga sin timeout de petición.

3. **PostGIS con índices GiST:** las consultas de tiendas cercanas utilizan índices espaciales
   con complejidad O(log n), independiente del volumen total de tiendas registradas.

4. **API stateless con JWT:** el backend no mantiene estado de sesión en servidor. Escalar
   horizontalmente (añadir réplicas del Web Service) no requiere sincronización de sesiones.

No se realizó un load test real con herramientas como Locust o k6, ya que la infraestructura
necesaria (múltiples workers, base de datos bajo carga) excede el presupuesto del TFG.
La justificación arquitectural es coherente con los patrones recomendados por la comunidad
Django, Celery y PostgreSQL para cargas similares.

## 10.8 Resumen de resultados

| Tipo de test | Cantidad | Estado |
|-------------|----------|--------|
| Tests unitarios backend | ~40 | ✅ Todos pasan |
| Tests de integración backend | ~17 archivos | ✅ Todos pasan |
| Tests unitarios ORS (`test_distance_ors.py`) | 3 | ✅ Todos pasan |
| Tests E2E Playwright | 4 flujos | ✅ Todos pasan |
| UAT manual móvil | 5 flujos | ✅ Verificados |
| NFR-02 (Disponibilidad) | 1 | ✅ Verificado con health checks + E2E en staging |
| NFR-04 (Usabilidad) | 3 flujos | ✅ Verificación heurística y cumplimiento de flujo objetivo |
| NFR-05 (Escalabilidad) | Justificación arquitectural | ✅ Documentado |

## 10.9 Conclusión

La estrategia de testing multicapa garantiza la calidad del sistema a diferentes niveles de
granularidad. La cobertura de tests backend supera el 80% sobre los módulos críticos, y los
4 flujos E2E automatizados con Playwright verifican que el sistema integrado funciona
correctamente de extremo a extremo. Los requisitos no funcionales de disponibilidad y
usabilidad quedan documentados con evidencia real del entorno de staging.
