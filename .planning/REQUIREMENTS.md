# Requirements: BargAIn

**Defined:** 2026-03-16
**Core Value:** El usuario obtiene la ruta óptima de compra entre varios supermercados que minimiza precio + desplazamiento, ahorrando >5% respecto a un solo establecimiento.

---

## v1 Requirements

### Authentication & Users

- [x] **AUTH-01**: Usuario puede registrarse con email y contraseña (RF-001)
- [x] **AUTH-02**: Usuario puede iniciar sesión y recibe par JWT access+refresh (RF-002)
- [x] **AUTH-03**: Usuario puede recuperar contraseña por email (RF-005)
- [x] **AUTH-04**: Usuario puede consultar y modificar su perfil (RF-003)
- [x] **AUTH-05**: Usuario puede configurar preferencias de optimización (pesos, radio, paradas) (RF-004)

### Products

- [x] **PROD-01**: Usuario puede buscar productos por nombre, categoría, marca o código de barras (RF-006)
- [x] **PROD-02**: Usuario puede ver detalle de producto con rango de precios cercano (RF-007)
- [x] **PROD-03**: Sistema ofrece autocompletado con matching fuzzy en búsqueda (RF-008)
- [x] **PROD-04**: Productos organizados en jerarquía de categorías navegable (RF-009)
- [x] **PROD-05**: Usuario puede proponer nuevo producto al catálogo (crowdsourcing, sujeto a validación) (RF-010)

### Stores & Geolocation

- [x] **STORE-01**: Sistema lista tiendas en radio configurable ordenadas por distancia (RF-011)
- [x] **STORE-02**: Usuario puede ver detalle de tienda con precios de su lista activa (RF-012)
- [x] **STORE-03**: Tiendas mostradas en mapa interactivo diferenciando cadenas y comercios locales (RF-013)
- [x] **STORE-04**: Usuario puede marcar tiendas como favoritas (RF-014)

### Prices

- [x] **PRICE-01**: Sistema muestra comparación de precios de un producto en tiendas del radio (RF-015)
- [x] **PRICE-02**: Sistema calcula coste total de la lista en cada tienda individual (RF-016)
- [x] **PRICE-03**: Usuario puede consultar histórico de precios de un producto en gráfico temporal (RF-017)
- [x] **PRICE-04**: Usuario puede definir alerta de precio objetivo; sistema notifica cuando se alcanza (RF-018)
- [x] **PRICE-05**: Usuario puede reportar precio de un producto en una tienda (crowdsourcing, caduca 24h) (RF-019)

### Shopping Lists

- [x] **LIST-01**: Usuario puede crear, consultar, editar, archivar y eliminar listas (máx. 20 activas) (RF-020)
- [x] **LIST-02**: Usuario puede añadir/modificar/eliminar ítems con buscador y autocompletado (RF-021)
- [x] **LIST-03**: Usuario puede compartir lista con otro usuario registrado para edición conjunta (RF-022)
- [x] **LIST-04**: Usuario puede guardar lista como plantilla y crear nuevas desde plantillas (RF-023)

### Route Optimizer

- [ ] **OPT-01**: Sistema calcula combinación óptima de tiendas (máx. paradas conf.) con función Score multicriterio, devuelve top-3 rutas (RF-024)
- [ ] **OPT-02**: Ruta optimizada visualizada en mapa con polylines, paradas y productos por parada (RF-025)
- [ ] **OPT-03**: Sistema muestra desglose de ahorro: total €, distancia, tiempo, diferencia vs. compra única (RF-026)
- [ ] **OPT-04**: Usuario puede recalcular ruta descartando tienda o cambiando pesos (<5s) (RF-027)

### OCR / Computer Vision

- [ ] **OCR-01**: Usuario puede capturar foto de lista manuscrita o ticket y obtener texto extraído (RF-028)
- [ ] **OCR-02**: Sistema aplica matching fuzzy del OCR contra catálogo; usuario confirma/corrige antes de añadir a lista (RF-029)

### LLM Assistant

- [ ] **LLM-01**: Usuario puede consultar en lenguaje natural sobre su compra y recibir respuesta con datos reales (RF-030)
- [ ] **LLM-02**: Asistente propone estrategias de ahorro basadas en historial y tendencias (RF-031)

### Business Portal (PYMEs)

- [ ] **BIZ-01**: Comercio puede registrar perfil de negocio (datos fiscales, vinculación tienda), sujeto a verificación admin (RF-032)
- [ ] **BIZ-02**: Comercio puede actualizar precios manualmente sin caducidad automática (RF-033)
- [ ] **BIZ-03**: Comercio puede crear/editar/desactivar promociones con fechas y descuentos (RF-034)

### Notifications

- [ ] **NOTIF-01**: Sistema envía notificaciones push y/o email según preferencias del usuario para: alertas precio, nuevas promos en favoritas, cambios en listas compartidas, resultados OCR (RF-035)

### Scraping

- [ ] **SCRAP-01**: Sistema ejecuta spiders automatizados (Mercadona, Carrefour, Lidl, DIA) cada 24h con pipeline de normalización (RN-009, RN-010)

### Non-Functional

- [ ] **NFR-01**: API responde en <500ms p95 para CRUD estándar; optimizador <5s (RNF-001)
- [ ] **NFR-02**: Cobertura de tests backend ≥80% (RNF-006)
- [ ] **NFR-03**: App móvil funciona en iOS 15+ y Android 10+ (RNF-007)
- [ ] **NFR-04**: RGPD: consentimiento ubicación, derecho al olvido, minimización de datos (RNF-008)
- [ ] **NFR-05**: Rate limiting: 100 req/h anónimo, 1000 req/h autenticado (RNF-003)

---

## v2 Requirements

### Deferred

- **v2-01**: Compartir lista por enlace público (sin registro requerido)
- **v2-02**: Dashboard de estadísticas para admin (métricas agregadas de uso)
- **v2-03**: Integración Google Places API para datos de tiendas (alternativa: datos manuales)
- **v2-04**: App Expo EAS build para distribución real en stores (durante TFG solo Expo Go)
- **v2-05**: Cadenas adicionales de scraping (Alcampo, Aldi, etc.)
- **v2-06**: Soporte offline (caché local de últimos precios consultados)
- **v2-07**: Tests de carga / stress (Locust) más allá de la cobertura mínima del TFG

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Chat en tiempo real entre usuarios | Alta complejidad, no aporta al valor core |
| Pagos in-app o suscripciones de pago | Fuera del alcance del prototipo académico |
| Mercados fuera de España | Limitado por el alcance del TFG |
| App nativa pura (sin Expo) | Overhead sin beneficio en prototipo académico |
| Vídeo en posts | Coste almacenamiento, irrelevante para el dominio |
| Cadenas que prohíben scraping en robots.txt | RN-009 — respetar política de scraping |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 – AUTH-05 | Phase 1: Core Backend | Pending |
| PROD-01 – PROD-05 | Phase 1: Core Backend | Pending |
| STORE-01 – STORE-04 | Phase 1: Core Backend | Pending |
| PRICE-01 – PRICE-05 | Phase 1: Core Backend | Pending |
| LIST-01 – LIST-04 | Phase 1: Core Backend | Pending |
| BIZ-01 – BIZ-03 | Phase 2: Business & Notifications | Pending |
| NOTIF-01 | Phase 2: Business & Notifications | Pending |
| NFR-03 | Phase 3: Frontend | Pending |
| OPT-01 – OPT-04 | Phase 4: Optimizer & Scraping | Pending |
| SCRAP-01 | Phase 4: Optimizer & Scraping | Pending |
| NFR-01 | Phase 4: Optimizer & Scraping | Pending |
| OCR-01 – OCR-02 | Phase 5: Advanced AI | Pending |
| LLM-01 – LLM-02 | Phase 5: Advanced AI | Pending |
| NFR-02 | Phase 6: Testing, Deploy & Thesis | Pending |
| NFR-04 | Phase 6: Testing, Deploy & Thesis | Pending |
| NFR-05 | Phase 6: Testing, Deploy & Thesis | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 — traceability updated to match ROADMAP.md phase structure (6 phases, F3-F6 scope)*
