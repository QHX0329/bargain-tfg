---
title: Arquitectura Global
tags:
  - tfg/arquitectura
  - tfg/global
tipo: proyecto
area: arquitectura
estado: activo
fuente:
  - docs/memoria/08-diseno-implementacion.md
  - docs/diagramas/arquitectura/arquitectura-capas.puml
actualizado: 2026-03-24
relacionados:
  - "[[03 Arquitectura/Mapa de Arquitectura]]"
  - "[[10 Assets/Diagramas y Mockups]]"
---

# Arquitectura Global

## Resumen

Bargain sigue una arquitectura por capas con clientes frontend, backend API, persistencia geoespacial y servicios auxiliares.

## Estado

Base definida y mayoritariamente operativa.

## Puntos clave

- Frontends móvil y web consumen la misma API.
- Backend centraliza dominio y reglas de negocio.
- PostGIS soporta proximidad y geolocalización.
- Celery/Redis soportan asincronía.
- IA, OCR, optimización y scraping forman el bloque inteligente pendiente.

## Fuente de verdad

- `docs/memoria/08-diseno-implementacion.md`
- `docs/diagramas/arquitectura/arquitectura-capas.puml`
