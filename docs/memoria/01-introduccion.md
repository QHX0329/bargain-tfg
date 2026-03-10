# 1. Introducción

En la actualidad, el consumidor español se enfrenta a un escenario de compra diaria marcado por la fragmentación de la información y la ineficiencia logística. Los precios de los productos básicos varían significativamente entre cadenas de supermercados, e incluso entre establecimientos de una misma cadena, y esta variación se produce de forma diaria sin que exista una fuente única y centralizada que permita al usuario tomar decisiones informadas.

A esta asimetría de información se suma el coste de oportunidad temporal: comparar manualmente ofertas entre distintos folletos, aplicaciones de cadenas y portales de cupones consume un tiempo del que la mayoría de familias no dispone. Además, incluso cuando el consumidor identifica los mejores precios, la decisión de desplazarse a múltiples establecimientos introduce una tercera variable — la eficiencia logística — que puede anular el ahorro obtenido si la ruta no está optimizada en distancia y tiempo.

BargAIn  nace como respuesta a este problema, proponiendo una aplicación móvil y web que actúa como un orquestador inteligente de la cesta de la compra. El sistema no solo compara precios entre establecimientos, sino que calcula la combinación óptima de paradas que maximiza el ahorro real del usuario, ponderando precio, distancia y tiempo de forma conjunta.

El proyecto integra cuatro pilares tecnológicos: un módulo de ingesta de precios mediante web scraping y crowdsourcing, un algoritmo de optimización multicriterio que combina geolocalización (PostGIS) con inteligencia artificial, un sistema de visión artificial para digitalizar listas escritas a mano o tickets anteriores, y un asistente conversacional basado en modelos de lenguaje (LLM) que permite realizar consultas complejas en lenguaje natural.

Este Trabajo Fin de Grado se enmarca en el Grado en Ingeniería Informática — Ingeniería del Software de la Universidad de Sevilla, y tiene como alcance el desarrollo completo de la plataforma: desde el análisis de requisitos y diseño de la arquitectura hasta la implementación, pruebas y despliegue de un prototipo funcional.

La memoria se estructura en doce capítulos que cubren el ciclo completo del desarrollo: objetivos, estado del arte, comparativa con alternativas existentes, herramientas utilizadas, planificación temporal y de costes, análisis de requisitos, diseño e implementación, manual de usuario, pruebas, conclusiones y bibliografía.
