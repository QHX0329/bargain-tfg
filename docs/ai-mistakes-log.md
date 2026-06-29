# AI Mistakes Log — BarGAIN

> Registro de errores cometidos por agentes IA trabajando en este proyecto,
> con su causa raíz y solución. Actualizar este archivo cada vez que se detecte
> un error cometido por un agente IA (Claude, Gemini, Codex u otro).
>
> **Propósito:** Mejorar la eficacia de futuros agentes evitando errores repetidos.
> **Referenciado desde:** `CLAUDE.md`, `TASKS.md`

---

## Formato de entrada

```
### [YYYY-MM-DD] — [CÓDIGO_ERROR] — [AGENTE]

**Contexto:** Qué se estaba haciendo cuando ocurrió el error.
**Error cometido:** Descripción exacta del fallo.
**Causa raíz:** Por qué ocurrió (falta de contexto, suposición incorrecta, etc.).
**Solución aplicada:** Cómo se corrigió.
**Prevención:** Qué comprobar antes de hacer esto en el futuro.
**Archivos afectados:** Lista de archivos modificados incorrectamente.
```

---

## Errores registrados

### [2026-03-10] — ERR-001 — Claude (claude-sonnet-4-6)

**Contexto:** Redacción de la sección 8 de la memoria del TFG (Diseño e Implementación).

**Error cometido:** Se asumió que la sección 08 estaba vacía sin verificar si existía contenido previo significativo más allá del stub de "Pendiente de desarrollo".

**Causa raíz:** Confianza excesiva en el estado inicial del archivo; no se comprobó si había trabajo previo del usuario antes de sobreescribir.

**Solución aplicada:** Se leyó el archivo antes de escribir y se confirmó que solo contenía el stub de placeholder. La sobreescritura fue correcta en este caso.

**Prevención:** Siempre leer el archivo destino antes de escribir. Si contiene más de un stub de 5 líneas, preguntar al usuario si quiere conservar o reemplazar el contenido.

**Archivos afectados:** `docs/memoria/08-diseno-implementacion.md`

---

### [2026-03-11] — ERR-002 — Claude (claude-sonnet-4-6)

**Contexto:** Ejecución de la tarea F1-14 (Wireframes / Mockups de UI). El agente generó diseños de pantallas para la app BarGAIN en una sesión previa.

**Error cometido:** Se entregaron wireframes de las pantallas principales de la app usando arte ASCII (caracteres `+`, `-`, `|`, `[`, `]`, `#`) en lugar de un formato visual renderizable.

**Causa raíz:** El agente no recibió instrucción explícita sobre el formato de salida y eligió por defecto texto plano, que es el formato más portable pero carece totalmente de utilidad visual para diseño de interfaz de usuario.

**Solución aplicada:** Se regeneraron los 10 mockups completos en un único archivo `docs/diagramas/ui-mockups/index.html` autocontenido (HTML + CSS + JS), con marco de móvil realista, sistema de diseño real (colores, tipografías, componentes), galería navegable por pestañas y panel informativo con los requisitos RF vinculados a cada pantalla.

**Prevención:** Antes de generar cualquier wireframe, mockup o diagrama de interfaz de usuario, verificar que el formato de salida sea uno de los siguientes:
- `HTML + CSS + JS` autocontenido, renderizable directamente en GitHub Pages o como fichero `.html`
- `PNG` o `SVG` generado programáticamente
- `PlantUML @startsalt` únicamente para wireframes de baja fidelidad muy simples y como borrador temporal, nunca como entregable final

**Nunca** usar arte ASCII para representar pantallas, componentes o flujos de UI, independientemente de si el usuario lo pide de forma ambigua ("diseña las pantallas", "haz un esquema de la UI", etc.). Si hay ambigüedad, preguntar el formato antes de implementar.

**Archivos afectados:** Ninguno (el error se detectó antes de que el fichero ASCII fuera comprometido al repositorio). Entregable correcto creado en `docs/diagramas/ui-mockups/index.html`.

---

### [2026-03-13] — ERR-003 — Codex (GPT-5.3-Codex)

**Contexto:** Implementación de F2-09 (seed de datos) y validación de tests backend en Windows.

**Error cometido:** Se invirtió tiempo intentando estabilizar la carga local de GDAL/GEOS en host para `pytest`, cuando el flujo del proyecto ejecuta backend en Docker (modelo híbrido ADR-002).

**Causa raíz:** No priorizar desde el inicio el contexto de ejecución real de `make test-backend` en un entorno Windows con GIS.

**Solución aplicada:** Se cambió `make test-backend` y `make test-backend-cov` para ejecutar tests dentro del contenedor `backend` (con GDAL ya instalado) y se dejaron variantes host opcionales (`test-backend-host`, `test-backend-cov-host`).

**Prevención:** En Windows y en el modelo híbrido del proyecto, ejecutar tests/lint backend en Docker por defecto. Solo usar host si se requiere explícitamente y con GIS local validado.

**Archivos afectados:** `Makefile`, `backend/config/settings/base.py`

---

### [2026-03-13] — ERR-004 — Codex (GPT-5.3-Codex)

**Contexto:** Ajuste de `base.py` para simplificar configuración de GDAL/GEOS al mover tests backend a Docker.

**Error cometido:** Se aplicaron `GDAL_LIBRARY_PATH`/`GEOS_LIBRARY_PATH` desde `.env` sin validar existencia de la ruta en el runtime actual, propagando una ruta Windows (`C:\OSGeo4W\...`) al contenedor Linux.

**Causa raíz:** No considerar que `.env` se comparte entre host y contenedores en `docker-compose`, con paths incompatibles por sistema operativo.

**Solución aplicada:** En `backend/config/settings/base.py` ahora solo se asignan `GDAL_LIBRARY_PATH` y `GEOS_LIBRARY_PATH` cuando la ruta existe (`Path(...).exists()`). En Docker, Django vuelve a usar `libgdal.so.*` del sistema.

**Prevención:** Cuando una variable de entorno contenga rutas de filesystem, validar su existencia antes de aplicarla en settings comunes host+contenedor.

**Archivos afectados:** `backend/config/settings/base.py`

---

## Patrones de error recurrentes

> Esta sección se actualiza automáticamente cuando un mismo tipo de error ocurre más de una vez.

*(Sin patrones recurrentes registrados aún)*

---

## Reglas derivadas de este log

> Reglas que todos los agentes deben seguir, extraídas de los errores anteriores.

**REGLA-01 (de ERR-001):** Antes de escribir en cualquier archivo de documentación, leerlo completamente. Si contiene contenido sustancial (>10 líneas útiles), no sobreescribir sin confirmación explícita del usuario.

**REGLA-02 (de ERR-002):** Los wireframes, mockups y diagramas de interfaz de usuario **nunca** se entregan en formato ASCII. El formato obligatorio es HTML+CSS+JS autocontenido (renderizable en GitHub), PNG/SVG generado programáticamente, o PlantUML `@startsalt` solo para borradores de muy baja fidelidad. Ante ambigüedad en el formato pedido, preguntar antes de implementar.

**REGLA-03 (de ERR-003):** En entornos Windows del proyecto BarGAIN (modelo híbrido ADR-002), ejecutar backend tests en Docker por defecto (`make test-backend`). Evitar depurar GDAL/GEOS en host salvo petición explícita.

**REGLA-04 (de ERR-004):** En settings compartidos entre host y Docker, no asumir que rutas de `.env` son portables entre sistemas. Aplicar rutas solo si existen en el runtime actual.

**REGLA-05 (de ERR-008):** Nunca aplicar operaciones destructivas in-place sobre ficheros binarios accedidos a través de un montaje con sincronización diferida. Verificar integridad (p. ej. chunk IEND en PNG, carga estricta sin `LOAD_TRUNCATED_IMAGES`) y operar siempre sobre una copia de trabajo.

**REGLA-07 (de ERR-010):** Si se cambia la forma de la respuesta de un endpoint (p. ej. envolver en `{ success, data }`), revisar TODOS los consumidores, incluidos los que no pasan por el interceptor común (como `refreshAxios`). Los endpoints JWT (`token`, `token/refresh`) son especialmente sensibles: con `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`, no persistir el `refresh` rotado invalida la sesión en el siguiente refresh. Mantener el parseo de tokens tolerante a ambas formas (envelope y plana).

---

### [2026-03-17] — ERR-006 — Claude (claude-sonnet-4-6)

**Contexto:** Phase 2 UAT — Test 5 Business Price Management
**Error:** `BusinessPriceViewSet` permitía crear precios para tiendas de otros negocios. El `perform_create` solo forzaba `source='business'` e `is_stale=False`, pero no validaba que `store.business_profile == perfil del usuario autenticado`.
**Causa raíz:** `PromotionSerializer` tenía la validación de ownership correctamente implementada, pero `BusinessPriceSerializer` no la tenía.
**Fix:** Añadido método `validate()` en `BusinessPriceSerializer` que verifica `store.business_profile == BusinessProfile.objects.get(user=request.user, is_verified=True)`. Añadido test `test_cannot_post_price_for_other_business_store`.
**REGLA derivada:** En cualquier ViewSet donde el modelo referencia una tienda (`store` FK), verificar siempre que `store.business_profile` pertenece al usuario autenticado si el ViewSet usa `IsVerifiedBusiness`.

---

### [2026-03-26] — ERR-007 — Codex (GPT-5.3-Codex)

**Contexto:** Extensión de scraping con nuevos spiders de Costco/Alcampo/Hipercor y ampliación de tests unitarios.

**Error cometido:** Se introdujo un error de indentación en `test_costco_extract_rows_from_pdf_bytes_without_pypdf`, provocando `IndentationError` durante la colección de `pytest`.

**Causa raíz:** Edición rápida del bloque del test sin validar alineación final antes de ejecutar la suite.

**Solución aplicada:** Se corrigió la indentación del `import` dentro del test y se reejecutó validación: tests focalizados + suite unitaria completa.

**Prevención:** Tras añadir tests nuevos, ejecutar siempre primero un `pytest` focalizado del archivo editado para detectar errores de sintaxis/indentación antes de la suite ampliada.

**Archivos afectados:** `backend/tests/unit/test_scraping_spiders.py`

---

### [2026-06-10] — ERR-008 — Claude (claude-fable-5)

**Contexto:** Generación de capturas de pantalla reales para el cap. 9 de la memoria (F7-07), trabajando sobre la carpeta del repo montada en un sandbox con sincronización diferida (OneDrive/Cowork).

**Error cometido:** Se convirtieron los PNG de capturas con PIL usando `ImageFile.LOAD_TRUNCATED_IMAGES = True` directamente sobre los ficheros originales mientras el espejo del sistema de archivos aún estaba sincronizando. PIL rellenó de negro los bytes ausentes de los ficheros a medio sincronizar y los sobrescribió, corrompiendo varias capturas (p. ej. `pyme-dashboard.png`).

**Causa raíz:** Asumir que el contenido visible en el montaje del sandbox era el estado final del fichero, y aplicar una operación destructiva (sobrescritura in-place) con tolerancia a ficheros truncados activada.

**Solución aplicada:** Recaptura completa de las 47 pantallas con `scripts/capture-memoria.mjs` y compilación en copia de trabajo (`/tmp/build`) sin modificar nunca los PNG originales. Verificación de integridad (carga PIL estricta + chunk IEND) antes de compilar.

**Prevención:** REGLA-05.

---

### [2026-06-11] — ERR-009 — Claude (claude-fable-5)

**Contexto:** Caída del servicio `bargain-free-api` en Render tras la jornada de conexión de frontends y siembra de staging (F7-08/F7-09).

**Error cometido:** El endpoint de health (`/api/v1/health/`) heredaba las clases de throttling por defecto de DRF (`anon: 100/hour`). El tráfico intenso del día (verificaciones, sondas del propio Render y reinicios amplificados por el `seed_demo` añadido al arranque) agotó la cuota anónima, el health check empezó a responder **429** y Render marcó la instancia como *unhealthy*, entrando en un bucle de reinicios.

**Causa raíz:** Aplicar límites de tasa pensados para clientes anónimos a un endpoint de monitorización que es consultado de forma continua por la propia plataforma de hosting.

**Solución aplicada:** `@throttle_classes([])` en la vista de health (commit `9904740`), límite anónimo de producción ajustado a 300/h con margen para demos, y verificación post-deploy (login + catálogo 200, deploy *live*).

**Prevención:** REGLA-06.

---

### [2026-06-29] — ERR-010 — Claude (claude-opus-4-8)

**Contexto:** Diagnóstico de un fallo reportado en producción: la optimización de rutas «no funciona» en la app desplegada (`https://bargain-app.onrender.com`). Reproducido en Chrome: al pulsar «Optimizar ruta», `POST /api/v1/optimize/` devolvía **401** y la app expulsaba al usuario a `/login`.

**Error cometido:** Al introducir el envelope estándar `{ success, data }` también en los endpoints JWT (`CustomTokenObtainPairView` y `CustomTokenRefreshView` envuelven la respuesta con `success_response(...)`), no se adaptó el flujo de *refresh* del frontend. El interceptor de `client.ts` refresca con una instancia de Axios separada (`refreshAxios`) que NO pasa por el interceptor de *unwrap*, y leía `refreshResponse.data.access` / `.refresh` directamente. Con el envelope, esos campos están en `data.data.*`, por lo que ambos quedaban `undefined`.

**Causa raíz:** Combinado con `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` y `ACCESS_TOKEN_LIFETIME=5min`: al expirar el access token (~5 min), el primer refresh devolvía 200 pero el frontend no extraía los tokens → guardaba `access = undefined` y conservaba el refresh **antiguo**, que el backend acababa de rotar y **poner en la blacklist**. El siguiente refresh enviaba ese token ya invalidado → 401 en el endpoint de refresh → `catch` → `logout()` → redirección a `/login`. La optimización era especialmente susceptible porque la pantalla de ruta lanza peticiones concurrentes al enfocar y el usuario suele tardar >5 min ajustando pesos/paradas antes de pulsar el botón.

**Solución aplicada:** Nuevo helper exportado `extractRefreshedTokens()` en `frontend/src/api/client.ts` que desempaqueta de forma defensiva tanto el envelope `{ success, data: { access, refresh } }` como la forma plana `{ access, refresh }`, exige `access` (lanza error → logout limpio) y conserva el `refresh` rotado para persistirlo. Además se corrigió la cola de refresh (`RefreshQueueEntry` con `resolve`+`reject`): antes, si el refresh fallaba, las peticiones encoladas quedaban como promesas que nunca se resolvían (UI colgada en estado de carga); ahora se rechazan explícitamente. Tests de regresión añadidos en `__tests__/apiClient.test.ts`. Requiere redeploy del frontend (Expo web) para surtir efecto en producción.

**Prevención:** REGLA-07.

**Archivos afectados:** `frontend/src/api/client.ts`, `frontend/__tests__/apiClient.test.ts`

---

## Instrucciones para agentes

- **Claude:** Actualiza este archivo al final de cada sesión donde hayas cometido un error, aunque sea menor. Usa el formato estándar. Revisa las REGLAS derivadas al inicio de cada sesión.
- **Gemini / Codex:** Si detectas un error tuyo o de otro agente en los archivos del proyecto (código incorrecto, documentación contradictoria, etc.), añade una entrada aquí antes de corregirlo. Incluye "— Gemini" o "— Codex" en el encabezado.
- **Todos:** Si una REGLA de este log aplica a lo que estás a punto de hacer, menciónala explícitamente en tu razonamiento antes de actuar.

