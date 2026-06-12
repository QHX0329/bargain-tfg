# 4. Comparativa con Alternativas Existentes

## 4.1 Mapa del panorama competitivo

El análisis competitivo de BarGAIN requiere identificar distintos niveles de competencia en función de la proximidad de la propuesta de valor. Se distinguen cuatro categorías: competidores directos, competidores indirectos, soluciones adyacentes y sustitutos no tecnológicos.

### 4.1.1 Competidores directos

Los competidores directos son aquellos productos que intentan resolver el mismo problema (optimizar la cesta de la compra en precio) para el mismo segmento de usuarios (consumidor final en España). Se han identificado cinco aplicaciones que compiten directamente con BarGAIN en el mercado español:

**Soysuper** es la aplicación de referencia en el mercado español de comparación de precios en supermercados. Fundada en 2013 en Madrid, ofrece cobertura de nueve cadenas nacionales y un catálogo de más de 130.000 productos. Su propuesta de valor se centra en la creación de listas de la compra y la comparación simultánea de su coste en múltiples supermercados, con integración de lectura de código de barras y recomendación de establecimientos por código postal. Carece completamente de optimización de rutas y de asistencia por IA.

**Findit** compara precios en ocho cadenas españolas, incluyendo gasolineras como categoría adicional. Su interfaz está optimizada para la comparación rápida de la cesta completa y la búsqueda por nombre o código de barras. Al igual que Soysuper, no incorpora geolocalización avanzada ni optimización de rutas.

**OCU Market**, desarrollada por la Organización de Consumidores y Usuarios, incorpora más de 150.000 productos y destaca por la información nutricional y de calidad asociada a cada artículo (puntuación Nutriscore, índice NOVA). Su ventaja competitiva reside en la credibilidad institucional de la OCU, pero su modelo de negocio sin ánimo de lucro limita la inversión en tecnología de scraping en tiempo real.

**PreciRadar** adopta un nicho diferente: en lugar de cubrir muchas cadenas, se especializa en el seguimiento histórico de precios de Mercadona y Carrefour, con alertas personalizadas y análisis de tendencias. Es útil como herramienta de análisis, pero no como asistente de compra activa.

**RadarPrice** integra comparación de precios en supermercados con cupones físicos, programas de fidelización y comparación de gasolineras. Su audiencia objetivo es el consumidor activo en la búsqueda de ahorro multi-sector, no exclusivamente alimentario.

### 4.1.2 Competidores indirectos

Los competidores indirectos resuelven el mismo problema (ahorrar en la compra) mediante enfoques distintos.

Las **aplicaciones nativas de las cadenas** (Mi Carrefour, Lidl Plus, Mercadona — que carece de app de compras pero ofrece tienda online) son la primera fuente de información de precios para la mayoría de consumidores. Su ventaja es el dato oficial y en tiempo real de una cadena; su limitación estructural es la ausencia de comparativa con competidores.

**Flipp** (Canadá/EEUU, con presencia en algunos mercados europeos) agrega circulares y folletos de oferta de más de 2.000 retailers, permitiendo recortar ofertas digitalmente para cargarlas en tarjetas de fidelización. En España no ha alcanzado masa crítica de retailers, pero representa el modelo de negocio basado en publicidad de folletos que podría expandirse.

Los **comparadores de supermercados de medios de comunicación** (como el observatorio de precios de la OCU o los rankings periódicos de *El País*, *El Confidencial*, etc.) ofrecen análisis puntuales pero no herramientas de uso continuo.

### 4.1.3 Soluciones adyacentes

Las soluciones adyacentes no compiten directamente hoy, pero tienen la capacidad técnica y el acceso al usuario para hacerlo.

**Google Maps / Google Shopping** dispone de la infraestructura de geolocalización y el volumen de datos de precios (via Google Shopping Feed) para construir un comparador de supermercados. La ausencia de este producto específico se explica probablemente por razones de modelo de negocio (dependencia publicitaria de las cadenas) más que por limitaciones técnicas.

**Glovo e Instacart** ofrecen entrega a domicilio de múltiples supermercados desde una sola interfaz, lo que proporciona visibilidad de precios multi-cadena como subproducto. Sin embargo, su modelo de negocio está orientado a la conveniencia (entrega rápida), no al ahorro (optimización de precio y ruta propia).

**Wallapop / Too Good to Go** abordan el desperdicio alimentario desde un enfoque diferente (reventa y excedentes), pero comparten el usuario objetivo del consumidor consciente del coste alimentario.

### 4.1.4 Sustitutos no tecnológicos

El sustituto más extendido es la **comparación manual** mediante folletos físicos, folletos digitales de las cadenas y la memoria del consumidor sobre precios habituales. Este proceso, aunque completamente vigente, consume un tiempo significativo y es intrínsecamente subóptimo (el consumidor no puede evaluar exhaustivamente todas las combinaciones posibles de tiendas y productos).

### 4.1.5 Posicionamiento en el mapa competitivo

La siguiente figura resume el posicionamiento de los principales actores en dos ejes estratégicos clave: el **grado de optimización** (de simple presentación de información a optimización activa de decisiones) y el **ámbito de cobertura** (de una sola cadena a múltiples cadenas incluyendo comercios locales):

```
                        OPTIMIZACIÓN ALTA
                              │
                              │             ● BarGAIN
                              │              (objetivo)
                              │
  UNA SOLA   ─────────────────┼──────────────────────── MÚLTIPLES
   CADENA                     │                          CADENAS
                              │  ● Soysuper  ● Findit
               Apps propias ● │  ● OCU Market
               de cadenas     │  ● RadarPrice ● PreciRadar
                              │
                        OPTIMIZACIÓN BAJA
                        (presentación de información)
```

*Figura 4.1. Mapa de posicionamiento competitivo de BarGAIN respecto a los principales competidores. Elaboración propia.*

BarGAIN ocupa la posición superior derecha del mapa —alta optimización y cobertura multisupermercado incluyendo PYMEs—, un espacio que ningún competidor actual ocupa.

---

## 4.2 Matriz de comparación de características

El Cuadro 4.1 recoge la comparación detallada de funcionalidades entre BarGAIN y los cinco competidores directos identificados en la sección anterior. Para cada característica se emplea la siguiente escala:

- **✅ Completo:** Funcionalidad madura y bien ejecutada, diferenciadora o comparable al mejor de su clase.
- **⚠️ Parcial:** La funcionalidad existe pero con limitaciones significativas (cobertura reducida, actualización infrecuente, UX deficiente).
- **❌ Ausente:** La funcionalidad no está disponible.

| **Área** | **Característica** | **BarGAIN** | **Soysuper** | **Findit** | **OCU Market** | **PreciRadar** | **RadarPrice** |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Datos de precios** | Cobertura grandes cadenas (≥5) | ✅ | ✅ | ✅ | ✅ | ⚠️ (2) | ✅ |
| | Actualización diaria / en tiempo real | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| | Inclusión de comercios locales (PYMEs) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Histórico de precios | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Alertas de bajada de precio | ⚠️ | ❌ | ❌ | ❌ | ✅ | ⚠️ |
| **Lista de la compra** | Creación manual de lista | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| | Digitalización por OCR (foto/ticket) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Escaneo de código de barras | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| | Compartir lista con otros usuarios | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Comparación y optimización** | Comparación de cesta completa multi-tienda | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| | Recomendación de tienda óptima (precio) | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| | Optimización multi-parada (precio + ruta) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Ponderación precio / distancia / tiempo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Cálculo de ahorro desglosado por parada | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Geolocalización y mapas** | Tiendas cercanas según ubicación | ✅ | ⚠️ (CP) | ❌ | ⚠️ | ❌ | ❌ |
| | Visualización de ruta en mapa | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Cálculo de tiempo de desplazamiento | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inteligencia Artificial** | Asistente conversacional (LLM) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Recomendaciones personalizadas | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Información nutricional | ⚠️ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Modelo B2B** | Portal para PYMEs / gestión de precios | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Sistema de promociones para comercios | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **UX y plataformas** | Aplicación móvil (iOS + Android) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| | Versión web | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| | Modo offline parcial | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Cuadro 4.1. Matriz de comparación de características entre BarGAIN y sus competidores directos. Las celdas marcadas como ⚠️ (CP) en Soysuper indican que la geolocalización se realiza por código postal, no por GPS en tiempo real. Elaboración propia.*

Del análisis del Cuadro 4.1 se extraen las siguientes observaciones:

La característica que más claramente diferencia a BarGAIN del resto de competidores es la **optimización de ruta multi-parada** con ponderación multicriterio (precio + distancia + tiempo). Ningún competidor directo implementa esta funcionalidad.

La **digitalización por OCR** de listas y tickets es igualmente exclusiva de BarGAIN entre los competidores analizados.

El **asistente conversacional basado en LLM** no tiene equivalente en ninguna de las aplicaciones del mercado español.

La **inclusión de PYMEs y comercios locales** como actores del sistema es una característica única de BarGAIN que abre un espacio de mercado completamente inexplorado.

Los competidores más fuertes (Soysuper y OCU Market) superan a BarGAIN en cobertura de cadenas y en madurez del histórico de precios, dada su mayor antigüedad en el mercado. Estas son áreas donde BarGAIN deberá crecer progresivamente.

---

## 4.3 Análisis de posicionamiento

### 4.3.1 Posicionamiento de los competidores actuales

Cada competidor ha construido un posicionamiento diferenciado dentro del espacio de la comparación de precios:

**Soysuper** se posiciona como el «supermercado de supermercados»: una interfaz única desde la que el usuario puede hacer su compra habitual comparando precios entre las principales cadenas. Su mensaje principal apela a la comodidad de la lista de la compra centralizada, no exclusivamente al ahorro máximo.

**OCU Market** se posiciona sobre la credibilidad institucional y la salud: «compra mejor, come más sano». La integración de Nutriscore e índice NOVA responde a un consumidor que no solo busca precio, sino también calidad nutricional, y que confía en la OCU como organismo independiente.

**PreciRadar** se posiciona como herramienta de vigilancia y transparencia frente a las estrategias de precios de las cadenas. Su audiencia objetivo es el consumidor más crítico y analítico, interesado en entender los patrones de subida de precios más que en la compra cotidiana.

**RadarPrice** se posiciona como la «navaja suiza del ahorro»: un ecosistema de descuentos que va más allá de los supermercados, integrando gasolineras, cupones físicos y programas de puntos.

### 4.3.2 Posicionamiento de BarGAIN

BarGAIN se posiciona en una categoría propia, que puede formularse como: **optimizador inteligente de la cesta de la compra**. A diferencia de los comparadores tradicionales, que presentan información de precios para que el usuario tome la decisión, BarGAIN toma la decisión por el usuario calculando la combinación óptima de tiendas y ruta, ponderando las preferencias individuales del consumidor.

La propuesta de valor se articula en torno a tres mensajes principales:

- *Ahorro real, no potencial*: el sistema calcula el ahorro neto después de descontar el coste del desplazamiento, no el ahorro bruto que muestra el precio más barato sin considerar la distancia.
- *Tu compra, tu ruta*: el usuario configura sus pesos de preferencia (importa más el precio, el tiempo o la distancia) y el algoritmo personaliza la recomendación a sus circunstancias.
- *Tu lista en segundos*: la digitalización por OCR elimina la fricción de la creación manual de la lista de la compra.

---

## 4.4 Análisis de brechas estratégicas y oportunidades

### 4.4.1 Brechas identificadas en el mercado

A partir del análisis de competidores y de las tendencias del mercado descritas en el Capítulo 3, se identifican las siguientes brechas estratégicas que BarGAIN aborda:

**Brecha 1 — El gap precio-ruta.** Todos los competidores analizados finalizan su análisis en «esta tienda tiene mejor precio para tu lista». Ninguno responde a la pregunta completa del consumidor: «¿cuánto me voy a gastar en realidad, incluyendo ir a buscar los productos?». Esta brecha es la más significativa y la que fundamenta el algoritmo de optimización multicriterio de BarGAIN.

**Brecha 2 — El comercio local invisible.** El 100% de los competidores directos se centra en las grandes cadenas nacionales. Los mercados municipales, las tiendas de barrio y las empresas alimentarias locales —que pueden ser especialmente competitivos en productos frescos— no tienen representación en ninguna plataforma de comparación de precios. BarGAIN incorpora un portal específico para PYMEs que les permite publicar sus precios y captar clientes que de otro modo no considerarían su establecimiento.

**Brecha 3 — La fricción de la lista.** La creación manual de la lista de la compra es el principal punto de abandono en las aplicaciones de comparación. El OCR de BarGAIN permite digitalizar automáticamente una lista escrita a mano o extraer los productos de un ticket anterior, reduciendo a cero el esfuerzo de creación de la lista para el caso de uso más frecuente (reutilizar una compra anterior).

**Brecha 4 — La consulta en lenguaje natural.** El paradigma actual de interacción con comparadores de precios es el de búsqueda por producto (el usuario introduce el nombre de un artículo). Este paradigma no permite consultas complejas como «¿qué me conviene más, ir a Mercadona o a Lidl esta semana dado que tengo una lista de 20 artículos y no quiero alejarme más de 2 km?». El asistente conversacional de BarGAIN, basado en la API de Gemini, responde precisamente a este tipo de consultas.

### 4.4.2 Riesgos competitivos

El análisis de brechas debe equilibrarse con una valoración honesta de los riesgos competitivos que BarGAIN enfrenta.

El primer riesgo es la **amenaza de extensión de Soysuper o aplicaciones similares**: dado que Soysuper ya dispone de los datos de precios y de la base de usuarios, podría añadir una capa de geolocalización y optimización de rutas con una inversión relativamente moderada. Sin embargo, la experiencia en desarrollo de software de optimización combinatoria (OR-Tools, PostGIS) y de sistemas de LLM representa una barrera técnica no trivial.

El segundo riesgo es la **amenaza de las propias cadenas**: Mercadona o Carrefour podrían lanzar herramientas de comparación con competidores si la regulación o la presión del mercado lo favoreciera. Este escenario, aunque improbable a corto plazo, debe monitorizarse.

El tercer riesgo es la **dificultad de obtención de datos**: el scraping de supermercados puede verse limitado por cambios en los términos de servicio de las cadenas o por mejoras en sus sistemas anti-bot. La diversificación de fuentes (scraping + crowdsourcing + APIs oficiales cuando existan) es la estrategia de mitigación adoptada por BarGAIN.

---

## 4.5 Resumen de ventajas competitivas de BarGAIN

El Cuadro 4.2 resume las ventajas competitivas de BarGAIN en términos del marco de análisis de Porter [22]:

| **Dimensión competitiva** | **Posición de BarGAIN** | **Fundamento** |
|---|---|---|
| Diferenciación de producto | Alta | Única app con optimización de ruta + precios en España |
| Barreras técnicas de entrada | Medias-Altas | Complejidad de OR-Tools + PostGIS + LLM + Scraping |
| Cobertura de mercado | Media (en lanzamiento) | Escalable vía crowdsourcing y portal PYME |
| Modelo B2B (PYMEs) | Sin competencia directa | Primer comparador que integra comercios locales |
| Experiencia de usuario (OCR) | Diferenciadora | Eliminación de fricción en creación de lista |
| Asistencia por IA | Sin competencia directa | Único LLM assistant en el sector en España |

*Cuadro 4.2. Resumen de posición competitiva de BarGAIN. Elaboración propia.*

En conclusión, BarGAIN no compite frontalmente con Soysuper u OCU Market en el espacio de la comparación pura de precios, donde éstos tienen ventajas de madurez y base de datos. En cambio, define una categoría nueva —el optimizador multicriterio de la cesta de la compra— donde ocupa una posición de pionero en el mercado español, con una propuesta de valor que integra de forma sinérgica cuatro capacidades tecnológicas (scraping, geolocalización, OCR y LLM) que los competidores actuales no combinan.

---

## Referencias

[22] Porter, M. E. *Competitive Advantage: Creating and Sustaining Superior Performance*. Nueva York: Free Press, 1985.

