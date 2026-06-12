# BarGAIN — Outline de Slides para la Defensa TFG

**Autor:** Nicolás Parrilla Geniz
**Tutor:** Juan Vicente Gutiérrez Santacreu
**Titulación:** Grado en Ingeniería Informática (Ingeniería del Software)
**Universidad:** Universidad de Sevilla — ETSII
**Fecha:** [COMPLETAR antes de la defensa]
**Duración objetivo:** 22-25 min (excluye preguntas)

---

## Estructura de slides (estructura mínima ETSII cumplida)

Slides estimadas: ~20 diapositivas

---

### BLOQUE 1: Portada (1 slide) — 0 min

**Slide 1 — Portada**
- Logo ETSII + Universidad de Sevilla
- Título: "BarGAIN: Sistema de Optimización de Cesta de la Compra"
- Subtítulo: "Trabajo Fin de Grado — Ingeniería del Software"
- Autor, Tutor, Departamento, Fecha
- Imagen: captura del mapa de ruta optimizada en el móvil

---

### BLOQUE 2: Motivación (2 slides) — 1-2 min

**Slide 2 — El problema del consumidor**
- El precio de la cesta de la compra ha subido +15% en 2 años (INE 2022-2024)
- Las familias españolas gastan de media €120/semana en alimentación
- Problema: 5 supermercados a 2 km, ¿cuál es la mejor combinación?
- Imagen: collage de precios del mismo producto en diferentes supermercados

**Slide 3 — La oportunidad del comercio local**
- Las PYMEs de alimentación pierden clientes vs grandes cadenas
- Falta de herramientas para competir en visibilidad digital
- BarGAIN equilibra el campo: visibilidad para PYMEs, ahorro para consumidores

---

### BLOQUE 3: Problema, Objetivos y Requisitos (3 slides) — 3-5 min

**Slide 4 — Definición del problema**
- Formulación: optimizar (precio, distancia, tiempo) para una lista de la compra dada
- Score = w₁·ahorro - w₂·distancia - w₃·tiempo
- Los pesos los configura el usuario según sus preferencias
- Restricción: máx. 3-4 paradas, radio máx. 10 km

**Slide 5 — Objetivos del TFG**
- OBJ-01: Algoritmo de optimización multicriterio
- OBJ-02: Recogida automatizada de precios (web scraping)
- OBJ-03: Procesamiento de tickets con OCR
- OBJ-04: Portal para PYMEs con gestión de precios
- OBJ-05: App móvil con asistente LLM de compra

**Slide 6 — Requisitos clave y comparativa**
- Tabla comparativa: BarGAIN vs Idealo vs Too Good to Go vs Mercadona App
- BarGAIN es el único que combina: multi-tienda + optimización ruta + OCR + PYME portal
- 3 requisitos no funcionales verificados: disponibilidad, usabilidad, escalabilidad

---

### BLOQUE 4: Solución, Diseño y Arquitectura (5 slides) — 6-12 min

**Slide 7 — Arquitectura del sistema**
- Diagrama: Frontend (Expo + React) ↔ Backend (Django/DRF) ↔ BD (PostgreSQL+PostGIS)
- Servicios externos: ORS API (rutas), Google Vision (OCR), Gemini (LLM), Expo Push
- Workers asíncronos: Celery + Redis para scraping y tareas pesadas
- Stack completo: Python 3.12 / Django 5 / React Native / Expo / PostGIS

**Slide 8 — El algoritmo de optimización**
- Diagrama de flujo: Lista → Ingesta precios → Candidatos → Evaluación geoespacial → Score → Top-3
- Scoring multicriterio con OR-Tools (VRP) + ORS API (distancias reales)
- Captura: pantalla de resultado con 3 rutas alternativas ordenadas por score

**Slide 9 — Web scraping y precios**
- Arquitectura Scrapy + Playwright para páginas dinámicas (JS)
- 4 spiders: Mercadona, Carrefour, Lidl, DIA
- Pipeline: Spider → Item → Validación → BD PostgreSQL
- Frecuencia: cada 6h via Celery Beat (configurable)

**Slide 10 — OCR y Portal Business**
- OCR: foto ticket → Google Vision API → fuzzy matching → productos en lista
- Portal Business: PYME propone precio → admin aprueba → visible a usuarios
- Captura: flujo OCR en móvil + dashboard PYME

**Slide 11 — App móvil y Asistente LLM**
- React Native + Expo: Android y iOS desde una sola base de código
- Captura: 4 pantallas principales (lista, optimización, OCR, asistente)
- Asistente Gemini 2.0 Flash: solo responde consultas de compra (guardrails)

---

### BLOQUE 5: Resultados (4 slides) — 13-18 min

**Slide 12 — Demo (vídeo)**
- [VÍDEO GRABADO — duración: ~3 min]
- Cubre: login → lista → optimizar → ver ruta en mapa → OCR ticket → asistente

**Slide 13 — Tests y cobertura**
- Backend: ~40 tests (unit + integration), cobertura >80%
- E2E: 4 flujos Playwright automatizados (auth, business, optimizer, OCR)
- UAT: 5 flujos de negocio verificados manualmente en iPhone
- Tabla resumen: tipo | cantidad | resultado

**Slide 14 — Validación de requisitos no funcionales**
- NFR-02 (Disponibilidad): Health check en Render staging funcionando
- NFR-04 (Usabilidad): ≤ 3 taps para cada flujo principal verificado
- NFR-05 (Escalabilidad): Celery workers independientes + PostGIS spatial index + stateless API

**Slide 15 — Métricas del proyecto**
- Líneas de código: ~8.000 (backend) + ~6.000 (frontend)
- Commits: >150 en 6 meses
- Horas reales: ~520 h (según TASKS.md)
- Comparativa horas estimadas vs reales por fase

---

### BLOQUE 6: Conclusiones (3 slides) — 19-23 min

**Slide 16 — Logros alcanzados**
- ✅ Algoritmo OPT implementado y desplegado en staging
- ✅ 4 spiders de scraping + pipeline de datos
- ✅ OCR con Google Vision + fuzzy matching
- ✅ Portal PYME con flujo de aprobación
- ✅ App móvil iOS + Android funcional
- ✅ Asistente LLM con guardrails
- ✅ E2E tests automatizados (Playwright)

**Slide 17 — Limitaciones y trabajo futuro**
- Limitaciones reales (cold start Render, 4 cadenas de scraping, cert iOS 7 días)
- Trabajo futuro: publicación en stores, más cadenas, precios tiempo real, reseñas productos

**Slide 18 — Conclusión personal**
- Competencias desarrolladas: arquitectura de microservicios, geoespacial, ML/IA integrada
- Aprendizaje más valioso: integrar sistemas heterogéneos (LLM + scraping + geoespacial + OCR)
- Frase de cierre: "BarGAIN demuestra que la tecnología puede democratizar el acceso a información
  de precios para que tanto consumidores como pequeños comercios puedan tomar mejores decisiones."

---

### BLOQUE 7: Cierre (2 slides) — 23-25 min

**Slide 19 — Información del repositorio**
- GitHub: https://github.com/QHX0329/bargain-tfg
- Stack visual (badges/logos: Python, Django, React Native, PostgreSQL, Docker)
- QR code del repo

**Slide 20 — ¿Preguntas?**
- Imagen de la app en uso (mapa con ruta optimizada)
- Contacto: correo del autor

---

## Notas para la presentación oral

### Preguntas frecuentes del tribunal (preparar respuestas)

1. **¿Por qué no usar la API oficial de Mercadona en vez de scraping?**
   Mercadona no tiene API pública. El scraping es el único método disponible para cadenas
   que no exponen sus datos. El sistema está preparado para integrar APIs oficiales cuando
   estén disponibles (campo `source` en el modelo Price: api/scraping/crowdsourcing/business).

2. **¿Cómo escala el algoritmo de optimización con muchos productos?**
   El mayor cuello de botella es la matriz de distancias ORS (N² distancias para N tiendas).
   Con radio=10km en Sevilla típicamente hay 5-15 tiendas relevantes — el espacio de búsqueda
   es manejable. Para listas grandes se aplica un límite de 30 tiendas candidatas y 4 paradas.

3. **¿Qué precisión tiene el OCR en tickets reales?**
   Google Vision tiene >95% de precisión en texto impreso claro. El fuzzy matching usa
   similaridad de trigramas con umbral del 80% para normalizar variaciones de nombre.
   Los falsos positivos se resuelven por confirmación del usuario.

4. **¿Por qué OR-Tools y no un algoritmo propio?**
   OR-Tools es la librería de optimización combinatoria de Google, usada en producción
   por empresas de logística. Para el TFG justifica la elección con el argumento de
   "usar herramientas de nivel industrial" vs reinventar la rueda.

5. **¿Cómo garantizas la privacidad de la ubicación del usuario?**
   La ubicación solo se envía al backend para la consulta de optimización. Se almacena en
   OptimizationResult para el historial del usuario (con consentimiento explícito en el
   onboarding). No se comparte con terceros.

6. **¿Por qué Gemini en vez de GPT-4/Claude?**
   ADR-008: Gemini 2.0 Flash tiene la mejor relación precio/calidad para queries de compra
   (textos cortos, contexto estructurado). El sistema está desacoplado del proveedor LLM
   mediante una capa de servicio, por lo que cambiar de modelo requiere solo actualizar la
   configuración.
