# Script de Defensa — BarGAIN: Optimización Inteligente de la Compra

**Autor:** Nicolás Parrilla Geniz  
**Tutor:** Juan Vicente Gutiérrez Santacreu  
**Grado en Ingeniería Informática — Ingeniería del Software**  
**ETSII, Universidad de Sevilla**  
**Duración estimada:** 20–25 minutos

---

## DIAPOSITIVA 1 — Portada (0:00 – 0:30)

*[Pausa inicial. Respirar. Contacto visual con el tribunal.]*

Buenos días, miembros del tribunal. Mi nombre es Nicolás Parrilla Geniz y hoy les presento mi Trabajo Fin de Grado: **BarGAIN — Optimización Inteligente de la Compra**, dirigido por el profesor Juan Vicente Gutiérrez Santacreu del Departamento de Matemática Aplicada I.

---

## DIAPOSITIVA 2 — El Problema (0:30 – 2:00)

Quiero empezar con una pregunta sencilla: ¿cuántas veces han ido al supermercado pensando que compraban al mejor precio, solo para descubrir después que el mismo producto costaba menos en la tienda de al lado?

Esto no es anecdótico. En España, el gasto medio por hogar en alimentación supera los **3.640 euros anuales** — aproximadamente un 15% del consumo total. La diferencia de precios entre el supermercado más caro y el más barato para una misma cesta puede alcanzar hasta un **40%**.

El problema tiene tres dimensiones. Primero, existe una **asimetría de información**: los precios cambian constantemente y no hay una fuente centralizada que los reúna todos. Segundo, el **coste temporal**: comparar manualmente ofertas entre folletos y aplicaciones consume de media unos 47 minutos semanales por hogar. Y tercero, la **ineficiencia logística**: desplazarse a múltiples tiendas tiene un coste en tiempo, combustible y esfuerzo que muchas veces supera el ahorro conseguido.

En un contexto donde la inflación acumulada en alimentación entre 2021 y 2024 fue del **34,2%**, y donde el 68% de los hogares españoles cambió sus hábitos de compra, este problema se ha vuelto especialmente relevante.

---

## DIAPOSITIVA 3 — ¿Qué existe hoy? (2:00 – 3:30)

Analicé las soluciones disponibles en el mercado español: Soysuper, OCU Market, RadarPrice, PreciRadar, entre otras. Todas ofrecen comparación de precios, pero ninguna resuelve el problema completo.

Ninguna optimiza **rutas multi-parada**. Ninguna pondera **precio, distancia y tiempo** de forma conjunta. Ninguna integra **OCR** para digitalizar listas escritas a mano. Ninguna incluye un **asistente conversacional** basado en IA. Y, algo que considero especialmente relevante: ninguna incluye al **comercio local** en la ecuación, dejando a las PYMEs fuera de la competición.

Aquí es donde nace BarGAIN.

---

## DIAPOSITIVA 4 — La Solución: BarGAIN (3:30 – 5:00)

BarGAIN es una aplicación web y móvil de **compra inteligente** que optimiza la cesta de la compra del usuario cruzando tres variables: **precio, distancia y tiempo** entre múltiples supermercados y comercios locales.

El sistema no solo te dice dónde es más barato cada producto — eso ya lo hacen otros. BarGAIN calcula **la combinación óptima de tiendas** que debes visitar para maximizar tu ahorro real, teniendo en cuenta cuánto te cuesta llegar a cada una.

Para conseguirlo, integra cuatro pilares tecnológicos: un sistema de **ingestión automatizada de precios** mediante web scraping, un **algoritmo de optimización multicriterio** con cálculos geoespaciales, un módulo de **visión por computador (OCR)** para digitalizar listas y tickets, y un **asistente conversacional con LLM** que entiende consultas en lenguaje natural sobre tu compra.

---

## DIAPOSITIVA 5 — Objetivos (5:00 – 6:00)

El objetivo principal es desarrollar una aplicación que calcule la combinación óptima de supermercados y comercio local ofreciendo la mejor relación precio-distancia-tiempo.

Como objetivos específicos, destaco diez, agrupados en cuatro áreas: **datos** (sistema de ingestión de precios y OCR), **inteligencia** (algoritmo de optimización y asistente LLM), **inclusión** (portal para PYMEs), y **calidad** (API documentada, cobertura de tests superior al 80%, CI/CD automatizado, y validación con usuarios reales).

---

## DIAPOSITIVA 6 — Arquitectura del Sistema (6:00 – 8:00)

La arquitectura sigue un modelo de **tres capas** con principios de arquitectura hexagonal, todo contenido en un sistema containerizado con Docker.

En la **capa de datos**, usamos PostgreSQL 16 con la extensión PostGIS 3.4 para cálculos geoespaciales nativos. Esto nos permite realizar consultas como "todas las tiendas en un radio de 5 km" directamente en SQL, con índices GiST que hacen estas operaciones eficientes incluso con miles de registros.

La **capa de API** está construida con Django 5 y Django REST Framework. El backend se organiza en **9 aplicaciones de dominio**: users, products, stores, prices, scraping, shopping_lists, optimizer, ocr, assistant — más el portal business y notifications. Cada aplicación sigue una separación clara: modelos, serializers, vistas, y una **capa de servicios** que desacopla la lógica de negocio.

La **capa de procesamiento asíncrono** utiliza Celery con Redis como broker. Aquí se ejecutan las tareas pesadas: scraping periódico, procesamiento OCR, cálculo de rutas óptimas y envío de notificaciones push.

El **frontend** es una aplicación React Native con Expo para iOS y Android, que comparte código con una versión web React para el portal de PYMEs. La gestión de estado usa Zustand por su simplicidad y la capa HTTP se apoya en Axios con interceptores JWT.

---

## DIAPOSITIVA 7 — El Corazón del TFG: El Algoritmo de Optimización (8:00 – 11:00)

*[Esta es la diapositiva central — dedicarle más tiempo.]*

Este es el núcleo del trabajo. El algoritmo pondera tres variables para encontrar la combinación óptima de tiendas:

La **función de scoring** es: Score = w_precio × ahorro_normalizado − w_distancia × distancia_extra − w_tiempo × tiempo_extra. Los pesos w los configura el usuario según sus prioridades: alguien puede preferir ahorrar el máximo posible aunque implique desplazarse más, mientras que otro usuario priorizará la comodidad.

El proceso tiene cinco pasos. **Primero**, se recopilan los precios de todos los productos de la lista en las tiendas dentro del radio configurado, usando consultas geoespaciales con PostGIS. **Segundo**, se generan combinaciones candidatas de tiendas, limitadas a un máximo de 3-4 paradas para mantener la practicidad. **Tercero**, para cada combinación se calcula la distancia y tiempo real usando OpenRouteService, con OR-Tools de Google resolviendo el problema de enrutamiento de vehículos (VRP) para optimizar el orden de las paradas. **Cuarto**, se aplica la función de scoring multicriterio. **Quinto**, se devuelven las top-3 rutas ordenadas por score, con desglose detallado del ahorro.

El usuario puede elegir entre tres modos predefinidos — priorizar precio, tiempo, o un balance equilibrado — o ajustar manualmente los pesos con sliders. El recálculo se realiza en menos de 5 segundos.

---

## DIAPOSITIVA 8 — Ingestión de Precios: Web Scraping (11:00 – 12:30)

Para que el algoritmo funcione, necesitamos datos de precios actualizados. Implementamos un sistema de scraping con Scrapy y Playwright que cubre **9 cadenas de supermercados**: Mercadona, Carrefour, Lidl, DIA, Alcampo, y más.

El pipeline incluye normalización de nombres de productos mediante matching difuso con índices trigram en PostgreSQL, seguimiento del origen de cada precio, y un sistema de TTL: los precios de scraping expiran a las 48 horas, los de crowdsourcing a las 24 horas.

Todo se ejecuta de forma asíncrona mediante tareas Celery programadas con Celery Beat, respetando siempre robots.txt y con delays de cortesía.

---

## DIAPOSITIVA 9 — Visión por Computador: OCR (12:30 – 14:00)

Una barrera importante para el usuario es tener que escribir manualmente su lista de la compra. Con el módulo OCR, el usuario simplemente **fotografía una lista escrita a mano o un ticket** y el sistema la digitaliza automáticamente.

La imagen se envía al backend, que la procesa con **Google Cloud Vision API**. El texto extraído se analiza para identificar productos y cantidades, y luego se aplica **matching difuso** contra nuestro catálogo normalizado. Cada producto detectado incluye un score de confianza, y el usuario puede revisar y corregir antes de confirmar.

Elegimos Google Vision API tras descartar Tesseract en pruebas locales, donde la precisión en tickets de supermercado reales — con fuentes térmicas degradadas — era insuficiente. Esta decisión está documentada en nuestra ADR-007.

---

## DIAPOSITIVA 10 — Asistente Conversacional con LLM (14:00 – 15:30)

El asistente permite al usuario hacer consultas en lenguaje natural como "¿Dónde compro los ingredientes para una paella para 10 personas al mejor precio?" o "¿Qué tiendas tienen ofertas en lácteos esta semana?".

Se implementa mediante un **patrón de proxy backend** — el frontend nunca se comunica directamente con la API de Gemini. Las peticiones pasan por nuestro backend, que enriquece el contexto con datos reales de precios, tiendas y la lista del usuario, implementando un patrón tipo **RAG** (Retrieval-Augmented Generation).

Usamos **Gemini 2.0 Flash** por su velocidad de respuesta. El asistente está restringido al dominio de la compra, tiene rate limiting de 30 peticiones/hora por usuario, y mantiene un historial conversacional de los últimos 20 mensajes.

---

## DIAPOSITIVA 11 — Portal para PYMEs (15:30 – 16:30)

Un diferenciador clave de BarGAIN es la **inclusión del comercio local**. Las PYMEs y comercios de barrio pueden registrarse, verificar su identidad fiscal, y publicar sus precios y promociones para competir en igualdad de condiciones con las grandes cadenas.

El portal ofrece gestión de precios individual y por CSV, creación de promociones temporales, y un dashboard de analíticas. Los precios publicados por PYMEs verificadas reciben la máxima prioridad en nuestro sistema, por encima incluso del scraping.

---

## DIAPOSITIVA 12 — Demo / Interfaz de Usuario (16:30 – 18:30)

*[Si hay demo en vivo, ejecutarla aquí. Si no, mostrar capturas.]*

Permítanme mostrarles el flujo principal. El usuario abre la app, crea una lista de la compra — puede escribir los productos manualmente, usar el OCR para fotografiar una lista, o pedirle al asistente que le sugiera los ingredientes para una receta.

Una vez configurada la lista, accede al optimizador, ajusta sus preferencias de precio, distancia y tiempo, y en menos de 5 segundos obtiene las mejores rutas. Cada ruta muestra las paradas en el mapa, qué productos comprar en cada tienda, los subtotales, y el ahorro total comparado con comprar todo en una sola tienda.

El mapa utiliza React Native Maps con marcadores diferenciados por cadena, y la navegación entre pantallas es fluida gracias a React Navigation.

---

## DIAPOSITIVA 13 — Metodología y Planificación (18:30 – 19:30)

El proyecto se desarrolló en **7 fases** siguiendo una adaptación de metodología ágil con sprints de 2 semanas:

- **F1** (Análisis y Diseño): Requisitos, comparativa, arquitectura, diagramas UML
- **F2** (Infraestructura): Docker, CI/CD con GitHub Actions, scaffolding
- **F3** (Backend Core): 9 módulos de dominio, 179 tests, API documentada
- **F4** (Frontend): Todas las pantallas principales, navegación, mapas
- **F5** (IA y Optimización): OCR, OR-Tools, Gemini, 9 spiders de scraping
- **F6** (Testing y Despliegue): Tests E2E con Playwright, UAT, deploy en Render
- **F7** (Cierre): Memoria, presentación, demo

Se completó en **325 horas** frente a las 300 planificadas, absorbiendo el cierre documental y la preparación de la defensa.

**Punto diferenciador a remarcar ante el tribunal:** el proyecto se construyó con un flujo de desarrollo asistido por agentes de IA gobernado por el método **GSD**, con todo el proceso versionado en el propio repositorio. Tres ideas clave que conviene verbalizar:

1. **Planificación viva y auditable**: el árbol `.planning/` (PROJECT, ROADMAP, STATE y fases con criterios de cierre) y `TASKS.md` actúan como fuente de verdad sincronizada con GitHub Issues y Notion; cada commit referencia su tarea (`feat(optimizer): ... (F5-06)`), de modo que cualquier línea de código es trazable hasta el requisito que la motivó.
2. **Agentes con contrato de contexto**: `CLAUDE.md` define convenciones, reglas de negocio y protocolo obligatorio para cualquier agente (Claude, Copilot, Codex), y `docs/ai-prompts/` versiona los prompts de inicio/cierre/revisión de tarea — el equivalente a *runbooks* de ingeniería.
3. **Mejora continua verificable**: `docs/ai-mistakes-log.md` registra cada error cometido por un agente junto con su causa raíz y una **regla derivada** que los agentes releen antes de cada tarea; los errores no se repiten porque el proceso aprende.

Si el tribunal pregunta por el papel de la IA: la IA ejecuta, pero el proceso —fases, criterios de aceptación, verificación y evidencias— está diseñado y supervisado por el autor, y es completamente reproducible por un tercero clonando el repositorio.

---

## DIAPOSITIVA 14 — Calidad y Testing (19:30 – 20:30)

La estrategia de testing cubre tres niveles. **Tests unitarios** con pytest para la lógica de negocio de cada módulo. **Tests de integración** para flujos completos de API. Y **tests end-to-end** con Playwright para los 4 flujos críticos: autenticación, portal business, optimizador y OCR.

La cobertura del backend supera el **80%**. El CI/CD con GitHub Actions ejecuta automáticamente tests y lint en cada push. La API responde en menos de **500ms en el percentil 95**, y el cálculo de rutas se completa en menos de 5 segundos.

Se realizaron pruebas de aceptación con usuarios reales en dispositivos iPhone y Android, verificando la usabilidad de los flujos principales.

---

## DIAPOSITIVA 15 — Matriz Competitiva (20:30 – 21:30)

Si comparamos BarGAIN con las soluciones existentes, la diferenciación es clara.

Soysuper, OCU Market, RadarPrice y PreciRadar ofrecen comparación básica de precios. Pero **ninguna** incluye optimización de rutas multi-parada, ponderación precio-distancia-tiempo, OCR para listas, portal PYME, ni asistente conversacional. BarGAIN es la **única** solución en España que integra estas cinco capacidades en una sola plataforma.

---

## DIAPOSITIVA 16 — Conclusiones (21:30 – 23:00)

Para concluir, quisiera destacar tres ideas principales.

**Primera**: BarGAIN demuestra que es posible construir un sistema completo de optimización de la compra que va más allá de la simple comparación de precios, integrando inteligencia geoespacial, visión por computador e inteligencia artificial conversacional.

**Segunda**: el enfoque de inclusión del comercio local a través del portal para PYMEs abre una vía de modelo de negocio sostenible que además contribuye a la economía de proximidad.

**Tercera**: desde el punto de vista de ingeniería del software, el proyecto aplica de forma rigurosa las prácticas del estado del arte: arquitectura modular, testing automatizado multinivel, CI/CD, documentación exhaustiva con ADRs, y un proceso de desarrollo trazable de principio a fin.

---

## DIAPOSITIVA 17 — Trabajo Futuro (23:00 – 24:00)

Como líneas de trabajo futuro, identifico: la publicación en App Store y Google Play, la ampliación de cobertura de scraping a más cadenas, la integración de APIs oficiales de precios cuando estén disponibles, la implementación de tiers premium para el modelo de negocio B2B, y la posible expansión internacional — la arquitectura está preparada para ello.

---

## DIAPOSITIVA 18 — Cierre (24:00 – 25:00)

*[Pausa. Contacto visual.]*

En resumen, BarGAIN transforma la compra diaria de una tarea ineficiente en una decisión optimizada, poniendo en manos del consumidor una herramienta que hasta ahora no existía en el mercado español.

Muchas gracias por su tiempo y su atención. Quedo a su disposición para cualquier pregunta.

*[Sonreír. Esperar las preguntas con calma.]*

---

## NOTAS PARA LA DEFENSA

### Preguntas frecuentes anticipadas

1. **¿Por qué Django y no FastAPI/Node?** → Madurez del ecosistema GIS (django.contrib.gis), ORM robusto, excelente soporte de testing, y comunidad amplia. Documentado en ADR-001.

2. **¿Cómo se escala el sistema?** → API stateless, workers Celery independientes, PostgreSQL con réplicas de lectura. La arquitectura está diseñada para escalar horizontalmente.

3. **¿Qué pasa si el scraping falla?** → Sistema de fallback: API oficial > Scraping > Business > Crowdsourcing. TTLs garantizan que no se usen precios obsoletos.

4. **¿Cómo se maneja la privacidad de la ubicación?** → Datos encriptados en reposo, HTTPS obligatorio, la ubicación solo se usa para cálculos geoespaciales y nunca se comparte.

5. **¿Por qué OR-Tools y no un algoritmo propio?** → OR-Tools es una librería probada en producción por Google. El valor del TFG está en la integración de dominio, no en reinventar el VRP.

6. **¿Qué precisión tiene el OCR?** → Objetivo ≥75% en listas manuscritas. Google Vision supera ampliamente a Tesseract en texto degradado de tickets térmicos.

7. **¿Cómo se evita el abuso del LLM?** → Rate limiting (30 req/hora), restricción de dominio (solo consultas de compra), proxy backend que controla el contexto enviado a Gemini.
