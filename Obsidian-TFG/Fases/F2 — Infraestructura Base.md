---
title: F2 — Infraestructura Base
tags:
  - tfg/fase
  - tfg/completada
tipo: fase
area: gestion
fase: F2
estado: completada
semanas: S3-S5
horas-estimadas: 30
horas-reales: 30
fuente:
  - TASKS.md
  - docs/decisiones/002-modelo-hibrido.md
  - backend/config/settings/
actualizado: 2026-03-24
relacionados:
  - "[[02 Gestión/Roadmap y Fases]]"
  - "[[03 Arquitectura/Despliegue y Operación]]"
  - "[[09 Operativa/Entorno de Desarrollo]]"
---

# F2 — Infraestructura Base

[[BargAIn — TFG|← Volver al proyecto]]
[[02 Gestión/Roadmap y Fases|Mapa de fases]]

## Resumen

Fase de arranque técnico: repo, Docker, settings, BD, Celery y tooling.

## Estado

Completada.

## Puntos clave

- Modelo híbrido de desarrollo adoptado.
- Docker Compose y settings por entorno listos.
- PostgreSQL/PostGIS, Redis y seed de datos configurados.

## Fuente de verdad

- `TASKS.md`
- `docs/decisiones/002-modelo-hibrido.md`
- `backend/config/settings/`
- `docker-compose.dev.yml`
- `Makefile`

## Relacionados

- [[07 Decisiones/ADR-002 Modelo híbrido de desarrollo]]
- [[09 Operativa/Entorno de Desarrollo]]
