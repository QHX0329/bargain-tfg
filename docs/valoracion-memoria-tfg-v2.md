# Valoración de la memoria del TFG «BarGAIN» — Segunda revisión (post-correcciones)

> **Rol del revisor:** catedrático de Ingeniería del Software actuando como miembro de tribunal estricto.
> **Documento evaluado:** `proyect-final.pdf` regenerado el 2026-06-12 (86 páginas, compilado con la cadena completa pdflatex → bibtex → pdflatex ×2, **cero errores**).
> **Antecedente:** primera revisión en `docs/valoracion-memoria-tfg.md` (nota orientativa 6,5/10). Esta segunda revisión evalúa la memoria tras aplicar el plan completo de correcciones P0/P1/P2 y vuelve a contrastar el texto con el código del repositorio.

---

## 1. Veredicto global

La memoria ha pasado de ser el punto débil del TFG a estar a la altura del proyecto que documenta. Las tres objeciones de fondo de la primera revisión —ausencia total de bibliografía, capítulo del algoritmo que describía un diseño no implementado, y acumulación de afirmaciones desmentidas por el código— **han sido resueltas y verificadas una a una contra el repositorio**. Igual de relevante: las correcciones no maquillan las carencias reales del trabajo, sino que las acotan con honestidad (validaciones no funcionales pendientes, spiders no operativos, `ROBOTSTXT_OBEY` desactivado), que es exactamente lo que un tribunal espera de un documento de ingeniería.

**Nota orientativa actualizada: 8,5–9 sobre 10.** Con una defensa oral sólida, el conjunto es candidato razonable a sobresaliente; la franja de Matrícula de Honor queda al alcance si se atacan los puntos restantes de la sección 4.

---

## 2. Verificación de las correcciones (contraste con el código)

Cada corrección se ha vuelto a comprobar contra la implementación. Estado:

| # | Defecto señalado en la 1.ª revisión | Estado | Verificación |
|---|---|---|---|
| A | Sin bibliografía ni citas | **Resuelto** | Capítulo «Referencias» presente (estilo APA); 32 entradas en `pfcbib.bib`; citas autor-año en antecedentes, comparativa, costes, diseño y pruebas. `\nocite{*}` eliminado. La cadena BibTeX se añadió también a `compilar-memoria.ps1`, con verificación del `.bbl` |
| B | Algoritmo descrito ≠ implementado | **Resuelto** | La sección 6.5 describe ahora el pipeline real verificado en `matching.py`/`semantic.py`/`distance.py`/`solver.py`: resolución semántico-difusa por ítem (trigram top-20, Gemini con fallback heurístico, top-12 candidatos, tolerancia 0,08), consolidación de paradas, matriz ORS, TSP con OR-Tools (`PATH_CHEAPEST_ARC`, límite 5 s) y fórmula de coste de arco coincidente con `solve_route()`. Eliminado todo rastro de «top-3», C(30,3) e ILP |
| C | «Top-3 rutas» en objetivos, criterios de aceptación y UI | **Resuelto** | Criterio 5.4 y RF-024 reformulados (ruta recomendada + desambiguación semántica); el cambio de diseño se documenta en una subsección propia («Evolución respecto al diseño inicial») y las rutas alternativas pasan a trabajo futuro. `docs/memoria/07-requisitos.md` sincronizado |
| D | Caché Redis y ejecución Celery del optimizador (inexistentes) | **Resuelto** | Sustituido por la realidad: ejecución síncrona con cotas por construcción (tabla de salvaguardas verificable en código) y nota de que Celery/caché son evolución futura |
| E | `AbstractBaseUser` + login por email | **Resuelto** | Texto corregido a `AbstractUser` + login por nombre de usuario (coincide con `models.py`, `authService.ts`, `LoginScreen.tsx`); manual (7.3) y RI-001/RF-002 alineados |
| F | Snippet de validación de pesos inexistente | **Resuelto** | Sustituido por el campo real (`PositiveSmallIntegerField`, defaults 34/33/33) y la renormalización real del serializer del optimizador (división por la suma) |
| G | `ST_DWithin` «deliberado» (el código usa `distance_lte`) | **Resuelto** | Snippet real con `location__distance_lte`; `dwithin` reposicionado honestamente como optimización futura |
| H | `check_competitor_prices` «cada 6 horas» | **Resuelto** | «Una vez al día (08:00)», coincide con el beat schedule |
| I | JWT 60 min/7 días como propiedad fija | **Resuelto** | Explicado como configuración por entorno (referencia 60/7; defaults de código 5 min/30 días), con rotación y blacklist citando simplejwt |
| J | Scraper «vía API REST» | **Resuelto** | Descripción real: `PriceUpsertPipeline` + `django.setup()` + ORM |
| K | 4 cadenas vs 11 spiders; Alcampo como «futuro» | **Resuelto** | «Once spiders implementados, cuatro en operación programada (06:00–07:30)»; limitación y trabajo futuro reescritos en coherencia |
| L | «Tres workflows» (hay cinco) | **Resuelto** | Los cinco descritos, incluidos `cd-render-staging` y `deploy-web-gh-pages` |
| M | RNF-002 «≥99 % con evidencia real» sin medición | **Resuelto** | Alcance redefinido con franqueza: disponibilidad funcional verificada en ventanas de evaluación; el 99 % declarado no medible en free tier; monitorización como trabajo pendiente |
| N | WCAG 2.1 AA «validado» contando taps | **Resuelto** | Verificación declarada como heurística; auditoría formal identificada como tarea previa a publicación |
| O | Tablas como imágenes (13 cuadros PNG) | **Resuelto** | Todas convertidas a tablas LaTeX (booktabs/longtable). Al transcribirlas se detectaron y corrigieron **dos errores adicionales que la 1.ª revisión no pudo ver dentro de los PNG**: la paleta de colores no era la real (la implementada es «Mercado Mediterráneo», `#E8541A`, no la verde del cuadro) y la tipografía no es Inter (Fraunces + Source Sans 3 / SF Pro); los endpoints de los cuadros antiguos (`/auth/login/`, `/users/me/`, `/assistant/conversations/`) tampoco existían y se han sustituido por los reales (`/auth/token/`, `/auth/profile/`, `/assistant/chat/`); los índices de BD ficticios se reemplazaron por los tres reales |
| P | Requisitos no enumerados; sin apéndices ni glosario | **Resuelto** | Apéndice A (RI, RF-001..035, RNF, RN y tabla de trazabilidad dominio–módulo–suite), Apéndice B (endpoints completos, verificados contra `urls.py`), Apéndice C (capturas de escritorio reubicadas), glosario de acrónimos al frente |
| Q | Sin análisis legal del scraping | **Resuelto** | Subsección 6.6.1 con RGPD, LSSI-CE, RFC 9309, y reconocimiento explícito de que `ROBOTSTXT_OBEY` está desactivado con su plan de corrección |
| R | Horas inconsistentes (325/330/210) | **Resuelto** | 325 h unificadas en memoria, `CLAUDE.md` y `TASKS.md` |
| S | 16 suites Jest (eran 15) | **Resuelto** | 15 suites en los tres lugares donde aparece |
| T | Cobertura «≥80 %» sin detalle | **Resuelto** | Umbral documentado como bloqueante en CI (`--cov-fail-under=80`) y distribución real de los 162 tests unitarios por módulo (recuento verificado archivo a archivo) |

Verificación negativa: una búsqueda de los términos problemáticos («top-3 rutas», «hexagonal», «AbstractBaseUser», «cada 6 horas», «tres workflows», «caché de matriz», «Inter», «dwithin=» en snippets) sobre el texto extraído del PDF final **no devuelve ninguna ocurrencia**.

---

## 3. Estructura y forma tras la revisión

El documento pasa de 73 a 86 páginas con mejor reparto: el manual baja de 26 a 23 páginas (las 6 figuras de escritorio migran al Apéndice C), requisitos gana enunciado de RNF en el cuerpo y catálogo completo en apéndice, y el bloque final añade 8 páginas de apéndices útiles más 2 de referencias. El frontal incorpora glosario de acrónimos. Todas las tablas son ahora nativas (buscables, tipográficamente coherentes), las citas son autor-año consistentes y la numeración de cuadros/figuras se regenera sin referencias rotas (compilación con cero errores y cero `undefined`). Se corrigió además un conflicto de orden de carga apacite/hyperref en `pclass.cls` que impedía compilar con citas.

La nueva subsección «Evolución respecto al diseño inicial» merece mención: convierte la mayor debilidad del documento (un diseño descrito que no era el implementado) en una decisión de ingeniería argumentada con criterio de producto. Lo mismo vale para el tratamiento de RNF-002/RNF-004 y del scraping: el documento ya no afirma de más, y eso lo hace defendible pregunta a pregunta.

---

## 4. Debilidades que persisten (y cómo afectan a la nota)

Como tribunal estricto, lo que sigue separando este trabajo del 10:

1. **Estado del arte fino (caps. 2–3).** Ahora hay citas, pero siguen siendo ~4 páginas sin literatura académica específica (optimización de cestas multi-tienda, comparadores de precios, sistemas de recomendación en retail). Findit, PreciRadar y RadarPrice continúan sin referencia verificable. Es la carencia académica más visible que queda.
2. **RNF-001 sin medición empírica.** La garantía «por construcción» es razonable y está bien argumentada, pero con un sistema desplegado y 55.000 precios sembrados, una tabla de latencias medidas (aunque fuera en local) habría costado poco y cerraría la pregunta obvia del tribunal. Es la mejora pendiente de mejor relación esfuerzo/beneficio.
3. **El catálogo de RF del Apéndice A es sintético** (una línea por requisito). Correcto como memoria autocontenida, pero el enunciado normativo completo sigue solo en el repositorio. Un tribunal formalista puede pedirlo íntegro.
4. **Desajustes producto-diseño documentados pero no corregidos en código:** login por username mientras el registro pide email (UX mejorable), `ROBOTSTXT_OBEY=False`, siete spiders sin operación. La memoria ya es honesta al respecto; el código sigue debiendo esas tareas.
5. **El manual sigue siendo el capítulo más largo** (23 págs., ~36 % del cuerpo). Ya no es escandaloso, pero el lector académico seguirá notando el sesgo descriptivo frente al analítico.
6. **La referencia salarial de 2018** se mantiene (ahora citada y justificada como cota conservadora). Defendible, pero una fuente 2024–2025 la sustituiría con ventaja.

Ninguno de estos puntos es un defecto de veracidad; son límites de profundidad y alcance, que es una categoría mucho menos grave.

---

## 5. Nota orientativa razonada

| Dimensión | Peso | 1.ª revisión | Ahora | Justificación del cambio |
|---|---|---|---|---|
| Complejidad y calidad técnica del proyecto | 35 % | 9,5 | 9,5 | Sin cambios en el código evaluado |
| Proceso de ingeniería (requisitos, pruebas, trazabilidad) | 25 % | 7 | 8,5 | Catálogo y trazabilidad en la memoria; criterios de aceptación coherentes con lo implementado; validaciones pendientes acotadas en lugar de sobrevendidas |
| Memoria: rigor y fidelidad del contenido | 25 % | 4,5 | 9 | Todas las discrepancias verificadas como resueltas; el documento describe el sistema que existe |
| Memoria: forma académica | 15 % | 4 | 8 | Bibliografía y citas reales, tablas nativas, glosario, apéndices; resta profundidad de estado del arte |

**Resultado ponderado ≈ 8,9 → nota orientativa 8,5–9.** El medio punto final depende de la defensa y de si se ataca el punto 4.2 (medir latencias) antes del depósito.

---

## 6. Recomendación final

La memoria está en condiciones de depósito. Si se dispone de una semana adicional, el orden de ataque con mejor retorno es: (1) medir y reportar latencias reales del optimizador y los endpoints CRUD contra los datos demo; (2) ampliar el capítulo 2 con 4–6 referencias académicas pertinentes; (3) activar `ROBOTSTXT_OBEY` y programar al menos un spider adicional, actualizando la limitación correspondiente. Con eso, este revisor defendería la franja 9,5–10.

---

*Segunda revisión generada el 2026-06-12 tras aplicar y verificar el plan de correcciones completo. El PDF evaluado es `memoriaTFG/Plantilla TfG/proyect-final.pdf` (86 páginas) compilado sin errores con bibliografía incluida.*
