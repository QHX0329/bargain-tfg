# Phase 5: Optimizer, Scraping, OCR, LLM - Discussion Log

> Editorial note (2026-03-26): esta discusión se inició con un enfoque OCR basado en pytesseract.
> La decisión vigente del proyecto está documentada en ADR-007 y selecciona Google Vision API.

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-03-25
**Phase:** 05-optimizer-scraping
**Mode:** discuss
**Areas analyzed:** Scraping, Optimizer, LLM Assistant, Frontend Integration + OCR

---

## Gray Areas Presented

| Area | Selected? |
|------|-----------|
| Scraping: qué cubrir | ✅ |
| Optimizer: profundidad del algoritmo | ✅ |
| Asistente LLM: guardrails y contexto | ✅ |
| Integración frontend: profundidad | ✅ |

All 4 areas selected.

---

## Assumptions & Decisions

### Scraping

| Question | Options presented | User chose |
|----------|------------------|-----------|
| Qué supermercados cubrir | Mercadona+Carrefour / **Mercadona+Carrefour+Lidl+DIA** / Solo Mercadona | Mercadona, Carrefour, Lidl, DIA |
| Anti-scraping strategy | **Playwright JS-heavy + requests resto** / Solo Playwright / Solo API | Playwright para JS-heavy, requests para el resto |
| Scheduling frecuencia | **Celery Beat diario** / Beat diferenciado / Bajo demanda semanal | Celery Beat diario por spider |

### Optimizer

| Question | Options presented | User chose |
|----------|------------------|-----------|
| Nivel de sofisticación | OR-Tools TSP + pesos / Greedy propio / **OR-Tools + OSRM** | OR-Tools + OSRM para distancias reales |
| Paradas máximas | **3 defecto + hasta 5** / Fijo 3 / 2-4 configurable | 3 paradas (defecto) + configurable hasta 5 |
| OSRM deployment | **OSRM Docker Compose** / Graphhopper Docker / OSRM público | Graphhopper en Docker Compose |

*Note: User initially selected "OR-Tools + OSRM" then chose Graphhopper as the routing engine — both decisions are compatible (OR-Tools solver + Graphhopper for distance matrix).*

### LLM Assistant

| Question | Options presented | User chose |
|----------|------------------|-----------|
| Guardrails scope | **Solo compras/precios/recetas** / Compras+nutrición / General purpose | Solo compras: productos, precios, recetas |
| Historial management | **Historial local por sesión** / Persistido en BD / Stateless | Historial local por sesión, no persistido |

### Frontend Integration + OCR

*User requested a review of this area.*

| Question | Options presented | User chose |
|----------|------------------|-----------|
| Frontend wiring depth | **Las 3 completamente wired** / Asistente+OCR real, Ruta parcial / Solo Asistente real | Las 3 completamente wired |
| OCR missing products | **Fuzzy match + umbral confianza** / Fuzzy + confirmación siempre / Solo texto crudo | Fuzzy match + umbral de confianza |
| OCR umbral (revisión) | **80%** / 70% / 90% | 80% |
| No stores in radius | **Error claro + sugerir ampliar radio** / Fallback mock / Estado vacío | Error claro + sugerencia de ampliar radio |

---

## Corrections Made

### Frontend + OCR (user requested review)
- **Original assumption:** Fuzzy match threshold 80% (recommended)
- **User review:** Confirmed 80%. Also clarified optimizer behavior when no stores found → Error claro with "Ampliar radio" action button.

No other corrections — all other assumptions confirmed on first pass.

---

## Codebase Context Applied

- OR-Tools, thefuzz y anthropic ya estaban en requirements; el OCR queda redirigido a Google Vision API por ADR-007
- OCRProcessingError and AssistantUnavailable already in core/exceptions.py
- SkeletonBox component available for loading states
- All 4 backend apps are empty stubs ready for implementation
- 3 frontend screens fully built with mock data and documented endpoints
