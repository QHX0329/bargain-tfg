# BarGAIN

## What This Is

BarGAIN es una aplicacion movil y web de compra inteligente para el mercado espanol que optimiza la cesta de la compra cruzando precio, distancia y tiempo entre multiples supermercados y comercios locales. El sistema calcula la combinacion optima de paradas para maximizar el ahorro real del usuario.

## Core Value

El usuario introduce su lista y obtiene rutas optimas entre varias tiendas, equilibrando ahorro economico y coste de desplazamiento.

## Current Snapshot (2026-03-19)

- F1 Analisis y Diseno: completada.
- F2 Infraestructura Base: completada.
- F3 Core Backend: completada.
- F4 Frontend: en progreso, hasta F4-27 completada.
- F5 IA/Optimizador/Scraping: pendiente.
- F6 Cierre y defensa: pendiente.
- Progreso global estimado: ~62%.
- Phase 13 (mejoras web de la app Expo) completada (2026-06-05): responsive D-05, ratón/teclado D-06, conveniencias web D-07 y deep-linking D-08 aplicados en las 15 pantallas en alcance, sin crear nuevas pantallas. Quedan 10 ítems de verificación manual en navegador (13-HUMAN-UAT.md).

## Active Scope

- Cierre de funcionalidades frontend restantes de F4.
- Preparacion de F5 para optimizacion real, scraping productivo y OCR/LLM backend.
- Mantenimiento de consistencia documental entre TASKS, docs/memoria, README, CLAUDE y .planning.

## Constraints

- Proyecto academico TFG con plan de 300 horas.
- Entorno oficial: backend en Docker y frontend nativo en host (ADR-002).
- Cobertura backend objetivo >=80%.
- Se priorizan funcionalidades demostrables de valor para defensa.

## Key Decisions Status

| Decision | Status |
|----------|--------|
| ADR-001 Django + DRF + PostGIS | Adoptada |
| ADR-002 Modelo hibrido backend/frontend | Adoptada y operativa |
| JWT con refresh y rotacion | Implementado |
| Portal business y notificaciones | Implementado |
| Optimizador multicriterio productivo | Pendiente (F5) |
| OCR backend productivo | Pendiente (F5) |
| Integracion LLM productiva | Pendiente (F5) |

---
Last updated: 2026-06-05
