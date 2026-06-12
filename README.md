<!-- generated-by: gsd-doc-writer -->
<div align="center">
  <img src="./docs/assets/logo.png" alt="BarGAIN Logo" width="400">
</div>

---

# **BarGAIN** — Compra inteligente, al mejor precio y en el menor tiempo.

[![CI Backend](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-backend.yml/badge.svg?branch=main)](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-backend.yml)
[![CI Frontend](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-frontend.yml/badge.svg?branch=main)](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-frontend.yml)
[![CD Render Staging](https://github.com/QHX0329/bargain-tfg/actions/workflows/cd-render-staging.yml/badge.svg?branch=main)](https://github.com/QHX0329/bargain-tfg/actions/workflows/cd-render-staging.yml)
[![Deploy GitHub Pages](https://github.com/QHX0329/bargain-tfg/actions/workflows/deploy-web-gh-pages.yml/badge.svg?branch=main)](https://github.com/QHX0329/bargain-tfg/actions/workflows/deploy-web-gh-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Descripción

BarGAIN es una aplicación móvil y web que elimina la ineficiencia en la compra diaria. No solo indica dónde es más barato un producto, sino que calcula la **combinación óptima de supermercados** que ofrece la mejor relación **Precio–Distancia–Tiempo**.

Este proyecto es un **Trabajo Fin de Grado** del Grado en Ingeniería Informática — Ingeniería del Software, Universidad de Sevilla (ETSII).

## 🌐 Demo pública

| Componente | URL | Notas |
|---|---|---|
| Portal Business (PYMEs) | <https://qhx0329.github.io/bargain-tfg/> | Web estática en GitHub Pages |
| API backend (staging) | <https://bargain-free-api.onrender.com/api/v1/health/> | Render free tier: la primera petición tras inactividad tarda 30–60 s (cold start) |
| Dashboard del proyecto | <https://qhx0329.github.io/bargain-tfg/dashboard.html> | Estado de fases y tareas |
| Mockups de UI | <https://qhx0329.github.io/bargain-tfg/docs/diagramas/ui-mockups/index.html> | Diseños previos al desarrollo |

La app de usuario (iOS/web) se ejecuta con Expo en local (`make frontend`) o se instala en iPhone con la IPA del workflow **iOS Build** (vía Sideloadly); instrucciones completas en el capítulo 7 de la memoria.

## 📌 Estado Actual (2026-06-12)

**v1.0 completada** ✅ — Las 7 fases (F1–F7) están cerradas (325 h), el sistema está desplegado en staging y la memoria del TFG está compilada y entregable.

- Backend + PostgreSQL/PostGIS + Redis en Render · Portal PYME en GitHub Pages · IPA iOS por CI.
- Memoria: [`memoriaTFG/Plantilla TfG/proyect-final.pdf`](memoriaTFG/Plantilla%20TfG/proyect-final.pdf) (86 páginas, con bibliografía y apéndices).

## 🎯 El Problema

El consumidor se enfrenta a tres barreras:

1. **Asimetría de información**: los precios varían diariamente entre cadenas y no hay una fuente única centralizada.
2. **Coste de oportunidad (Tiempo)**: comparar manualmente ofertas en distintos folletos consume horas.
3. **Ineficiencia logística**: ir a tres supermercados para ahorrar 5€ puede no ser rentable si la ruta no es eficiente.

## 💡 La Solución

BarGAIN actúa como un **orquestador inteligente de la cesta de la compra** mediante cuatro módulos:

| Módulo                  | Descripción                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Ingesta de Precios**  | Web Scraping + Crowdsourcing + portal de comercios para precios actualizados                   |
| **Optimizador de Ruta** | Resolución semántico-difusa de la lista (trigramas + Gemini + fuzzy) y ordenación de paradas con OR-Tools, ponderando precio, distancia y tiempo |
| **Visión Artificial**   | OCR con Google Cloud Vision para leer listas escritas a mano o tickets anteriores              |
| **Asistente LLM**       | Interfaz en lenguaje natural (Gemini) con guardrails de dominio                                |

## 🏗️ Stack Tecnológico

| Capa          | Tecnología                            |
| ------------- | ------------------------------------- |
| Backend       | Django 5 + Django REST Framework      |
| Base de datos | PostgreSQL 16 + PostGIS               |
| Frontend      | React Native (Expo) + React web companion |
| IA/ML         | Google Gemini API + Google Cloud Vision API (OCR backend) + OR-Tools |
| Rutas         | OpenRouteService (matriz de distancias reales, fallback haversine) |
| Scraping      | Scrapy + Playwright                   |
| Async         | Celery + Redis                        |
| CI/CD         | GitHub Actions (5 workflows)          |
| Infra         | Docker + Docker Compose (dev híbrido) + Render |

## 🧪 Calidad verificada

- **333 tests backend** (162 unitarios + 171 de integración) con cobertura **≥ 80 % bloqueante en CI** (`--cov-fail-under=80`).
- **111 tests frontend** (Jest + React Native Testing Library, 15 suites).
- **4 flujos E2E** con Playwright (auth, optimizador, OCR, portal business) contra backend real.
- UAT manual en iPhone para los flujos nativos (GPS, cámara).

## ⚙️ CI/CD

| Workflow | Función |
|---|---|
| `ci-backend.yml` | Ruff (lint + format) y pytest con cobertura bloqueante en cada push |
| `ci-frontend.yml` | ESLint, Prettier y Jest en cada push |
| `cd-render-staging.yml` | Despliegue a Render en push a `main` con cambios en `backend/**` (secrets `RENDER_*`) |
| `deploy-web-gh-pages.yml` | Build de Vite y publicación del portal en GitHub Pages |
| `ios-build.yml` | IPA sin firmar (`BarGAIN-unsigned`) en runner macOS, instalable con Sideloadly |

El flujo de CD valida los secretos, despliega web/worker/beat vía API de Render, espera el estado `live` y ejecuta un smoke test contra el endpoint de salud.

## 🗺️ Roadmap (cerrado)

| Fase | Estado | Notas |
|------|--------|-------|
| F1 — Análisis y Diseño | ✅ | Requisitos, comparativa y base documental del TFG |
| F2 — Infraestructura | ✅ | Backend en Docker, frontend nativo en host (ADR-002) |
| F3 — Core Backend | ✅ | Módulos de dominio + API + tests + docs OpenAPI |
| F4 — Frontend | ✅ | Autenticación, listas, catálogo, mapa, notificaciones y perfil |
| F5 — IA/Optimización/Scraping | ✅ | Optimizador con capa semántica, OCR Vision, asistente Gemini, 11 spiders (4 programados) |
| F6 — Portal Business | ✅ | Onboarding PYME, aprobación admin, precios y promociones |
| F7 — Pruebas, Deploy y Cierre | ✅ | E2E, staging en Render, adaptación web de escritorio y memoria final |

## 🚀 Inicio Rápido

### Requisitos previos

- Docker y Docker Compose
- Node.js >= 24.10.0 y npm (frontend nativo en host)

Notas importantes:
- El entorno oficial de desarrollo es híbrido (ADR-002): backend en Docker y frontend nativo en host (Docker rompe el HMR de Metro/Expo en Windows).
- Los comandos de Django (migrate, seed, createsuperuser) se ejecutan dentro del contenedor backend a través de los targets del Makefile.

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/QHX0329/bargain-tfg.git
cd bargain-tfg

# Copiar variables de entorno (rellenar antes de continuar)
cp .env.example .env

# Levantar servicios con Docker
make dev

# Aplicar migraciones (en el contenedor backend)
make migrate

# Crear superusuario (en el contenedor backend)
make createsuperuser

# Poblar con datos base (en el contenedor backend)
make seed

# Datos demo completos (catálogo + 50 tiendas de Sevilla + ~55.000 precios)
docker compose -f docker-compose.dev.yml exec backend python manage.py seed_demo
docker compose -f docker-compose.dev.yml exec backend python manage.py seed_sevilla
```

### Desarrollo frontend

```bash
make frontend-install   # npm install
make frontend           # App de usuario (Expo web en :8081)
make frontend-web       # Portal Business (Vite en :5173)
```

## 🧭 Comandos útiles

```bash
# Backend (Docker)
make lint-backend       # Ruff check + format
make test-backend       # pytest -v
make test-backend-cov   # pytest con cobertura HTML

# Frontend (host)
make test-frontend      # Jest
make lint-frontend      # ESLint + Prettier

# Conjunto completo
make test
make lint

# OpenAPI
make docs
```

## 📁 Estructura del Proyecto

```
bargain-tfg/
├── backend/         # API Django + lógica de negocio (apps por dominio)
├── frontend/        # App React Native/Expo + portal business (frontend/web, Vite)
├── scraping/        # Spiders de Scrapy (paquete bargain_scraping, 11 cadenas)
├── docs/            # Documentación, ADRs, diagramas y fuentes de la memoria
├── memoriaTFG/      # Memoria LaTeX compilada (proyect-final.pdf)
├── scripts/         # Automatización (capturas, compilación, despliegue)
├── .github/         # 5 workflows de CI/CD y plantillas
├── render.yaml      # Blueprint Render (servicios separados)
└── render.free.yaml # Blueprint free tier usado en staging
```

## 📚 Documentación

- Memoria del TFG (PDF): [`memoriaTFG/Plantilla TfG/proyect-final.pdf`](memoriaTFG/Plantilla%20TfG/proyect-final.pdf)
- Fuentes de la memoria por capítulos: `docs/memoria/`
- Decisiones de arquitectura (ADR-001..011): `docs/decisiones/`
- API REST: `docs/api/README.md` (OpenAPI en `/api/v1/schema/` con Swagger UI y ReDoc)
- Estado de tareas: `TASKS.md` · Instrucciones operativas: `CLAUDE.md`
- Planificación viva (método GSD): `.planning/` · Contexto del proyecto: `memory/`

## 🤝 Diferenciación del Mercado

| Funcionalidad               | Soysuper/OCU | Tiendeo | Apps Super | **BarGAIN** |
| --------------------------- | :----------: | :-----: | :--------: | :---------: |
| Comparación de Precios      |      ✅      |   ⚠️    |     ❌     |     ✅      |
| Cálculo de Ruta Óptima      |      ❌      |   ❌    |     ❌     |     ✅      |
| Cruce Precio vs. Distancia  |      ❌      |   ❌    |     ❌     |     ✅      |
| OCR de Lista/Ticket         |      ❌      |   ❌    |     ⚠️     |     ✅      |
| Portal PYMES locales        |      ❌      |   ❌    |     ❌     |     ✅      |
| Asistente LLM               |      ❌      |   ❌    |     ⚠️     |     ✅      |
| Desambiguación semántica con recálculo |  ❌  |   ❌    |     ❌     |     ✅      |

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👤 Autor

- **Nicolás Parrilla Geniz** — Estudiante de Ingeniería Informática, Universidad de Sevilla
- Tutor: **Juan Vicente Gutiérrez Santacreu**

---

_Proyecto desarrollado como Trabajo Fin de Grado — Escuela Técnica Superior de Ingeniería Informática, Universidad de Sevilla, 2025-2026._
