---
status: testing
phase: 05-optimizer-scraping
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
  - 05-03-SUMMARY.md
  - 05-04-SUMMARY.md
  - 05-05-SUMMARY.md
started: 2026-03-26T10:03:00+01:00
updated: 2026-03-26T21:30:00+01:00
---

## Current Test

number: 7
name: Frontend: AssistantScreen con API real
expected: |
  Desde la pantalla del asistente en la app, escribes un mensaje y recibes respuesta real del backend. Se muestra indicador de escritura mientras carga. La conversación mantiene contexto entre mensajes. No hay banner de modo dev ni datos mock.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Con todos los servicios detenidos, arrancas el entorno desde cero (`make dev`). Backend, PostgreSQL, Redis y Graphhopper levantan sin errores. Las migraciones se aplican correctamente. Puedes autenticarte y al menos una consulta básica (health check o listado) responde con datos reales.
result: pass

### 2. Scraping: Spider ejecuta y persiste precios
expected: Al ejecutar `run_spider('mercadona')` (o cualquier spider soportado) desde una tarea Celery o manualmente, el spider se ejecuta sin errores fatales y se registran o actualizan precios reales en la base de datos. El proceso termina limpiamente sin FileNotFoundError ni fallos silenciosos.
result: pass
fix: Sustituido multiprocessing.Process por subprocess.Popen (runner.py). 3987 precios persistidos. Commit b5a1f15.

### 3. OCR: Endpoint procesa imagen
expected: Al enviar una imagen de ticket o lista de compra a `POST /api/v1/ocr/scan/` (autenticado), el endpoint devuelve líneas de texto detectadas con campo `raw_text`, `confidence`, `quantity`, y opcionalmente `matched_product_id`/`matched_product_name` si hay coincidencia fuzzy. Una imagen sin texto devuelve error 422. Una petición sin autenticación devuelve 401.
result: pass
fix: Migración a Google Cloud Vision API (ADR-007). Sustituye pytesseract por DOCUMENT_TEXT_DETECTION. Commits bb1c8cb + migración externa Google Vision.

### 4. Asistente: Responde consulta de compras
expected: Al enviar un mensaje relacionado con compras a `POST /api/v1/assistant/chat/` (autenticado, con historial de mensajes), el endpoint devuelve una respuesta coherente en español sobre el tema de compras. La respuesta viene del backend real (Claude API), no de datos mock.
result: pass
fix: Migración de Anthropic Claude a Google Gemini API (ADR-008). SDK google-genai, modelo gemini-2.0-flash-lite, generate_content con historial completo.

### 5. Asistente: Rechaza temas fuera de dominio
expected: Al enviar un mensaje fuera del dominio de compras (ej: "Explícame la teoría de la relatividad") al endpoint del asistente, la respuesta es un rechazo educado en español indicando que solo ayuda con temas de compra. No inventa ni responde al tema fuera de dominio.
result: pass

### 6. Optimizador: Genera ruta optimizada
expected: Al enviar `POST /api/v1/optimize/` con una lista de compra válida, ubicación del usuario, pesos y max_stops, el endpoint devuelve una ruta optimizada con paradas, distancias, tiempos y precios. Si no hay tiendas en el radio, devuelve error específico `OPTIMIZER_NO_STORES_IN_RADIUS` (no crash genérico).
result: pass

### 7. Frontend: AssistantScreen con API real
expected: Desde la pantalla del asistente en la app, escribes un mensaje y recibes respuesta real del backend. Se muestra indicador de escritura mientras carga. La conversación mantiene contexto entre mensajes. No hay banner de modo dev ni datos mock.
result: [pending]

### 8. Frontend: OCRScreen captura y procesa imagen
expected: Desde la pantalla OCR en la app, seleccionas una imagen (cámara o galería) y el sistema la envía al backend, mostrando las líneas detectadas con badges de confianza, steppers de cantidad y checkboxes. Si la imagen no tiene texto, muestra error apropiado.
result: [pending]

### 9. Frontend: RouteScreen calcula ruta
expected: Desde RouteScreen, con una lista de compra seleccionada y ubicación obtenida, ajustas los sliders de peso y max_stops, y el sistema calcula la ruta usando el backend real. Se muestra loading skeleton mientras calcula. El resultado muestra paradas con productos y estimaciones de distancia/tiempo/precio.
result: [pending]

## Summary

total: 9
passed: 6
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

[none yet]
