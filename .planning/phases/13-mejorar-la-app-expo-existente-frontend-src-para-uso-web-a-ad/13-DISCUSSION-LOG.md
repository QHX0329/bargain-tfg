# Phase 13: Mejorar la app Expo existente (frontend/src) para uso web - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
**Areas discussed:** Relación con frontend/web, Alcance de pantallas, Tipos de mejora web, Estrategia técnica, Navegación web, Priorización

---

## Relación con frontend/web

| Option | Description | Selected |
|--------|-------------|----------|
| Expo = web canónica | Expo única experiencia web; frontend/web/ deprecado | |
| Coexisten, sin paridad | frontend/web/ sigue como demo aparte; Expo mejora puntual | |
| Expo web es el foco, web/ se mantiene | Foco en mejorar Expo; frontend/web/ intacto sin deprecar | ✓ |

**User's choice:** Expo web es el foco, frontend/web/ se mantiene intacto.
**Notes:** Todo el trabajo de la fase queda dentro de frontend/src.

---

## Alcance de pantallas

| Option | Description | Selected |
|--------|-------------|----------|
| Subconjunto prioritario (demo) | Home, ListDetail, Route, Map, ProductsCatalog | |
| Todas las screens | Las 22 screens | |
| Por flujos completos | Grupos funcionales completos | ✓ |

**User's choice:** Por flujos completos.
**Follow-up (Flujos — multiselect):** Seleccionados los 4: Flujo Listas, Flujo Mapa, Flujo Catálogo/Precios, Flujo Asistente/Notif.
**Notes:** Cubre home/ + lists/ + map/ + assistant/ (15 screens). auth/ y profile/ fuera.

---

## Tipos de mejora web

| Option | Description | Selected |
|--------|-------------|----------|
| Layout responsive ancho | Multi-columna, master-detail, grids | ✓ |
| Ratón y teclado | Hover, foco, atajos, tooltips | ✓ |
| Conveniencias web | Drag-drop, exportar/descargar, copiar, compartir | ✓ |
| URL / deep-linking | Estado en URL, back/forward, enlaces compartibles | ✓ |

**User's choice:** Las cuatro categorías.
**Notes:** Alcance amplio; el planner priorizará por flujo.

---

## Estrategia técnica

| Option | Description | Selected |
|--------|-------------|----------|
| Breakpoints + .web.tsx puntual | useWindowDimensions + .web.tsx solo divergencias grandes | ✓ |
| Checks Platform.OS inline | Condicionales Platform.OS en JSX | |
| Variantes .web.tsx por screen | Un .web.tsx por cada screen | |

**User's choice:** Breakpoints + .web.tsx puntual.
**Notes:** Minimiza duplicación; reutiliza patrón MapScreen.web.tsx.

---

## Navegación web (shell)

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar persistente (escritorio) | Barra lateral/superior persistente en anchos grandes | |
| Mantener tab bar adaptado | Misma navegación por tabs, reestilada para web | ✓ |
| Lo decides tú | Claude elige el patrón | |

**User's choice:** Mantener tab bar adaptado.
**Notes:** Sin shell nuevo; coherente con "sin pantallas nuevas".

---

## Priorización must-have

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive base → resto opcional | Responsive imprescindible (ola 1), resto incremental | |
| Flujo Listas completo primero | Profundidad antes que amplitud | |
| Todo por igual | Sin priorización; planner reparte uniformemente | ✓ |

**User's choice:** Todo por igual.
**Notes:** El planner organiza las olas a su criterio.

## Claude's Discretion

- Formatos de exportación (PDF vs CSV) y datos a exportar.
- Estrategia de pruebas (Playwright E2E vs Jest vs manual).
- Detalle de qué estado va a la URL por screen.

## Deferred Ideas

- Shell de navegación web (sidebar/topbar persistente) — rechazado para esta fase.
- Migrar/deprecar frontend/web/ — fuera de alcance.
- Mejoras web para auth/ y profile/ — excluidas.
