# Phase 13: Mejorar la app Expo existente (frontend/src) para uso web - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Añadir funcionalidad orientada a web **dentro de las screens ya existentes** de la app
Expo (`frontend/src`), que ya corre en web vía `expo start --web` (react-native-web).
El objetivo es que esas pantallas aprovechen el navegador (pantalla ancha, ratón/teclado,
convenciones web) y mejoren la experiencia web sin degradar la experiencia móvil.

**Dentro de alcance:** mejoras web dentro de screens existentes de los clústeres
`home/`, `lists/`, `map/` y `assistant/` (15 screens).

**Fuera de alcance (otras fases / no tocar):**
- Crear pantallas nuevas (prohibido por definición de la fase).
- Modificar la app web separada `frontend/web/` (Vite + Ant Design, Fase 12) — se conserva intacta.
- Screens de `auth/` y `profile/`.
- Cambios en el árbol/lógica de navegación móvil.

</domain>

<decisions>
## Implementation Decisions

### Relación con frontend/web
- **D-01:** El esfuerzo web se concentra en la app Expo (`frontend/src`). Pasa a ser el foco
  de la experiencia web a mejorar.
- **D-02:** `frontend/web/` (Vite + Ant Design, Fase 12) **se conserva intacto**: no se toca,
  no se deprecia formalmente, queda como referencia/respaldo. NO debe modificarse en esta fase.

### Alcance de pantallas (por flujos completos)
- **D-03:** Se mejoran los flujos funcionales completos de los clústeres `home/`, `lists/`,
  `map/` y `assistant/`. En total **15 screens**:
  - Listas: `lists/ListsScreen`, `lists/ListDetailScreen`, `lists/TemplatesScreen`,
    `lists/OCRScreen`, `lists/RouteScreen`
  - Mapa: `map/MapScreen`, `map/StoreProfileScreen`, `home/FavoriteStoresScreen`
  - Catálogo/Precios: `home/HomeScreen`, `home/ProductsCatalogScreen`,
    `home/PriceCompareScreen`, `home/ProductProposalScreen`
  - Asistente/Notif.: `assistant/AssistantScreen`, `home/NotificationScreen`,
    `home/PriceAlertsScreen`
- **D-04:** `auth/` (Login, Register) y `profile/` (Profile, EditProfile, ChangePassword,
  OptimizerConfig) **quedan fuera** del alcance de esta fase.

### Tipos de mejora web (las cuatro categorías)
- **D-05:** **Layout responsive ancho** — aprovechar el espacio en escritorio: multi-columna,
  patrón master-detail (lista a la izq. + detalle a la der.), grids de productos/tiendas en
  lugar de columna única móvil.
- **D-06:** **Ratón y teclado** — estados hover, foco visible, atajos de teclado (p.ej. Enter
  para añadir ítem, Esc para cerrar), tooltips.
- **D-07:** **Conveniencias web** — drag-drop para reordenar ítems de lista, exportar/descargar
  (ruta/lista/comparativa), copiar al portapapeles, compartir por URL.
- **D-08:** **URL / deep-linking** — reflejar estado clave en la URL (lista seleccionada,
  tienda, filtros) para soportar back/forward del navegador y enlaces compartibles.

### Estrategia técnica
- **D-09:** Divergencia web/móvil mediante **breakpoints responsive** (`useWindowDimensions`
  / hook de breakpoints) dentro de cada screen para layout adaptativo.
- **D-10:** Usar ficheros **`.web.tsx` solo cuando la divergencia sea grande** (siguiendo el
  patrón ya existente en `map/MapScreen.web.tsx`). Minimizar duplicación de código.
- **D-11:** **Sin pantallas nuevas** y **sin tocar la navegación móvil**: mismo árbol de
  navegación, las mejoras viven dentro de las screens existentes.

### Navegación web
- **D-12:** **Mantener la navegación por tabs existente**, solo reestilada/ensanchada para web.
  NO se introduce un shell de navegación nuevo (sidebar/topbar persistente). Esto mantiene la
  fase estrictamente dentro de "sin pantallas nuevas" y minimiza riesgo.

### Priorización
- **D-13:** **Sin priorización explícita** — el planner reparte las cuatro mejoras (D-05..D-08)
  de forma uniforme por los flujos en alcance. No hay una ola "must-have" obligatoria por
  encima de las demás; el planner organiza las olas a su criterio respetando dependencias.

### Claude's Discretion
- Formatos concretos de exportación (PDF vs CSV) y qué datos exportar por flujo — no decidido
  explícitamente; el planner/researcher puede elegir el enfoque estándar más sencillo.
- Estrategia de pruebas (reuso de Playwright E2E existente vs Jest por screen vs validación
  manual) — no decidida; queda a discreción del planner según el patrón del repo.
- Detalles concretos de qué estado va a la URL por screen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Patrón web/móvil existente (reutilizar)
- `frontend/src/screens/map/MapScreen.web.tsx` — patrón `.web.tsx` ya en uso para divergencia
  web/móvil grande. Modelo a seguir para D-10.
- `frontend/src/screens/map/MapScreen.tsx` — variante nativa correspondiente.

### Decisiones de arquitectura relevantes
- `docs/decisiones/002-modelo-hibrido.md` (ADR-002) — modelo híbrido backend Docker / frontend
  nativo en host; contexto de por qué el frontend Expo corre en host y soporta web.

### Pantallas en alcance (raíz de trabajo)
- `frontend/src/screens/home/` — HomeScreen, ProductsCatalogScreen, PriceCompareScreen,
  ProductProposalScreen, NotificationScreen, PriceAlertsScreen, FavoriteStoresScreen
- `frontend/src/screens/lists/` — ListsScreen, ListDetailScreen, TemplatesScreen, OCRScreen,
  RouteScreen
- `frontend/src/screens/map/` — MapScreen(+`.web.tsx`), StoreProfileScreen
- `frontend/src/screens/assistant/` — AssistantScreen
- `frontend/src/theme/` — colores, tipografía, espaciado a reutilizar en los layouts web

### App web separada (NO tocar)
- `frontend/web/` — app Vite + Ant Design de la Fase 12. Se conserva intacta; referencia
  funcional pero **no se modifica** en esta fase (D-02).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/screens/map/MapScreen.web.tsx`: prueba de que el proyecto ya separa variantes
  web con `.web.tsx`; reutilizar este patrón para divergencias grandes.
- `frontend/src/theme/`: sistema de tema (colores/tipografía/espaciado) a reutilizar en
  layouts responsive para mantener consistencia visual.
- App ya configurada para web (`expo start --web`, react-native-web; script `web` en
  `frontend/package.json`).

### Established Patterns
- React Navigation con navegación por tabs (móvil). Se mantiene; solo se adapta/ensancha para
  web (D-12) — sin nuevo shell.
- 15 screens maduras y de tamaño considerable (varias >700 LOC); las mejoras se insertan
  dentro de ellas, no las reescriben.

### Integration Points
- Cada screen en alcance: punto de inserción de layout responsive (breakpoints) y mejoras de
  interacción.
- Capa de navegación: reestilado del tab bar para anchos de escritorio.
- Para deep-linking: configuración de `linking` de React Navigation (estado ↔ URL).

</code_context>

<specifics>
## Specific Ideas

- Patrón master-detail explícitamente deseado para pantallas con lista+detalle (p.ej. flujo de
  Listas) en escritorio.
- Reutilizar el patrón `MapScreen.web.tsx` como plantilla mental para cualquier `.web.tsx` nuevo.
- "Sensación de app web real" sin sacrificar la app móvil ni crear pantallas.

</specifics>

<deferred>
## Deferred Ideas

- **Shell de navegación web (sidebar/topbar persistente):** considerado y rechazado para esta
  fase (D-12). Podría reabrirse en una fase futura si se busca una experiencia web más diferenciada.
- **Migrar/deprecar `frontend/web/`:** fuera de alcance; el usuario opta por conservarla intacta.
  Una eventual unificación de experiencias web sería su propia fase.
- **Mejoras web para `auth/` y `profile/`:** excluidas de esta fase (D-04); candidatas a fase futura.

</deferred>

---

*Phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad*
*Context gathered: 2026-06-01*
