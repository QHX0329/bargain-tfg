# 3. Antecedentes y Estado del Arte

## 3.1 Contexto del mercado de la distribución alimentaria en España

El mercado de la distribución alimentaria en España constituye uno de los sectores económicos más activos y competitivos del país. Según datos del Ministerio de Agricultura, Pesca y Alimentación [1], el gasto medio de los hogares españoles destinado a alimentación y bebidas no alcohólicas alcanzó los 3.640 euros anuales por hogar en 2023, lo que representa aproximadamente el 15% del gasto total de consumo privado.

La estructura del sector se caracteriza por la coexistencia de grandes cadenas nacionales e internacionales, como Mercadona, Carrefour, Lidl, Alcampo o DIA, junto a una red significativa de comercios locales y mercados de proximidad. Mercadona, con una cuota de mercado superior al 26% en 2024 [2], ejerce un papel dominante, aunque la fragmentación del sector sigue siendo notable: las cinco primeras cadenas concentran aproximadamente el 60% del mercado, dejando el 40% restante repartido entre decenas de operadores regionales y locales.

Esta fragmentación tiene una consecuencia directa sobre el comportamiento del consumidor: la variabilidad de precios entre establecimientos es significativa y sistemática. La Organización de Consumidores y Usuarios (OCU) publica periódicamente su Cesta de la Compra Comparada, en la que se constata que la diferencia de gasto entre el establecimiento más barato y el más caro para una cesta tipo puede superar el 40%, equivalente a un ahorro potencial de más de 1.100 euros anuales por hogar [3]. El estudio de 2025 de la OCU identifica a Alcampo como la cadena nacional más competitiva en precio, mientras que los establecimientos de marca propia premium presentan diferencias de hasta un 25% sobre la media del sector.

### 3.1.1 El impacto de la inflación alimentaria

El contexto inflacionario de los años 2021–2024 ha intensificado la sensibilidad de los consumidores al precio. Según datos del Instituto Nacional de Estadística (INE) [4], la inflación acumulada en la categoría de alimentos y bebidas no alcohólicas entre enero de 2021 y diciembre de 2024 alcanzó el 34,2%, con picos superiores al 15% interanual en 2022. Esta evolución, sin precedentes en las últimas tres décadas, ha modificado estructuralmente el comportamiento de compra: según un estudio del Banco de España [5], el 68% de los hogares españoles admitió haber cambiado sus hábitos de compra para reducir el impacto de la inflación, siendo la comparación de precios entre establecimientos la estrategia más frecuentemente citada (43% de los encuestados).

Productos básicos como el café, el aceite de oliva, los huevos y el azúcar experimentaron subidas de entre el 40% y el 80% en ese periodo, generando una demanda creciente de herramientas que permitan al consumidor tomar decisiones de compra informadas. En este contexto, las aplicaciones de comparación de precios han pasado de ser un nicho tecnológico a una necesidad práctica para millones de familias.

### 3.1.2 El coste de oportunidad temporal

La literatura económica sobre el comportamiento del consumidor identifica el tiempo como un factor decisivo, frecuentemente ignorado, en la toma de decisiones de compra. Un estudio de la Universidad de Harvard Business School [6] modeló el proceso de comparación de precios como un problema de búsqueda óptima, concluyendo que el coste marginal de comparar entre más de tres establecimientos supera en promedio el beneficio marginal para el consumidor medio, dado el tiempo invertido.

Esta dinámica explica por qué, a pesar de la alta conciencia de los consumidores españoles sobre las diferencias de precio entre cadenas, la mayoría no dispersa sus compras entre múltiples establecimientos de forma sistemática. El informe de PwC sobre el comportamiento de compra del consumidor español [7] cifra en 47 minutos el tiempo medio semanal dedicado a la planificación de la compra (búsqueda de ofertas, elaboración de listas, selección de establecimiento), tiempo que podría reducirse significativamente mediante herramientas de automatización.

La hipótesis de partida de BargAIn es que existe una brecha de eficiencia entre el conocimiento disponible sobre diferencias de precio y la capacidad del consumidor de convertirlo en ahorro real, brecha que puede cerrarse mediante la automatización del proceso de optimización multicriterio.

---

## 3.2 Aplicaciones de comparación de precios: estado del arte

El ecosistema de aplicaciones para la comparación de precios en supermercados ha experimentado una evolución notable durante la última década. Se pueden distinguir tres generaciones de soluciones.

### 3.2.1 Primera generación: directorios de precios

Las primeras soluciones, aparecidas entre 2010 y 2015, se limitaban a proporcionar listados estáticos o semi-dinámicos de precios, obtenidos manualmente o mediante scraping de catálogos en línea de las cadenas. Su principal limitación era la actualización de datos: los precios se actualizaban con frecuencias semanales o mensuales, y el catálogo de productos era reducido (generalmente inferior a 10.000 artículos). En España, portales como *SuperMercados Online* y *Compar-amos* representan esta generación, hoy prácticamente desaparecida por la incapacidad de competir con las apps nativas de las cadenas.

### 3.2.2 Segunda generación: comparadores multisupermercado

A partir de 2015 surge una segunda generación de aplicaciones, caracterizada por la cobertura multisupermercado en tiempo (semi-)real, la integración de listas de la compra y la búsqueda por código de barras. Esta generación es la que domina actualmente el mercado español y europeo.

**Soysuper** (fundada en 2013, Madrid) es el referente más consolidado en España. Permite crear listas de la compra y compararlas simultáneamente en nueve cadenas principales (Mercadona, Carrefour, Eroski, Alcampo, El Corte Inglés, Hipercor, DIA, Condis y Caprabo), con un catálogo de más de 130.000 productos. La app incorpora lectura de códigos de barras, sugerencias de supermarkets cercanos basadas en código postal e integración con servicios de entrega a domicilio. Su modelo de negocio combina comisiones por referidos en pedidos online con publicidad contextual [8].

**Findit** (España) compara precios en ocho cadenas (Carrefour, Mercadona, DIA, Consum, Hiperber, Masymas, BM y gasolineras), con enfoque en la búsqueda por nombre o código de barras y una interfaz orientada a la comparación rápida de la cesta completa. Su diferenciación radica en la inclusión de gasolineras como categoría adicional.

**OCU Market** (desarrollada por la Organización de Consumidores y Usuarios) destaca por su base de datos de más de 150.000 productos y por añadir una capa de información nutricional: puntuación Nutriscore, índice NOVA de procesamiento y análisis de aditivos. Está respaldada por la credibilidad institucional de la OCU, lo que le confiere una ventaja de confianza sobre las soluciones puramente comerciales. Sin embargo, su catálogo de precios en tiempo real es más limitado y su actualización menos frecuente que la de competidores puramente tecnológicos.

**PreciRadar** (España) adopta un enfoque más analítico: en lugar de cubrir múltiples supermercados, se especializa en el seguimiento histórico de precios de Mercadona y Carrefour, ofreciendo alertas de bajada o subida de precios y gráficas de evolución temporal. Su propuesta de valor es la transparencia sobre las estrategias de precios de las cadenas (subidas silenciosas, *shrinkflation*, etc.).

**RadarPrice** (España) extiende el concepto de comparación más allá de la alimentación, integrando gasolineras, programas de fidelización y cupones físicos. Es especialmente popular entre usuarios que buscan consolidar todo el ahorro en una sola herramienta.

### 3.2.3 Tercera generación: integración con IA y personalización

La tercera generación de aplicaciones, aún emergente, incorpora tecnologías de inteligencia artificial para personalizar recomendaciones, predecir necesidades de compra y asistir al usuario mediante interfaces conversacionales. A nivel global, aplicaciones como **Flipp** (Canadá/EEUU) han integrado algoritmos de machine learning para personalizar la presentación de ofertas según historial de compras, mientras que plataformas europeas como **Idealo** (Alemania) y **Geizhals** (Austria) han escalado a catálogos de más de 330 y 100 millones de ofertas respectivamente, con motor de recomendaciones basado en comportamiento.

En el contexto español, esta tercera generación no está aún representada por ningún actor consolidado. BargAIn se posiciona precisamente en este espacio: una aplicación que combina la comparación de precios en tiempo real con optimización de rutas geoespaciales y asistencia conversacional por IA.

---

## 3.3 Tecnologías geoespaciales aplicadas al comercio minorista

El tratamiento de información geoespacial es uno de los pilares tecnológicos de BargAIn. A continuación se revisa el estado del arte en las tecnologías relevantes.

### 3.3.1 Bases de datos geoespaciales

Las bases de datos relacionales con extensiones geoespaciales han madurado considerablemente en los últimos años. **PostGIS** [9], extensión de PostgreSQL mantenida por OSGeo, es el estándar de facto para aplicaciones web que requieren consultas geoespaciales complejas. Permite expresar consultas como «tiendas en radio de X kilómetros» o «tiendas que se encuentran a lo largo de una ruta» en SQL nativo, con soporte para los estándares OGC/ISO (Simple Features Access, WKT/WKB). Su adopción en producción por parte de organizaciones como OpenStreetMap, el gobierno de los Estados Unidos (USGS) y plataformas de *ride-hailing* como Lyft [10] valida su escalabilidad para entornos de alta demanda.

El sistema de referencia de coordenadas SRID 4326 (WGS84), adoptado por BargAIn, es el estándar universal empleado por los principales proveedores de mapas (Google Maps, Apple Maps, OpenStreetMap) y por los receptores GPS de los dispositivos móviles, garantizando compatibilidad sin conversiones adicionales.

### 3.3.2 Enrutamiento y optimización de rutas

El problema de construir rutas óptimas entre múltiples paradas en un contexto urbano es una variante del clásico Problema del Viajante (TSP, *Travelling Salesman Problem*) [11]. Para instancias de tamaño reducido (hasta 10 paradas), como es el caso de BargAIn (máximo 4 paradas), los algoritmos exactos basados en programación dinámica o *branch-and-bound* son computacionalmente viables en tiempo real.

**OR-Tools** [12], la biblioteca de optimización combinatoria de Google, proporciona solucionadores de alta eficiencia para el VRP (*Vehicle Routing Problem*) y sus variantes. Ha sido utilizada en producción por Google Flights, Renault y operadores logísticos de primer nivel. En el contexto de una app de compras, OR-Tools permite resolver el sub-problema de ordenación óptima de paradas en tiempos de respuesta inferiores a 100 ms para instancias de hasta 10 nodos.

Para el cálculo de distancias y tiempos reales de tránsito en entorno urbano, existen dos aproximaciones principales. La primera es la integración con la API de **Google Directions** o su equivalente de Apple/TomTom, que proporciona tiempos de conducción en tiempo real teniendo en cuenta el tráfico. La segunda es el uso de **OSRM** (*Open Source Routing Machine*) [13], motor de enrutamiento de código abierto basado en OpenStreetMap, que ofrece latencias inferiores a 1 ms para cálculos de tiempo entre pares de puntos cuando se despliega en infraestructura propia, sin los costes de API de los proveedores comerciales.

### 3.3.3 Optimización multicriterio en logística del consumidor

La bibliografía académica sobre optimización de rutas de compras para consumidores finales es relativamente reciente. Ghiani et al. [14] formalizan el problema como un TSPSP (*Traveling Salesman Problem with Selective Pickup*), donde el conjunto de tiendas a visitar es en sí mismo una variable de decisión. En ese marco, la función objetivo combina el coste monetario de los productos (que depende de qué tienda se selecciona para cada producto), el coste de desplazamiento (que depende de la ruta) y una penalización por tiempo total. Este problema es NP-difícil en el caso general, pero para las instancias pequeñas del contexto minorista (menos de 5 tiendas, menos de 100 productos), las heurísticas constructivas seguidas de búsqueda local proporcionan soluciones óptimas o cuasi-óptimas en tiempo real.

---

## 3.4 Inteligencia Artificial en el comercio electrónico alimentario

### 3.4.1 Modelos de lenguaje para asistentes conversacionales

Los grandes modelos de lenguaje (*Large Language Models*, LLMs) han transformado radicalmente el paradigma de la interacción humano-computador en aplicaciones de consumo. La publicación de GPT-3 por OpenAI en 2020 [15] marcó un punto de inflexión: por primera vez era posible construir asistentes conversacionales de propósito general con capacidades de comprensión del lenguaje natural comparables a las humanas, sin necesidad de entrenamiento específico por dominio.

Los LLMs de última generación, como **Claude** (Anthropic) [16], **GPT-4o** (OpenAI) o **Gemini** (Google DeepMind), ofrecen interfaces de programación (APIs) que permiten a los desarrolladores integrar capacidades de razonamiento en lenguaje natural en sus aplicaciones mediante pocas líneas de código. En el contexto de una app de compras, esta tecnología permite que el usuario formule consultas complejas en lenguaje natural («¿qué tienda tiene la cesta de esta semana más barata si no me alejo más de 3 km de casa?») y reciba respuestas elaboradas, personalizadas y justificadas.

La arquitectura de *Retrieval-Augmented Generation* (RAG) [17], que combina la recuperación de información estructurada de bases de datos externas con la generación de respuestas por el LLM, es el patrón arquitectónico adoptado por BargAIn: el asistente tiene acceso a los datos de precios y tiendas actualizados, que el LLM utiliza como contexto para fundamentar sus respuestas en datos reales.

### 3.4.2 Visión artificial y OCR en aplicaciones de consumo

El reconocimiento óptico de caracteres (*Optical Character Recognition*, OCR) ha experimentado avances significativos gracias a la adopción de redes neuronales convolucionales (CNN), arquitecturas de transformers y servicios cloud especializados en análisis visual. Plataformas como **Google Cloud Vision API** [18] ofrecen reconocimiento de texto sobre imágenes complejas y escenarios móviles con mayor robustez práctica frente a sombras, ruido, inclinación y degradación del soporte físico.

En el contexto de aplicaciones de compras, la visión artificial se aplica principalmente en dos casos de uso: el escaneo de códigos de barras para la identificación de productos (presente en la mayoría de competidores analizados) y la digitalización de listas de la compra escritas a mano o tickets de compra anteriores (caso de uso diferencial de BargAIn). Este segundo uso presenta mayores desafíos técnicos debido a la variabilidad de la escritura manual y al ruido típico de los tickets (tipografías de impresoras térmicas degradadas, papel arrugado).

La combinación de OCR con *fuzzy matching* de cadenas [19] (algoritmos como Levenshtein, Jaro-Winkler o TF-IDF para búsqueda de productos similares) es el enfoque estándar para resolver la ambigüedad en la identificación de productos a partir de texto imperfecto.

### 3.4.3 Web scraping para la ingesta automatizada de precios

El web scraping constituye la principal fuente de datos de precios en tiempo real para las aplicaciones de comparación de supermercados, dado que la mayoría de las cadenas no ofrecen APIs públicas. Las cadenas españolas más relevantes (Mercadona, Carrefour, Lidl, DIA, Alcampo) mantienen catálogos de precios en línea que se actualizan con frecuencias diarias o semanales.

**Scrapy** [20], el framework de scraping para Python, es el estándar de la industria para proyectos de scraping de mediana-gran escala, gracias a su arquitectura asíncrona, su sistema de pipelines configurable y su integración con **Playwright** para el manejo de contenido generado dinámicamente mediante JavaScript. La combinación Scrapy + Playwright es especialmente relevante para el scraping de supermercados como Mercadona, cuyo catálogo se sirve íntegramente como SPA (*Single Page Application*) y no es accesible mediante scraping tradicional de HTML estático.

Los desafíos técnicos del scraping de supermercados incluyen la detección y evasión de sistemas anti-bot (CAPTCHAs, fingerprinting de navegadores, rate limiting), la normalización de nombres de productos entre cadenas (el mismo artículo puede tener denominaciones muy distintas en diferentes catálogos) y la gestión de la caducidad de los datos.

---

## 3.5 Tendencias del mercado y oportunidades de innovación

El análisis del estado del arte permite identificar un conjunto de tendencias que contextualizan y justifican la propuesta de BargAIn:

**Tendencia 1 — Convergencia precio-localización.** Los consumidores europeos demandan cada vez más herramientas que integren la comparación de precios con información geoespacial relevante (tiendas cercanas, tiempo de desplazamiento). La separación entre comparadores de precios y aplicaciones de mapas es una limitación estructural de las soluciones actuales que BargAIn propone eliminar.

**Tendencia 2 — Interacción conversacional.** La adopción masiva de asistentes de voz (Alexa, Google Assistant, Siri) y chatbots ha normalizado la interacción en lenguaje natural con aplicaciones de consumo. En el sector alimentario, esta tendencia se traduce en la demanda de asistentes que respondan preguntas complejas sobre ahorro, no simplemente ejecuten búsquedas.

**Tendencia 3 — Digitalización de PYMEs.** El comercio local y las pequeñas y medianas empresas del sector alimentario carecen de presencia en los comparadores actuales, que se centran exclusivamente en las grandes cadenas. La inclusión de PYMEs como actores de primera clase en una plataforma de comparación de precios es un nicho sin explotar con un potencial significativo tanto de impacto social como de modelo de negocio.

**Tendencia 4 — Crowdsourcing de precios.** Las fuentes oficiales de precios (APIs de cadenas, scraping de catálogos) presentan limitaciones de cobertura y latencia. El crowdsourcing de precios (usuarios que reportan precios en tienda) es un mecanismo complementario que permite cubrir establecimientos no escaneados automáticamente. Aplicaciones como **Barcodelookup** o **Open Food Facts** [21] demuestran la viabilidad del modelo crowdsourcing para la construcción de bases de datos de productos.

**Tendencia 5 — Sostenibilidad y consumo responsable.** La creciente preocupación por la huella de carbono de los desplazamientos de compra abre un vector de diferenciación basado en la optimización de rutas no solo por coste monetario y tiempo, sino también por impacto ambiental. Este es un eje que BargAIn podría incorporar en versiones futuras del algoritmo de optimización.

---

## 3.6 Limitaciones de las soluciones actuales

Del análisis del estado del arte se extraen las siguientes limitaciones estructurales de las soluciones existentes en el mercado español:

En primer lugar, ninguna de las aplicaciones revisadas combina la comparación de precios con la optimización de rutas entre múltiples establecimientos. Las apps de comparación muestran qué tienda tiene mejor precio, pero no calculan si el ahorro justifica el desplazamiento; las apps de navegación optimizan rutas, pero desconocen los precios.

En segundo lugar, la cobertura de comercios locales y mercados de proximidad es nula en todas las soluciones actuales. El ecosistema de PYMEs y comercios de barrio, que en muchas categorías (productos frescos, productos de especialidad) puede ser competitivo en precio respecto a las grandes cadenas, permanece completamente invisibilizado para el consumidor digital.

En tercer lugar, la experiencia de usuario en la creación de listas de la compra es manual en todas las aplicaciones analizadas. La digitalización automática de listas escritas a mano o la extracción de productos de tickets de compra anteriores (mediante OCR) no está implementada en ningún competidor directo del mercado español.

Finalmente, la asistencia conversacional por IA para consultas sobre compras, ahorro y comparación de precios es inexistente en el ecosistema español. El usuario debe formular consultas estructuradas (búsquedas, filtros) en lugar de preguntas en lenguaje natural.

Estas cuatro brechas constituyen el espacio de oportunidad que BargAIn aborda con su propuesta de valor, tal y como se analiza en detalle en el Capítulo 4.

---

## Referencias

[1] Ministerio de Agricultura, Pesca y Alimentación. *Panel de Consumo Alimentario 2023*. Madrid: MAPA, 2024.

[2] Kantar Worldpanel. *Cuotas de mercado en la distribución de Gran Consumo en España. Datos acumulados 2024*. Madrid: Kantar, 2024.

[3] Organización de Consumidores y Usuarios (OCU). *Supermercados más baratos 2025: diferencias de precio por establecimientos*. Madrid: OCU, 2025. Disponible en: https://www.ocu.org/consumo-familia/supermercados/noticias/supermercados-mas-baratos-2025

[4] Instituto Nacional de Estadística. *Índice de Precios de Consumo. Serie histórica 2021–2024*. Madrid: INE, 2024.

[5] Banco de España. *Encuesta de Finanzas de las Familias (EFF) 2022*. Madrid: Banco de España, 2023.

[6] Stigler, G. J. "The Economics of Information." *The Journal of Political Economy*, vol. 69, nº 3, pp. 213–225, 1961. doi:10.1086/258464

[7] PricewaterhouseCoopers. *Global Consumer Insights Pulse Survey H1 2024*. Londres: PwC, 2024.

[8] Marketing4Ecommerce. "App SoySuper: una app para la lista de la compra." Marketing4Ecommerce.net, 2015. Disponible en: https://marketing4ecommerce.net/app-soysuper-una-nueva-aplicacion-movil-para-la-lista-de-la-compra/

[9] Obe, R. O. y Hsu, L. S. *PostGIS in Action*, 3ª ed. Shelter Island, NY: Manning Publications, 2021.

[10] Lyft Engineering. "Improving ETA Prediction with PostGIS and Machine Learning." Lyft Engineering Blog, 2022.

[11] Applegate, D. L., Bixby, R. E., Chvátal, V., y Cook, W. J. *The Traveling Salesman Problem: A Computational Study*. Princeton: Princeton University Press, 2006.

[12] Perron, L. y Furnon, V. *OR-Tools v9.8*. Mountain View, CA: Google LLC, 2024. Disponible en: https://developers.google.com/optimization

[13] Luxen, D. y Vetter, C. "Real-time Routing with OpenStreetMap Data." En *Proceedings of the 19th ACM SIGSPATIAL International Symposium on Advances in Geographic Information Systems*, Chicago, 2011. doi:10.1145/2093973.2094062

[14] Ghiani, G., Laporte, G., y Musmanno, R. *Introduction to Logistics Systems Planning and Control*. Chichester: Wiley, 2004.

[15] Brown, T. B. et al. "Language Models are Few-Shot Learners." En *Advances in Neural Information Processing Systems* (NeurIPS 2020), vol. 33, pp. 1877–1901, 2020.

[16] Anthropic. *Claude: A Constitutional AI Approach to Harmless, Helpful Assistants*. San Francisco: Anthropic, 2023. Disponible en: https://www.anthropic.com/research

[17] Lewis, P. et al. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." En *Advances in Neural Information Processing Systems* (NeurIPS 2020), vol. 33, pp. 9459–9474, 2020.

[18] Google Cloud, *Cloud Vision Documentation*. Mountain View, CA: Google LLC, 2026. Disponible en: https://cloud.google.com/vision/docs

[19] Christen, P. *Data Matching: Concepts and Techniques for Record Linkage, Entity Resolution, and Duplicate Detection*. Berlín: Springer, 2012.

[20] Scrapy Project. *Scrapy 2.12 Documentation*. Disponible en: https://docs.scrapy.org

[21] Open Food Facts. *Open Food Facts: The Open Database of Food Products*. Disponible en: https://world.openfoodfacts.org
