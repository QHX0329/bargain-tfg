# 11. Conclusiones

## 11.1 Grado de cumplimiento

El proyecto BarGAIN ha completado todos los bloques de desarrollo planificados:

- **F1:** análisis, requisitos y diseño de arquitectura.
- **F2:** infraestructura base de desarrollo y CI/CD.
- **F3:** backend core completo con todos los módulos de dominio y API documentada.
- **F4:** frontend base y avanzado — autenticación, listas, catálogo, mapa, notificaciones, perfil, portal business y Places enrichment.
- **F5:** sistema de optimización multicriterio (OR-Tools + OpenRouteService), scraping de precios (Scrapy + Playwright, 4 cadenas), OCR de tickets (Google Cloud Vision API + fuzzy matching), asistente LLM (Google Gemini 2.0 Flash) y wiring de pantallas móviles a endpoints reales.
- **F6:** portal business completo para PYMEs — servicio de aprobación compartido, gestión de precios y promociones, tests de integración, UAT verificada, notificaciones push y email, sincronización documental.

El sistema está desplegado en staging (Render.com) y los cuatro flujos E2E críticos han sido verificados de forma automatizada con Playwright.

## 11.2 Aportaciones principales del trabajo

- **Algoritmo de optimización multicriterio propio:** función de scoring ponderada (precio, distancia, tiempo) con OR-Tools para el VRP y OpenRouteService para distancias reales de conducción. Es el núcleo diferencial del TFG.
- **Pipeline de datos de precios automatizado:** cuatro spiders Scrapy para Mercadona, Carrefour, Lidl y DIA, con programación periódica via Celery Beat y normalización de producto contra catálogo interno.
- **OCR sobre tickets con Google Vision API:** extracción de texto, fuzzy matching contra catálogo y conversión automática a items de lista. Elimina la entrada manual.
- **Portal business para PYMEs:** flujo completo de registro, aprobación por administrador, gestión de precios y promociones, con visibilidad para el consumidor final.
- **Asistente LLM con guardrails de dominio:** Gemini 2.0 Flash con restricción temática a consultas de compra, historial de conversación y rate limiting.
- **Arquitectura full-stack coherente:** separación clara entre apps Django, workers Celery independientes, PostGIS para geoespacial y React Native + Expo para iOS/Android desde una única base de código.
- **Verificación automatizada:** suite de tests backend (unitarios + integración, >80% cobertura), tests E2E con Playwright (4 flujos críticos) y UAT manual en iPhone.

## 11.3 Limitaciones

- **Cobertura de scraping:** el sistema cubre actualmente cuatro cadenas de supermercados (Mercadona, Carrefour, Lidl, DIA). Las cadenas con protección agresiva contra scrapers (Alcampo, Aldi) requieren mantenimiento adicional de los spiders.
- **Caducidad de precios:** los precios de scraping tienen TTL de 48 horas y los de crowdsourcing 24 horas; pueden no reflejar cambios de precio intradiarios.
- **Cold starts en Render free tier:** el plan gratuito de Render puede tener tiempos de arranque de hasta 30 segundos tras inactividad prolongada, lo que afecta a la primera petición tras un período de reposo.
- **Certificado iOS gratuito:** la distribución con Sideloadly y Apple ID gratuito genera certificados con caducidad de 7 días, que requieren re-sideload periódico para el dispositivo de demo.
- **NFR-05 sin load test real:** la justificación de escalabilidad a 10.000 usuarios concurrentes es arquitectural (Celery workers independientes, PostGIS spatial index, API stateless). Un load test completo requeriría infraestructura de pago fuera del alcance del TFG.

## 11.4 Lecciones aprendidas

- **Modelo híbrido backend Docker / frontend nativo en host:** determinante para la productividad en Windows. Docker volumes en Windows rompen el HMR de Metro/Expo; ejecutar el frontend nativo elimina este problema manteniendo el backend aislado.
- **Contratos API explícitos y documentación viva:** mantener TASKS.md, ADRs y la memoria actualizados durante el desarrollo (no al final) reduce la fricción entre backend y frontend y facilita la incorporación de agentes IA al flujo.
- **OR-Tools frente a algoritmo propio:** usar la librería de optimización combinatoria de Google (producción en empresas logísticas) es preferible a reinventar el VRP desde cero. El valor del TFG está en la integración y la función de scoring, no en reimplementar un solucionador genérico.
- **OCR cloud vs local:** Google Vision API supera a Tesseract en precisión sobre tickets de supermercado reales (texto impreso variable), justificando el coste de la llamada API frente a la alternativa local.
- **Playwright request fixture para flujos mobile-only:** los flujos de lista y optimizador son exclusivos de la app móvil. Cubrirlos con tests API-level (Playwright `request` fixture) permite automatización completa sin necesitar una interfaz web consumer.

## 11.5 Trabajo futuro

1. **Publicación en App Store y Google Play:** el proyecto está técnicamente listo para iniciar el proceso de publicación. Requiere cuenta de desarrollador Apple/Google y revisión de las guías de contenido.
2. **Ampliación de scrapers:** incorporar Alcampo, Aldi, Lidl.es (versión alternativa), El Corte Inglés alimentación y PYMEs locales via integración API propia.
3. **Precios en tiempo real:** varios supermercados están desplegando APIs semi-públicas o feeds RSS de precios; la arquitectura está preparada para incorporarlos como fuente `api` en el modelo `Price`.
4. **Sistema de reseñas de productos:** los usuarios podrían valorar la calidad/frescura de productos por tienda, añadiendo una dimensión cualitativa al comparador.
5. **Suscripción premium para PYMEs:** el modelo de negocio contempla tres tiers (`free`, `basic`, `premium`) con funcionalidades diferenciadas; la implementación actual es el tier gratuito.
6. **Internacionalización:** la arquitectura soporta múltiples países; la expansión requiere scrapers por mercado y ajuste de la lógica de normalización de cadenas.

## 11.6 Cierre

BarGAIN demuestra que es posible construir, en el marco de un TFG, un sistema full-stack de complejidad real que integra optimización combinatoria, geoespacial, procesamiento de imágenes, generación de lenguaje natural y scraping automatizado bajo una arquitectura coherente y verificada. El proyecto cumple todos los objetivos planteados en la fase de análisis y deja una base técnica sólida para su evolución como producto real.
