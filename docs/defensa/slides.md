---
marp: true
theme: default
paginate: true
header: 'BarGAIN — TFG ETSII-US'
footer: 'Nicolás Parrilla Geniz'
style: |
  section {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 28px;
  }
  section.lead {
    text-align: center;
  }
  h1 { color: #2c3e50; }
  h2 { color: #27ae60; }
  table { font-size: 0.8em; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
---

<!-- _class: lead -->

# BarGAIN
## Sistema de Optimización de Cesta de la Compra

**Nicolás Parrilla Geniz**
Tutor: Juan Vicente Gutiérrez Santacreu
Dpto. Matemática Aplicada I — ETSII, Universidad de Sevilla

Junio 2026

---

## Motivación

> El precio de los alimentos subió **+15%** en España (2022–2024, INE)

**El problema del consumidor:**
- 5 supermercados a 2 km — ¿cuál es la mejor combinación para mi lista?
- Comparar precios manualmente es tedioso e ineficiente

**La oportunidad:**
- Las PYMEs locales no pueden competir en visibilidad digital con las grandes cadenas
- BarGAIN equilibra el campo: **ahorro para consumidores + visibilidad para PYMEs**

---

## Definición del Problema y Objetivos

$$Score(A) = w_1 \cdot ahorro_{norm} - w_2 \cdot dist_{extra} - w_3 \cdot tiempo_{extra}$$

Los pesos $w_i$ los configura el usuario (suman 1.0).

**Objetivos del TFG:**

| ID | Objetivo |
|----|---------|
| OBJ-01 | Algoritmo de optimización multicriterio (VRP) |
| OBJ-02 | Web scraping automatizado de precios |
| OBJ-03 | Procesamiento de tickets con OCR |
| OBJ-04 | Portal PYME con gestión de precios y aprobación |
| OBJ-05 | App móvil con asistente LLM de compra |

---

## Arquitectura del Sistema

```
┌──────────────┐    ┌─────────────────────────────────────┐
│  App Móvil   │    │          Backend Django              │
│ React Native │───▶│  DRF API │ Celery Workers │ PostGIS  │
│  Expo/iOS    │    │──────────┼───────────────┼──────────│
└──────────────┘    │   Redis  │  PostgreSQL   │  Nginx   │
┌──────────────┐    └──────────┴───────────────┴──────────┘
│  Web Portal  │───▶
│  Vite+React  │    ┌─────────────────────────────────────┐
└──────────────┘    │        Servicios externos            │
                    │  ORS API │ Vision API │ Gemini LLM  │
                    └─────────────────────────────────────┘
```

Desplegado en **Render.com** (staging) con 5 servicios declarados en `render.yaml`

---

## El Algoritmo de Optimización

**Pipeline en 6 fases** (`apps/optimizer/services.py`):

1. **Resolución textual** — trigramas + fuzzy matching contra catálogo
2. **Ingesta de precios** — consulta geoespacial con PostGIS/GiST
3. **Pre-filtrado** — máx. 30 tiendas candidatas → C(30,3) = 4.060 combinaciones
4. **Evaluación greedy** — asignación óptima por combinación de tiendas
5. **Distancias ORS** — matriz real de conducción en una petición
6. **Scoring & ranking** — normalización + top-3 por score descendente

**OR-Tools** resuelve el problema de asignación como ILP para combinaciones complejas.

---

## Web Scraping y OCR

**Scraping:**
- Proyecto **Scrapy** independiente desacoplado del backend
- 4 spiders: Mercadona (API interna), Carrefour/Lidl/DIA (Playwright SPA)
- Celery Beat: ejecución cada 6h, 2s delay entre peticiones (RN-010)

**OCR:**
- Foto ticket → **Google Cloud Vision API** → texto plano
- Fuzzy matching (trigramas, umbral 80%) → productos del catálogo
- Usuario confirma o corrige → añade ítems a la lista

---

## Portal Business y Asistente LLM

**Portal Business (PYMEs):**
- Registro → estado `pending` → admin aprueba/rechaza
- Gestión de precios y promociones con restricción de unicidad activa
- Alerta automática de competidor (Celery Beat cada 6h)
- Notificaciones push + email via Expo Push Notifications

**Asistente LLM:**
- **Gemini 2.0 Flash Lite** via SDK `google-genai` (ADR-008)
- System prompt con guardrails de dominio (solo consultas de compra)
- Ventana deslizante: últimos 20 mensajes + contexto de lista activa

---

## Demo

**[VÍDEO GRABADO — 3-4 min]**

Flujo demostrado:
1. Login → Lista de la compra
2. Capturar ticket con OCR (Google Vision)
3. Optimizar ruta → ver top-3 en mapa
4. Asistente con guardrail de dominio
5. Portal Business — actualizar precio PYME

---

## Tests y Resultados

| Tipo de test | Cantidad | Resultado |
|-------------|----------|-----------|
| Unitarios backend | ~40 | ✅ Todos pasados |
| Integración backend | ~17 archivos | ✅ Todos pasados |
| ORS (unitarios) | 3 | ✅ Todos pasados |
| E2E Playwright | 4 flujos | ✅ Todos pasados |
| UAT manual (iPhone) | 5 flujos | ✅ Verificados |

**Cobertura backend:** >80% sobre `apps/`

**NFR verificados:** Disponibilidad (health check Render), Usabilidad (≤3 taps), Escalabilidad (arquitectural)

---

## Conclusiones

✅ **Completado:**
- Algoritmo OPT multicriterio con ORS + OR-Tools en staging
- 4 spiders de scraping con normalización de precios
- OCR con Google Vision + fuzzy matching
- Portal PYME con aprobación admin + alertas competidor
- App móvil iOS (+ web de escritorio) con persistencia de rutas
- Asistente Gemini con guardrails de dominio
- E2E tests automatizados (Playwright)

🔮 **Trabajo futuro:** distribución App Store, soporte Android, más cadenas, precios en tiempo real, reseñas de productos

---

<!-- _class: lead -->

# ¿Preguntas?

**GitHub:** `github.com/QHX0329/bargain-tfg`

Stack: Python 3.12 · Django 5 · React Native · Expo · PostgreSQL+PostGIS · Celery · Docker

---

## Notas del presentador (no mostrar)

Para generar el PDF/HTML con Marp:

```bash
# Instalar Marp CLI (una vez)
npm install -g @marp-team/marp-cli

# Generar PDF
npx @marp-team/marp-cli slides.md --pdf --output bargain-defensa.pdf

# Generar HTML (para presentar sin herramientas adicionales)
npx @marp-team/marp-cli slides.md --html --output bargain-defensa.html
```
