# Valoración de la memoria del TFG «BarGAIN» — Informe de revisión académica

> **Rol del revisor:** catedrático de Ingeniería del Software actuando como miembro de tribunal estricto.
> **Documento evaluado:** `proyect-final.pdf` (73 páginas, compilado 2026-06-10).
> **Método:** lectura íntegra de la memoria y contraste sistemático de cada afirmación técnica verificable contra el código del repositorio `bargain-tfg` (backend, frontend, scraping, CI/CD, LaTeX).
> **Fecha de revisión:** 2026-06-12.

---

## 1. Valoración global

El proyecto que sustenta esta memoria es, con diferencia, de los más ambiciosos que puede presentar un TFG individual: backend Django modular con PostGIS, optimizador con OR-Tools, OCR con Vision API, asistente LLM, scraping, portal PYME, app móvil/web desde una única base Expo, despliegue público y una disciplina de proceso (planificación viva, trazabilidad de tareas, registro de errores de agentes IA) infrecuente incluso en entornos profesionales. La suite de pruebas declarada se ha verificado y es **exacta**: 333 tests backend, 111 tests Jest, 4 flujos E2E, cobertura ≥80 % forzada en CI.

Sin embargo, **la memoria como documento académico no está a la altura del proyecto que describe**, por tres motivos de peso:

1. **No hay bibliografía en el PDF y no existe ni una sola cita en todo el texto.** Es un defecto formal grave en cualquier TFG.
2. **El capítulo del algoritmo de optimización —presentado como "la aportación técnica central del TFG"— describe un diseño que no se corresponde con la implementación real.** Pipeline de fases, fórmula de scoring, top-3 rutas y uso de ILP no coinciden con el código.
3. **Acumulación de afirmaciones técnicas desmentidas por el código** (login por email, ST_DWithin, caché Redis del optimizador, ejecución Celery, periodicidad de tareas, número de spiders y workflows...). Individualmente serían erratas; en conjunto erosionan la credibilidad del documento ante un tribunal que revise el repositorio.

**Nota orientativa en el estado actual: 6,5/10.** Con las correcciones P0 y P1 de la sección 6, el conjunto proyecto+memoria es candidato razonable a **9–10** e incluso a Matrícula de Honor por alcance técnico. El problema no es el trabajo realizado, sino la fidelidad y el rigor formal del documento que lo presenta.

---

## 2. Análisis de la estructura

### 2.1 Organización general

La estructura sigue el esquema ETSII-US (introducción, antecedentes, comparativa, planificación, requisitos, diseño, manual, pruebas, conclusiones) y la narrativa es coherente y se lee bien. Dicho esto:

| Bloque | Páginas | % del contenido | Juicio |
|---|---|---|---|
| Cap. 1–4 (intro, antecedentes, comparativa, planificación) | 10 | 16 % | Correcto pero superficial en antecedentes |
| Cap. 5 (Requisitos) | 5 | 8 % | **Insuficiente para Ing. del Software** |
| Cap. 6 (Diseño e implementación) | 14 | 22 % | Adecuado en extensión, con errores de contenido |
| Cap. 7 (Manual de usuario) | 26 | **41 %** | Sobredimensionado |
| Cap. 8 (Pruebas) | 5 | 8 % | Corto y con resultados poco cuantificados |
| Cap. 9 (Conclusiones) | 3 | 5 % | Correcto, autocrítico, honesto |
| Bibliografía | 0 | 0 % | **Ausente** |

Un 41 % de la memoria es manual de usuario con capturas, mientras que el capítulo de requisitos —el corazón disciplinar de un grado en Ingeniería del Software— ocupa 5 páginas y **no enumera los requisitos**: declara "35 requisitos funcionales (RF-001 a RF-035)" y delega la especificación completa en `docs/memoria/07-requisitos.md` del repositorio. La memoria debe ser autocontenida; un tribunal no puede evaluar la trazabilidad RF→diseño→prueba con un resumen agrupado en un cuadro-imagen.

### 2.2 Defectos formales detectados

- **Bibliografía ausente.** `proyect.tex` declara `\bibliographystyle{apacite}` y `\bibliography{pfcbib}` (líneas 69–71) y existe `pfcbib.bib` con 160 líneas, pero el PDF compilado termina en la página 63 con el capítulo 9: BibTeX no se ejecutó (o falló) en `compilar-memoria.bat`. Además se usa `\nocite{*}` y hay **0 comandos `\cite`** en `Capitulos/`: aun arreglando la compilación, el texto seguiría sin citas en antecedentes, comparativa o estimación de costes. La sección 1.7 promete una bibliografía que no existe.
- **Todas las tablas son imágenes** (`diagramas/cuadros/*.png` insertadas con `\includegraphics`). Tipografía inconsistente con el cuerpo, contenido no buscable ni accesible, y mala calidad potencial en impresión. Cuadros 3.1, 4.1, 4.2, 5.1, 6.1–6.5 y 8.1–8.4: todos.
- **Sin glosario de acrónimos ni apéndices.** TFG con DRF, JWT, TSP, VRP, ILP, ORS, OCR, RNF, PYME, HMR... exige glosario. Los apéndices serían el lugar natural para el catálogo completo de RF/RNF/RN y la tabla completa de endpoints.
- **Extensión total justa.** 63 páginas de contenido para un proyecto de 325 h es poco; el desequilibrio del manual agrava la sensación. No se trata de inflar, sino de redistribuir.

---

## 3. Análisis de contenidos por capítulo

**Cap. 1 (Introducción).** Claro y bien delimitado. Objetivos específicos medibles y alcance/exclusiones explícitos: bien.

**Cap. 2 (Antecedentes).** Dos páginas, sin una sola referencia. Se afirma que "la inflación en alimentación ha incrementado la necesidad…" sin fuente; las "tres generaciones" de comparadores son una taxonomía propia presentada sin apoyo. Es el capítulo donde la ausencia de citas es más dañina.

**Cap. 3 (Comparativa).** Competidores citados sin URL, fecha de consulta ni criterio de selección. La matriz (Cuadro 3.1) es una imagen no verificable en el texto. El análisis de brechas, en cambio, está bien articulado.

**Cap. 4 (Planificación).** La sección 4.2 (metodología con agentes IA, planificación viva, registro de errores con reglas derivadas) es **la aportación más original de la memoria** y está bien escrita; un tribunal moderno la valorará muy positivamente, y es honesta respecto al reparto de responsabilidades humano/agente. Debilidades: la estimación de costes se apoya en un informe de perfiles TIC de la Junta de Andalucía **de 2018** (ocho años desfasado, y sin cita formal al carecer de bibliografía); y la contabilidad de horas no cuadra entre artefactos: memoria 325 h, `CLAUDE.md` ~330 h, cabecera de `TASKS.md` "~210 h / 300 h totales".

**Cap. 5 (Requisitos).** Correctos los actores y la intención, pero todo está resumido: ni los 35 RF, ni los 8 RNF, ni las 10 RN se enuncian individualmente. Los criterios de aceptación de 5.4 incluyen "optimización con top-3 rutas y desglose por parada" — criterio **que la implementación actual no cumple** (ver 4.B). Un capítulo de requisitos que fija criterios de aceptación incumplidos y no detectados en el capítulo de pruebas revela una rotura de trazabilidad precisamente donde la memoria presume de ella.

**Cap. 6 (Diseño e implementación).** El mejor planteado (decisiones justificadas, fragmentos de código, diagramas), pero es también donde se concentran las discrepancias con el código real (sección 4 de este informe). Dos observaciones adicionales: la etiqueta "arquitectura hexagonal (puertos y adaptadores)" es una sobreventa — lo implementado es una arquitectura en capas con capa de servicios por app Django, perfectamente defendible sin invocar a Cockburn; y el Cuadro 6.4 presenta "tiempos **estimados** de ejecución del optimizador" cuando, con el sistema desplegado y 55.000 precios sembrados, lo exigible son tiempos **medidos**.

**Cap. 7 (Manual).** Muy completo, capturas reales y de calidad, redacción cuidada. Pero 26 páginas en el cuerpo es excesivo: la mitad de las capturas (en particular las 8 de la sección 7.14 de escritorio, variantes de pantallas ya mostradas) debería migrar a un apéndice. Contiene además un error de fondo: describe "autenticación con correo electrónico y contraseña" cuando la app autentica por nombre de usuario (ver 4.E).

**Cap. 8 (Pruebas).** La estrategia (pirámide, E2E API-level para flujos mobile-only, UAT manual para GPS/cámara) está bien razonada y las cifras globales son verificables y exactas. Carencias: no se reporta la cobertura real por módulo (solo "≥80 %"), no hay métricas de rendimiento medidas contra RNF-001, y la validación de RNF-002 ("disponibilidad ≥ 99 % en staging") **no aporta ninguna medición**: describe la arquitectura y el health check, y resulta internamente contradictoria con la hibernación del free tier reconocida en 7.2 y 9.3. La afirmación de conformidad "WCAG 2.1 AA" (RNF-004) se valida únicamente contando taps; una auditoría AA exige contraste, foco, lectores de pantalla, etc. O se audita o se rebaja la afirmación.

**Cap. 9 (Conclusiones).** Honesto (limitaciones reales, incluido el reconocimiento de que RNF-005 no tiene load test). Bien. Pero arrastra el error de las "cuatro cadenas" de scraping (ver 4.K) y propone como trabajo futuro incorporar Alcampo, cuyo spider existe en el repositorio desde marzo de 2026.

---

## 4. Contraste memoria ↔ implementación

### 4.1 Afirmaciones verificadas como CORRECTAS

Para que conste en acta, estas afirmaciones se contrastaron y son exactas:

- 333 tests backend en `backend/tests/` (recuento exacto de funciones `test_`), 111 casos Jest en frontend (recuento exacto), 4 specs E2E (`auth`, `business`, `ocr`, `optimizer`), cobertura mínima del 80 % **forzada en CI** (`--cov-fail-under=80` en `ci-backend.yml`).
- Throttling: `assistant` 30/h y `ocr` 60/h (`base.py`); ventana deslizante de 20 mensajes en el asistente (`MAX_MESSAGES = 20`); `gemini-2.0-flash-lite` como modelo del asistente.
- `expire_stale_prices` (horaria), `deactivate_expired_promotions`, alertas de precio cada 30 min: existen en `CELERY_BEAT_SCHEDULE`.
- Modelo del optimizador con `OptimizationResult`, `OptimizationRouteStop`, `OptimizationRouteStopItem` (+ `ShoppingListSemanticPreference`): correcto.
- `TrigramSimilarity` con umbral 0,3 y extensión `pg_trgm` con índice GIN: correcto.
- ORS matrix `driving-car` con fallback haversine (`distance.py`): correcto, incluida la URL del endpoint.
- Google Vision en `ocr/services.py` con alias de idiomas estilo Tesseract→BCP-47: correcto.
- Formato de respuesta `{success, data}` y exception handler propio (`apps/core`): correcto. Health check en `/api/v1/health/`: correcto.
- Nginx + Gunicorn 3 workers en `docker-compose.yml`; `render.yaml` y `render.free.yaml`: correcto.
- Capa web: `useBreakpoint`, `webExport.ts` (con guard de inyección de fórmulas CSV), `linking.ts`, `MasterDetailLayout`, `WebTooltip`, tokens en SecureStore: todo existe.
- ADRs 001–011 existen, incluido el ADR-010 citado para Live Activities.

Esta exactitud en lo verificable hace **más llamativas** las discrepancias siguientes.

### 4.2 Discrepancias GRAVES

**A. Bibliografía ausente y cero citas.** Detallado en 2.2. Es el defecto más urgente de todo el documento.

**B. El algoritmo descrito (6.5) no es el implementado.** La memoria describe: pre-filtrado a 30 tiendas, generación de combinaciones C(30,3)=4.060, asignación greedy *por combinación*, scoring de asignaciones con la fórmula (6.1) normalizando el ahorro frente a `coste_single_best`, y salida **top-3 rutas** (afirmado también en 5.4 como criterio de aceptación y en 6.10.2 como "cards comparativas de las top-3 rutas"). El código real (`optimizer/services/solver.py` + `matching.py`) hace otra cosa: resuelve cada ítem por trigram (top-20) → fuzzy `token_set_ratio` (top-3 candidatos) → elige el más barato con bonus semántico; con las tiendas resultantes construye **una única ruta** ordenada con el routing solver de OR-Tools (estrategia `PATH_CHEAPEST_ARC`, límite 5 s), normalizando ahorro/distancia/tiempo por máximos, no según la fórmula (6.1). No hay pre-filtrado a 30 tiendas ni evaluación de combinaciones ni top-3. El propio manual (7.10) y `RouteScreen` muestran una sola ruta, contradiciendo el capítulo de diseño dentro de la misma memoria. Tratándose de la "aportación técnica central del TFG", esta divergencia es la más peligrosa en una defensa: dos preguntas de tribunal bastan para evidenciarla.

**C. OR-Tools como ILP (6.5.5).** Se afirma resolver la asignación "como programación lineal entera (ILP), garantizando la optimalidad". No existe `pywraplp` en el código; se usa `pywrapcp` (routing/constraint solver) solo para **ordenar paradas**, con heurística y time limit — que por definición no garantiza optimalidad. La asignación producto→tienda es greedy.

**D. Rendimiento del optimizador (6.5.6).** Se atribuye el cumplimiento del umbral de 5 s a "caché de matriz de distancias en Redis" y "ejecución como tarea Celery asíncrona". Ninguna de las dos cosas existe: `distance.py` no usa caché alguna y `OptimizeView` ejecuta la optimización **síncronamente** en el ciclo petición-respuesta.

**E. Autenticación (6.2.1 y 7.3).** La memoria afirma que `User` "extiende `AbstractBaseUser` para permitir el login mediante email". El modelo extiende `AbstractUser`, no hay `USERNAME_FIELD = "email"` ni `AUTHENTICATION_BACKENDS` por email, y el frontend (`authService.ts`, `LoginScreen.tsx`) envía `username`. El manual repite el error ("autenticación con correo electrónico"). Además, el snippet de validación de pesos mostrado en 6.2.1 (decimales que "deben sumar exactamente 1.0", validados en serializer) **no existe en el repositorio**: los pesos reales son `PositiveSmallIntegerField` 0–100 (defaults 34/33/33) sin validación de suma (solo un `help_text` "deben sumar ~100"). Presentar como propio un fragmento de código inexistente es especialmente delicado ante un tribunal.

**F. `ST_DWithin` (6.2.3).** La memoria dedica un párrafo a justificar el uso "deliberado" de `ST_DWithin` frente a `ST_Distance` por aprovechamiento del índice GiST. El código usa `location__distance_lte` en todos los puntos de búsqueda por radio (`stores/views.py:157`, `solver.py`); `dwithin` no aparece en ninguna parte del backend. La justificación de rendimiento descrita es exactamente la contraria a lo implementado.

**G. RNF-002 sin evidencia (8.7.1).** Se declara "disponibilidad ≥ 99 % en staging" validada "con evidencia real" (8.9), pero no hay ninguna medición de uptime, y la métrica es inalcanzable tal y como está definida en un free tier que hiberna (reconocido en 7.2 y 9.3). Contradicción interna.

### 4.3 Discrepancias MODERADAS

**H. JWT (6.3.3).** "Token de acceso de 60 minutos y refresco de 7 días": esos valores existen solo en `.env.example`; los defaults del código son **5 minutos y 30 días** (`base.py:192–197`). La afirmación es cierta solo si el despliegue define esas variables; la memoria lo presenta como propiedad del sistema.

**I. Scrapy → API REST (6.6).** "El scraper comunica con la base de datos a través de la API REST del propio backend": falso; `pipelines.py` hace `django.setup()` y escribe directamente por ORM.

**J. `check_competitor_prices` (6.4.2).** "Se ejecuta cada 6 horas": el beat schedule la programa **una vez al día** (crontab 08:00).

**K. Cobertura de scraping (6.6, 9.1, 9.3, 9.5).** La memoria dice 4 cadenas y propone Alcampo como trabajo futuro. El repositorio contiene **11 spiders** (incluido `alcampo.py`, commiteado el 2026-03-27, tres meses antes de compilar la memoria) y `CLAUDE.md` declara 11 cadenas. O bien hay 7 spiders muertos sin pruebas que deberían retirarse o declararse experimentales, o bien la memoria está desactualizada. En cualquier caso, memoria y repositorio se contradicen. (Solo 4 spiders están programados en Celery Beat, lo que sugiere que el "4" se refiere a los operativos: dígase así.)

**L. Workflows CI/CD (6.9.2).** "Tres workflows": hay **cinco** (faltan `cd-render-staging.yml` y `deploy-web-gh-pages.yml`, ambos relevantes pues sostienen el despliegue público que la memoria sí describe).

### 4.4 Discrepancias MENORES

- 16 suites Jest declaradas; hay 15 ficheros de test (los 111 casos sí son exactos).
- `apps/optimizer/services.py` citado como módulo; es el paquete `services/` (4 módulos).
- `similarity__gt=0.3` en el snippet; el código usa `__gte`.
- `semantic.py` usa por defecto `gemini-3-flash-preview` mientras ADR-008 y la memoria hablan de `gemini-2.0-flash-lite`: dos modelos distintos conviven sin que la memoria lo mencione.
- "Pre-filtrado de tiendas" y constante "30": no existen en el código (ya cubierto en B, se lista aquí como recordatorio de limpieza).

---

## 5. Juicio sobre la calidad académica

La redacción es profesional, sin erratas relevantes, con buen castellano técnico y una voz consistente; el resumen/abstract bilingüe es correcto; las figuras de capturas son reales y de calidad. La honestidad del capítulo de limitaciones es un punto fuerte que conviene conservar.

El problema de fondo es de **rigor documental**: la memoria parece haber sido redactada en parte contra una versión de diseño anterior (o aspiracional) del sistema y no auditada contra el código final antes de compilar. En un TFG cuya metodología presume —con razón— de trazabilidad y verificación, que el documento final contenga una docena de afirmaciones desmentidas por el propio repositorio es la inconsistencia más seria que un tribunal puede señalar.

---

## 6. Sugerencias de mejora priorizadas

### P0 — Bloqueantes (imprescindibles antes del depósito)

1. **Generar la bibliografía**: arreglar la cadena BibTeX en `compilar-memoria.bat` (pdflatex → bibtex → pdflatex ×2) y verificar que el PDF incluye el capítulo. Sustituir `\nocite{*}` por citas reales: como mínimo, antecedentes (cap. 2), competidores (cap. 3), informe de costes (cap. 4), y las herramientas/algoritmos citados (OR-Tools, PostGIS, WCAG, RGPD).
2. **Reescribir 6.5 para describir el algoritmo real** (resolución semántico-fuzzy por ítem → ruta única TSP con OR-Tools routing → normalización por máximos), o implementar lo descrito. Si se mantiene la ruta única: eliminar "top-3" de 5.4, 6.5.1, 6.5.3 y 6.10.2, y corregir la fórmula (6.1) para que coincida con `solver.py`. Documentar la capa semántica con Gemini (que el código sí tiene y la memoria apenas cuenta en diseño) como parte de la aportación: es valiosa.
3. **Corregir las afirmaciones falsas puntuales**: AbstractUser/login por username (o implementar login por email, que sería lo deseable de cara a la defensa, dado que el manual ya lo promete), snippet de pesos, ST_DWithin, caché Redis, ejecución síncrona, periodicidad de `check_competitor_prices`, JWT, pipeline Scrapy por ORM, número de workflows y de spiders.
4. **Resolver RNF-002**: o se instala monitorización (UptimeRobot u otro gratuito) y se reporta la medición real con su ventana temporal, o se redefine el requisito de forma alcanzable en free tier ("disponibilidad durante ventanas de evaluación") y se valida así.

### P1 — Importantes (afectan a la nota)

5. **Reequilibrar la memoria**: mover a apéndices el catálogo completo de RF-001..RF-035, RNF y RN (con tabla de trazabilidad RF→módulo→test) y la mitad de las capturas del cap. 7 (especialmente la sección 7.14). El cuerpo del cap. 5 debe enumerar al menos los requisitos críticos con su criterio de aceptación.
6. **Sustituir los cuadros-imagen por tablas LaTeX** (`tabular`/`booktabs`). Es trabajo mecánico y elimina un defecto visible en cada capítulo.
7. **Medir, no estimar**: rehacer el Cuadro 6.4 con tiempos reales del optimizador sobre los datos demo (55.000 precios), y añadir p95 de los endpoints CRUD contra RNF-001. El sistema desplegado lo permite con poco esfuerzo (script + `locust`/`hey` en local).
8. **Reportar la cobertura real por módulo** (tabla de `pytest --cov`) en 8.4.2, no solo el umbral.
9. **Añadir glosario de acrónimos** y, si la normativa lo permite, un apéndice con la tabla completa de endpoints.
10. **Rebajar o auditar la afirmación WCAG 2.1 AA**: con una pasada de axe/Lighthouse sobre la versión web ya se puede afirmar algo defendible.

### P2 — Deseables

11. Añadir un breve análisis legal-ético del scraping (robots.txt, condiciones de uso, RGPD sobre datos de ubicación) — tema de pregunta probable en defensa de un proyecto que scrapea supermercados.
12. Actualizar la referencia salarial de 2018 por una fuente reciente (convenio TIC o informes 2024–2025).
13. Unificar la contabilidad de horas (TASKS.md, CLAUDE.md, memoria) en una sola cifra.
14. Suavizar "arquitectura hexagonal" → "arquitectura en capas con capa de servicios"; o justificar puertos/adaptadores con ejemplos concretos.
15. Decidir el destino de los 7 spiders no programados: documentarlos como experimentales con sus limitaciones, o retirarlos.
16. Una pasada final de coherencia interna: que diseño (cap. 6), manual (cap. 7) y conclusiones (cap. 9) cuenten el mismo sistema.

---

## 7. Nota orientativa razonada

| Dimensión | Peso típico | Valoración |
|---|---|---|
| Complejidad y calidad técnica del proyecto | 35 % | 9,5 — alcance excepcional, verificado |
| Proceso de ingeniería (requisitos, pruebas, trazabilidad) | 25 % | 7 — proceso real excelente, pero mal reflejado en la memoria (requisitos resumidos, criterio de aceptación incumplido, RNF sin medición) |
| Memoria: rigor y fidelidad del contenido | 25 % | 4,5 — discrepancias graves con la implementación en el capítulo central, sin citas |
| Memoria: forma académica (estructura, bibliografía, tablas) | 15 % | 4 — sin bibliografía, tablas como imágenes, desequilibrio |

**Resultado ponderado ≈ 6,5/10 en el estado actual.** Corrigiendo P0 (una semana de trabajo concentrado, siendo realista) el documento pasaría a la franja 8,5–9; con P1 completo, 9–10. La defensa oral, dado el dominio del autor sobre el sistema y la metodología de proceso documentada, puede sumar — siempre que las inconsistencias señaladas se hayan eliminado antes, porque son exactamente el tipo de detalle que un vocal técnico comprueba en vivo.

---

*Informe generado mediante revisión cruzada automatizada y manual de `proyect-final.pdf` contra el repositorio en su estado de 2026-06-12. Cada discrepancia citada incluye la ruta del fichero que la evidencia.*
