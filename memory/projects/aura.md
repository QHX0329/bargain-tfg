# Proyecto BargAIn

**Nombre completo:** BargAIn
**Tipo:** Trabajo Fin de Grado (TFG) — Grado en Ingeniería Informática, Ingeniería del Software
**Estado:** Activo (en desarrollo)
**Fecha:** Curso 2025-2026

## Descripción
Aplicación web/móvil de compra inteligente que optimiza la cesta de la compra del usuario cruzando precio, distancia y tiempo entre múltiples supermercados y comercios locales. El core del sistema es un algoritmo multicriterio PDT (Precio-Distancia-Tiempo).

## Repositorio
- **Rama principal:** main (producción)
- **Rama activa:** develop (integración)
- **Directorio raíz:** bargain-tfg/

## Stack tecnológico

### Backend
- Django 5.x + Python 3.12+
- PostgreSQL 16 + PostGIS 3.4
- Django REST Framework (DRF) con JWT
- Celery + Redis (tareas asíncronas)
- Scrapy + Playwright (web scraping)
- Structlog (logging), Sentry (errores)

### Frontend
- React Native con Expo (móvil)
- React (web companion)
- Zustand (estado global)
- Axios con interceptores JWT
- React Native Maps + Google Maps API

### IA / ML
- Claude API (Anthropic) — asistente LLM vía backend proxy
- Tesseract.js + modelo fine-tuned — OCR tickets
- OR-Tools (Google) — optimización de rutas

### Infraestructura
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Render (staging) / AWS (producción futura)
- Prometheus + Grafana (métricas)

## Estructura de módulos backend (apps/)
- **users** — Autenticación, perfiles, roles
- **products** — Catálogo normalizado (EAN-13, categorías, marcas)
- **stores** — Tiendas con geolocalización PostGIS
- **prices** — Precios actuales e histórico, caducidades
- **scraping** — Spiders: Mercadona, Carrefour, Lidl, DIA, Alcampo
- **shopping_lists** — Listas de la compra del usuario
- **optimizer** — Algoritmo PDT, generación de rutas
- **ocr** — Procesamiento de fotos/tickets
- **assistant** — Integración Claude API
- **business** — Portal PYMEs, suscripciones
- **notifications** — Push + email
- **core** — Excepciones personalizadas, utilidades

## Algoritmo de optimización (core del TFG)
```
Score = w_precio * (ahorro_normalizado)
      - w_distancia * (distancia_extra_normalizada)
      - w_tiempo * (tiempo_extra_normalizado)
```
**Pasos:** Ingesta precios → Generación candidatos → Evaluación geoespacial → Scoring → Ranking top-3 → Presentación en mapa

## Reglas de negocio clave
1. Radio máximo por defecto: 10 km (configurable)
2. Máximo 4 paradas por ruta (defecto 3)
3. Caducidad precios: 48h scraping / 24h crowdsourcing
4. Jerarquía fuentes: API oficial > Scraping > Crowdsourcing
5. El asistente LLM solo responde consultas de compra

## Documentación TFG (docs/memoria/)
| Capítulo | Archivo |
|----------|---------|
| 1. Introducción | 01-introduccion.md |
| 2. Objetivos | 02-objetivos.md |
| 3. Antecedentes | 03-antecedentes.md |
| 4. Comparativa | 04-comparativa.md |
| 5. Herramientas | 05-herramientas.md |
| 6. Planificación | 06-planificacion.md |
| 7. Requisitos | 07-requisitos.md |
| 8. Diseño e implementación | 08-diseno-implementacion.md |
| 9. Manual de usuario | 09-manual-usuario.md |
| 10. Pruebas | 10-pruebas.md |
| 11. Conclusiones | 11-conclusiones.md |
| 12. Bibliografía | 12-bibliografia.md |

## Indicadores de éxito
| Indicador | Meta |
|-----------|------|
| Cobertura tests backend | ≥ 80% |
| Tiempo respuesta API (p95) | < 500ms |
| Precisión OCR listas manuscritas | ≥ 75% |
| Ahorro medio por ruta optimizada | > 5% vs un solo supermercado |
| Satisfacción usuarios pruebas | ≥ 4/5 |
| Disponibilidad staging | ≥ 99% |
