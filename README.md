<div align="center">
  <img src="./docs/assets/logo.png" alt="BarGAIN Logo" width="400">
</div>

---

# **BarGAIN** — Compra inteligente, al mejor precio y en el menor tiempo.

[![CI Backend](https://img.shields.io/badge/CI-Backend-blue)](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-backend.yml)
[![CI Frontend](https://img.shields.io/badge/CI-Frontend-green)](https://github.com/QHX0329/bargain-tfg/actions/workflows/ci-frontend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Descripción

BarGAIN es una aplicación móvil y web que elimina la ineficiencia en la compra diaria. No solo indica dónde es más barato un producto, sino que calcula la **combinación óptima de supermercados** que ofrece la mejor relación **Precio–Distancia–Tiempo**.

Este proyecto es un **Trabajo Fin de Grado** del Grado en Ingeniería Informática — Ingeniería del Software, Universidad de Sevilla (ETSII).

## 📌 Estado Actual (2026-03-19)

- F1 (Análisis y Diseño): completada.
- F2 (Infraestructura Base): completada.
- F3 (Core Backend): completada.
- F4 (Frontend): en progreso con tareas hasta F4-27 completadas.
- F5 y F6: pendientes.
- Progreso global aproximado: 62%.

[![Ver Dashboard](https://img.shields.io/badge/Ver_Dashboard_Interactivo-2EA043?style=for-the-badge&logo=github)](https://qhx0329.github.io/bargain-tfg/dashboard.html)

[![Ver MockUps](https://img.shields.io/badge/Ver_MockUps-2EA043?style=for-the-badge&logo=github)](https://qhx0329.github.io/bargain-tfg/docs/diagramas/ui-mockups/index.html)

## 🎯 El Problema

El consumidor se enfrenta a tres barreras:

1. **Asimetría de información**: los precios varían diariamente entre cadenas y no hay una fuente única centralizada.
2. **Coste de oportunidad (Tiempo)**: comparar manualmente ofertas en distintos folletos consume horas.
3. **Ineficiencia logística**: ir a tres supermercados para ahorrar 5€ puede no ser rentable si la ruta no es eficiente.

## 💡 La Solución

BarGAIN actúa como un **orquestador inteligente de la cesta de la compra** mediante cuatro módulos:

| Módulo                  | Descripción                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Ingesta de Precios**  | Web Scraping + Crowdsourcing para precios actualizados de grandes superficies y comercio local |
| **Optimizador de Ruta** | Algoritmo IA que pondera precio, distancia y tiempo para calcular la ruta ideal                |
| **Visión Artificial**   | OCR avanzado para leer listas escritas a mano o tickets anteriores                             |
| **Asistente LLM**       | Interfaz en lenguaje natural para consultas complejas de compra                                |

## 🏗️ Stack Tecnológico

| Capa          | Tecnología                            |
| ------------- | ------------------------------------- |
| Backend       | Django 5 + Django REST Framework      |
| Base de datos | PostgreSQL 16 + PostGIS               |
| Frontend      | React Native (Expo) + React web companion |
| IA/ML         | Claude API + Google Cloud Vision API (OCR backend) + OR-Tools |
| Scraping      | Scrapy + Playwright                   |
| Async         | Celery + Redis                        |
| CI/CD         | GitHub Actions                        |
| Infra         | Docker + Docker Compose (dev híbrido) + Render |

Nota sobre OCR:
- La decisión de diseño vigente adopta Google Cloud Vision API como proveedor OCR backend.
- El repositorio aún conserva implementación legado basada en Tesseract mientras se completa la migración técnica en F5.

## 🗺️ Roadmap Resumido

| Fase | Estado | Notas |
|------|--------|-------|
| F1 — Análisis y Diseño | ✅ | Requisitos, comparativa y base documental del TFG |
| F2 — Infraestructura | ✅ | Backend en Docker, frontend nativo en host (ADR-002) |
| F3 — Core Backend | ✅ | Módulos de dominio + API + tests + docs OpenAPI |
| F4 — Frontend | 🔄 | UX y flujos principales operativos, quedan integraciones avanzadas |
| F5 — IA/Optimización/Scraping | ⬜ | Migración OCR a Google Vision, optimizer multicriterio y scraping productivo |
| F6 — Cierre | ⬜ | E2E, deploy staging final, memoria y defensa |

## 🚀 Inicio Rápido

### Requisitos previos

- Docker y Docker Compose
- Node.js >=24.10.0 y npm (frontend nativo en host)

Notas importantes:
- El entorno oficial de desarrollo es híbrido: backend en Docker y frontend nativo en host.
- Los comandos de Django (migrate, seed, createsuperuser) deben ejecutarse dentro del contenedor backend.
- Ejecutar Django en local puede funcionar contra PostgreSQL en Docker, pero no es la ruta recomendada
  porque rompe la paridad del entorno y puede introducir diferencias de dependencias (GIS/liberías nativas).

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/QHX0329/bargain-tfg.git
cd bargain-tfg

# Copiar variables de entorno
cp .env.example .env

# Levantar servicios con Docker
make dev

# O manualmente:
docker compose -f docker-compose.dev.yml up -d

# Aplicar migraciones (en el contenedor backend)
make migrate-docker

# Crear superusuario (en el contenedor backend)
make createsuperuser-docker

# Poblar con datos de prueba (en el contenedor backend)
make seed-docker
```

### Desarrollo frontend

```bash
make frontend-install
make frontend
```

## 🧭 Comandos útiles

```bash
# Backend (Docker)
make lint-backend
make test-backend
make test-backend-cov

# Frontend (host)
make test-frontend
cd frontend && npx eslint src/

# Full checks
make test
make lint
```

## 📁 Estructura del Proyecto

```
bargain-tfg/
├── backend/        # API Django + lógica de negocio
├── frontend/       # App React Native + companion web
├── scraping/       # Spiders de Scrapy (paquete bargain_scraping)
├── docs/           # Documentación y Memoria del TFG
├── .github/        # CI/CD y templates
└── docker-compose.yml
```

## 🧪 Tests

```bash
# Backend
make test-backend

# Frontend
make test-frontend

# Todo
make test
```

## 📚 Documentación

- Estado de tareas: `TASKS.md`
- Instrucciones operativas del proyecto: `CLAUDE.md`
- Memoria del TFG: `docs/memoria/`
- API REST: `docs/api/README.md`
- ADRs: `docs/decisiones/`
- Planificación operativa: `.planning/`
- Memoria de contexto del proyecto: `memory/`

## 🤝 Diferenciación del Mercado

| Funcionalidad               | Soysuper/OCU | Tiendeo | Apps Super | **BarGAIN** |
| --------------------------- | :----------: | :-----: | :--------: | :---------: |
| Comparación de Precios      |      ✅      |   ⚠️    |     ❌     |     ✅      |
| Cálculo de Ruta Óptima      |      ❌      |   ❌    |     ❌     |     ✅      |
| Cruce Precio vs. Distancia  |      ❌      |   ❌    |     ❌     |     ✅      |
| OCR de Lista/Ticket         |      ❌      |   ❌    |     ⚠️     |     ✅      |
| Portal PYMES locales        |      ❌      |   ❌    |     ❌     |     ✅      |
| Asistente LLM               |      ❌      |   ❌    |     ⚠️     |     ✅      |
| Recálculo por Stock/Tráfico |      ❌      |   ❌    |     ❌     |     ✅      |

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👤 Autor

- **Nicolás Parrilla Geniz** — Estudiante de Ingeniería Informática, Universidad de Sevilla
- Tutor: **Juan Vicente Gutiérrez Santacreu**

---

_Proyecto desarrollado como Trabajo Fin de Grado — Escuela Técnica Superior de Ingeniería Informática, Universidad de Sevilla, 2025-2026._
