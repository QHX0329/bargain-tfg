---
title: Datos e Integraciones
tags:
  - tfg/arquitectura
  - tfg/datos
tipo: proyecto
area: arquitectura
estado: activo
fuente:
  - docs/api/README.md
  - docs/decisiones/005-google-places-matching-strategy.md
  - docs/decisiones/006-map-marker-navigation.md
actualizado: 2026-03-24
relacionados:
  - "[[03 Arquitectura/Mapa de Arquitectura]]"
  - "[[07 Decisiones/Índice ADR]]"
---

# Datos e Integraciones

## Resumen

Agrupa persistencia, geodatos e integraciones externas relevantes para el sistema.

## Estado

Base lista con integraciones parciales.

## Puntos clave

- PostgreSQL + PostGIS como base de datos principal.
- JWT para autenticación.
- Redis/Celery para asincronía.
- Google Places como integración pendiente/parcial.

## Fuente de verdad

- `docs/api/README.md`
- `docs/decisiones/005-google-places-matching-strategy.md`
- `docs/decisiones/006-map-marker-navigation.md`
