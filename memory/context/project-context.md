# Contexto del Proyecto BargAIn

## Entorno académico
| Campo | Valor |
|-------|-------|
| Tipo | TFG — Trabajo Fin de Grado |
| Grado | Ingeniería Informática, Ingeniería del Software |
| Universidad | Universidad de Sevilla (ETSII-US) |
| Autor | Nicolás Parrilla Geniz |
| Tutor | Juan Vicente Gutiérrez Santacreu (Matemática Aplicada I) |
| Curso | 2025-2026 |

## Herramientas y tecnologías
| Herramienta | Uso | Alias interno |
|------------|-----|--------------|
| Django 5.x | Backend framework | — |
| Django REST Framework | API REST | DRF |
| PostgreSQL 16 + PostGIS 3.4 | Base de datos + geoespacial | — |
| Celery + Redis | Tareas asíncronas | — |
| Scrapy + Playwright | Web scraping precios | el scraping |
| React Native + Expo | App móvil | — |
| React | Web companion | — |
| Zustand | Estado global frontend | — |
| OR-Tools | Optimización de rutas | — |
| Claude API (Anthropic) | Asistente LLM | el asistente |
| Tesseract.js | OCR tickets y listas | el OCR |
| Docker + Docker Compose | Contenedores | — |
| GitHub Actions | CI/CD | — |
| Render | Hosting staging | staging |
| Ruff | Linter Python | — |
| pytest + pytest-django | Testing backend | — |
| Jest + RNTL | Testing frontend | — |
| Structlog | Logging estructurado | — |
| Sentry | Monitorización errores | — |
| Prometheus + Grafana | Métricas | — |

## Estructura de ramas Git
| Rama | Propósito |
|------|-----------|
| main | Producción |
| develop | Integración (target de PRs) |
| feature/* | Nuevas funcionalidades |
| fix/* | Corrección de bugs |
| docs/* | Documentación |

## Formato API REST
Todas las respuestas siguen el formato:
```json
{
  "success": true/false,
  "data": {},         // en éxito
  "error": {          // en fallo
    "code": "ERROR_CODE",
    "message": "...",
    "details": {}
  }
}
```

## Excepciones personalizadas
Ubicadas en: `backend/apps/core/exceptions.py`

## Estándares de código
- Python: PEP 8, máx 99 chars/línea, Ruff, Google docstrings, type hints obligatorios
- JS/TS: ESLint + Prettier (printWidth: 100, singleQuote: true)
- Tests: cobertura ≥ 80%, pytest para backend, Jest para frontend

## Supermercados objetivo
Mercadona, Carrefour, Lidl, DIA, Alcampo (spiders Scrapy implementados)
