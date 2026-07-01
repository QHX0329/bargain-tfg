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

**REGLA-08 (de ERR-011):** (1) Toda llamada a una API externa dentro del ciclo síncrono de una petición (Gemini, ORS, Places...) debe tener un **timeout corto** y degradar a un fallback; nunca debe poder bloquear un worker de Gunicorn (en el free tier hay solo 2 → un endpoint lento provoca 503 por health-check sin worker). Si se llama por cada ítem de una lista, añadir un circuit-breaker por petición. (2) En frontend, los parámetros configurables por el usuario (radio de búsqueda, pesos, paradas) se leen SIEMPRE del perfil; no hardcodear valores como `getNearby(lat, lng, 5)`.

**REGLA-09 (de ERR-012):** Nunca usar como valor por defecto de `dict.get(k, default)` (o de un argumento) una expresión que pueda lanzar para usuarios anónimos, como `request.user.<attr>`. Python la evalúa SIEMPRE. En endpoints accesibles sin auth (los que usan el cliente público del frontend), leer primero `query_params`/`data` y solo entonces recurrir a `getattr(request.user, "<attr>", <fallback>)`. Verificar siempre el comportamiento con `AnonymousUser`.

**REGLA-10 (de ERR-013):** (1) Diagnóstico CORS vs caída de instancia: si `fetch(mode:'no-cors')` devuelve opaque pero `fetch(mode:'cors')` falla de forma consistente desde el origen de la app (y las llamadas directas same-origin dan 200), es un problema de **CORS** (falta `Access-Control-Allow-Origin`), no de que el backend esté caído. (2) Los orígenes propios desplegados deben permitirse de forma robusta vía `CORS_ALLOWED_ORIGIN_REGEXES` en código, no solo por env var, para que una mala configuración del entorno no bloquee toda la app. (3) En Render, `Handling signal: term` + `Shutting down: Master` es el apagado normal de la instancia antigua en cada deploy (rolling), no un crash; confírmalo por los PIDs/ID de instancia y por el estado "live" en Events.

**REGLA-11 (de ERR-014):** Al subir un `FormData` con Axios, nunca fijar a mano `"Content-Type": "multipart/form-data"` (sin `boundary` el body queda ilegible en el backend — DRF responde "no era un archivo"). Si la instancia de Axios tiene un `Content-Type` por defecto (p. ej. `application/json`), anularlo solo para esa petición con `headers: { "Content-Type": undefined }` y dejar que el runtime (XHR/fetch en web, puente nativo en RN) genere la cabecera real con boundary a partir del `FormData`.

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

### [2026-06-29] — ERR-011 — Claude (claude-opus-4-8)

**Contexto:** Tras desplegar el fix de auth, persistían dos problemas verificados en producción con sesión válida (logs de Render `bargain-free-api`): (a) el widget "tiendas en tu radio" buscaba a un radio fijo y no al configurado por el usuario; (b) `POST /api/v1/optimize/` devolvía **503**.

**Error cometido / Causa raíz:**
- **Radio:** `HomeScreen` llamaba a `storeService.getNearby(lat, lng, 5)` con **5 km fijos**, ignorando `max_search_radius_km` del perfil (50 km). Además el `resolveSearchRadiusKm` inicial dependía de que el perfil ya estuviera cargado (carrera → caía al default de 10 km).
- **503 del optimizador:** el paso semántico (`apps.optimizer.services.semantic.select_semantic_intent`) llama a Gemini (`gemini-3-flash-preview`) **una vez por ítem** y **sin timeout**. Los logs mostraban `503 UNAVAILABLE ("model experiencing high demand")` de Gemini; el SDK reintentaba/esperaba, bloqueando uno de los **2 workers** de Gunicorn durante decenas de segundos. Con el otro worker ocupado y el health-check sin worker libre, Render marcaba la instancia *unhealthy* y devolvía 503. (ORS_API_KEY está vacío → haversine; el solver sí completaba: `solve_route_success`.)

**Solución aplicada:**
- `frontend/src/screens/home/HomeScreen.tsx`: `resolveSearchRadiusKm()` ahora es async y se asegura de cargar el perfil (lo cachea) antes de resolver el radio; usa `searchRadiusKm`/`max_search_radius_km` y solo recurre a 10 km si no hay perfil. Las 3 llamadas a `getNearby` lo usan.
- `backend/apps/optimizer/services/semantic.py`: timeout HTTP corto en el cliente Gemini (`HttpOptions(timeout=4000)`, construcción dentro del `try`) + circuit-breaker **por petición** (`SemanticBudget`): si Gemini falla con un ítem, los demás saltan directos a la heurística. `backend/apps/optimizer/services/matching.py` propaga el `SemanticBudget` a todos los ítems de la lista.

**Prevención:** REGLA-08.

**Archivos afectados:** `frontend/src/screens/home/HomeScreen.tsx`, `backend/apps/optimizer/services/semantic.py`, `backend/apps/optimizer/services/matching.py`

---

### [2026-06-29] — ERR-012 — Claude (claude-opus-4-8)

**Contexto:** Verificación en producción tras el deploy: el widget "tiendas en tu radio" seguía usando 10 km pese a tener 50 km en el perfil y pese al fix de frontend (ERR-011). Comprobado con datos reales vía el endpoint público: desde el centro de Sevilla `radius_km=10` → 58 tiendas; desde la ubicación real del usuario (Alcolea del Río, ~37 km del clúster) `radius_km=50` y `radius_km=200` → solo 2 (las 2 tiendas de prueba locales). Es decir, el backend ignoraba `radius_km` y aplicaba siempre 10 km.

**Error cometido / Causa raíz:** En `apps/stores/views.py` (`get_queryset`), el radio se leía con `request.query_params.get("radius_km", request.user.max_search_radius_km)`. Python evalúa SIEMPRE el segundo argumento (el valor por defecto), también cuando `radius_km` viene en la query. El widget de tiendas usa el **cliente público (sin token)** → `request.user` es `AnonymousUser`, que no tiene `max_search_radius_km` → `AttributeError` → el `except (ValueError, AttributeError)` forzaba `radius_km = 10.0`, descartando el valor recibido. Resultado: peticiones anónimas SIEMPRE a 10 km, sin importar el parámetro.

**Solución aplicada:** Leer primero el parámetro (`radius_param = request.query_params.get("radius_km")`); si viene, `float()` con su propio try/except; si no, usar `getattr(request.user, "max_search_radius_km", 10.0) or 10.0` (seguro para anónimos). Así se respeta el `radius_km` enviado por el frontend (50 km) y no se rompe con usuarios anónimos. Compatible con `tests/integration/test_store_endpoints.py` (que exige que `radius_km` filtre correctamente).

**Prevención:** REGLA-09.

**Archivos afectados:** `backend/apps/stores/views.py`

---

### [2026-06-30] — ERR-013 — Claude (claude-opus-4-8)

**Contexto:** Tras desplegar los fixes anteriores, la app desplegada (`bargain-app.onrender.com`) mostraba "0 tiendas", listas vacías y los logs de Render mostraban `Handling signal: term` / `Shutting down: Master`. El usuario interpretó que el deploy fallaba.

**Diagnóstico:**
- Los mensajes `term`/`Worker exiting`/`Shutting down: Master` son el **apagado normal del contenedor ANTIGUO** cuando un nuevo deploy toma el relevo (rolling deploy). Se confirmó por los PIDs/IDs de instancia: la nueva (`[zsl5q]`, workers 114/115) iba "live" y la vieja (`[g8pw5]`, workers 112/113) recibía SIGTERM ~1 min después. No es un crash. El deploy estaba "live" en Events.
- El verdadero fallo: la app **no podía hablar con el backend por CORS**. Prueba decisiva desde el origen de la app: `fetch(mode:'no-cors')` devolvía opaque (el servidor responde) pero `fetch(mode:'cors')` fallaba 4/4 veces, mientras llamadas directas same-origin daban 200. Es decir, la respuesta NO incluía `Access-Control-Allow-Origin` para `https://bargain-app.onrender.com`. El navegador bloqueaba TODAS las llamadas a la API (stores, profile, lists, optimize) → la app parecía rota aunque el backend y el fix del radio funcionaban (consulta directa: 65 tiendas a 50 km).
- Causa: el env var `CORS_ALLOWED_ORIGINS` del servicio dejó de incluir el origen de la app, y el `_default_cors_origins` de `base.py` tampoco lo incluía. Como el env var SOBREESCRIBE al default, cambiar el default no bastaba.

**Solución aplicada:** Añadido `CORS_ALLOWED_ORIGIN_REGEXES` en `base.py` (aditivo a `CORS_ALLOWED_ORIGINS`) que permite siempre `^https://bargain-[a-z0-9-]+\.onrender\.com$` y el portal de GitHub Pages, de modo que un env var mal configurado no vuelva a bloquear toda la app. Alternativa inmediata sin deploy: corregir el env var `CORS_ALLOWED_ORIGINS` en el dashboard para incluir `https://bargain-app.onrender.com`.

**Prevención:** REGLA-10.

**Archivos afectados:** `backend/config/settings/base.py`

---

### [2026-07-01] — ERR-014 — Claude (claude-sonnet-5)

**Contexto:** Nico reportó que subir una foto de una lista de la compra a `POST /api/v1/ocr/scan/` devolvía siempre `INVALID_REQUEST` / "La información enviada no era un archivo. Compruebe el tipo de codificación del formulario.", con cualquier imagen probada (descartando que fuera un problema de la foto en sí).

**Error cometido:** `frontend/src/api/ocrService.ts` (`scanImage`) y `frontend/src/api/authService.ts` (`updateProfile`) fijaban a mano `headers: { "Content-Type": "multipart/form-data" }` en peticiones Axios cuyo body es un `FormData`. Al forzar esa cabecera **sin el parámetro `boundary`**, Axios respeta el valor explícito y no deja que el runtime (XHR en Expo web/react-native-web, o el puente nativo en iOS/Android) calcule y añada el boundary real al serializar el `FormData`. Django recibe un body multipart sin boundary, no puede trocearlo en partes, `request.FILES` llega vacío y el `ImageField`/`FileField` de DRF falla con el mensaje genérico de "no era un archivo".

**Causa raíz:** Se intentó "corregir" a mano el `Content-Type: application/json` que `apiClient` fija por defecto (`frontend/src/api/client.ts`) sin tener en cuenta que Axios ya genera automáticamente la cabecera correcta (con boundary) para cuerpos `FormData`, siempre que no se le fuerce un valor explícito de `Content-Type`. El bug es reproducible en cualquier entorno gobernado por XHR/fetch real (Expo web); en builds nativos puede pasar desapercibido porque el puente de React Native a veces reescribe el boundary igualmente, lo que probablemente explica que llevara tiempo sin detectarse.

**Solución aplicada:** En ambos sitios se sustituyó el valor fijo por `headers: { "Content-Type": undefined }`. Axios (`AxiosHeaders.toJSON()`) filtra las cabeceras con valor `undefined`/`null` antes de enviarlas, así que esto anula el default JSON de la instancia sin forzar ningún valor propio, dejando que el runtime añada la cabecera real con boundary al detectar un body `FormData`.

**Prevención:** REGLA-11.

**Archivos afectados:** `frontend/src/api/ocrService.ts`, `frontend/src/api/authService.ts`

---

## Instrucciones para agentes

- **Claude:** Actualiza este archivo al final de cada sesión donde hayas cometido un error, aunque sea menor. Usa el formato estándar. Revisa las REGLAS derivadas al inicio de cada sesión.
- **Gemini / Codex:** Si detectas un error tuyo o de otro agente en los archivos del proyecto (código incorrecto, documentación contradictoria, etc.), añade una entrada aquí antes de corregirlo. Incluye "— Gemini" o "— Codex" en el encabezado.
- **Todos:** Si una REGLA de este log aplica a lo que estás a punto de hacer, menciónala explícitamente en tu razonamiento antes de actuar.

