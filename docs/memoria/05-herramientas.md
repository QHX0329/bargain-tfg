# 5. Herramientas Utilizadas y Justificación Tecnológica

## 5.1 Criterios de selección

La selección de herramientas de BargAIn se ha realizado con un enfoque de ingeniería
orientado a: (i) adecuación funcional al problema, (ii) mantenibilidad del producto,
(iii) madurez del ecosistema, (iv) coste de operación en fase de TFG y
(v) facilidad de despliegue incremental a producción.

La arquitectura final responde a un sistema de compra inteligente con requisitos
geoespaciales, procesamiento asíncrono, integración de IA y cliente móvil/web,
por lo que se priorizaron tecnologías con amplia adopción, documentación sólida y
capacidad de integración entre sí.

## 5.2 Tabla comparativa de alternativas

La siguiente tabla resume las alternativas principales evaluadas y la justificación de
la decisión adoptada para el proyecto.

| Área                      | Opción elegida                           | Alternativas consideradas                                                        | Criterios comparados                                                | Decisión y justificación                                                                                                                                                          |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend API               | Django 5 + DRF                           | FastAPI, Flask                                                                   | Productividad, estructura, admin, seguridad, curva de mantenimiento | Se elige Django + DRF por su enfoque baterías incluidas, estructura robusta para crecimiento por módulos y buen soporte para autenticación, permisos y APIs empresariales.        |
| Base de datos geoespacial | PostgreSQL 16 + PostGIS                  | MySQL + extensiones GIS, MongoDB + geoespacial                                   | Consultas espaciales, integridad relacional, madurez GIS            | Se selecciona PostgreSQL + PostGIS por su madurez en operaciones geoespaciales y su ajuste natural a un dominio con entidades relacionales (productos, tiendas, precios, listas). |
| Cliente móvil/web         | React Native (Expo) + React Web          | Flutter, Ionic/Capacitor                                                         | Reutilización de lógica, tiempo de desarrollo, ecosistema JS/TS     | Se adopta Expo/React Native por velocidad de iteración, reutilización con React y ecosistema amplio para mapas, navegación y estado global.                                       |
| Estado global frontend    | Zustand                                  | Redux Toolkit, Context API                                                       | Simplicidad, boilerplate, escalabilidad media                       | Se escoge Zustand por menor complejidad inicial y buena ergonomía para un TFG con evolución incremental.                                                                          |
| Comunicación HTTP         | Axios                                    | Fetch API nativa                                                                 | Interceptores JWT, manejo de errores, consistencia                  | Se utiliza Axios por soporte directo de interceptores para access/refresh token y estandarización de clientes API.                                                                |
| Tareas asíncronas         | Celery + Redis                           | RQ, Dramatiq, cron directo                                                       | Retries, scheduling, madurez, ecosistema Django                     | Celery + Redis ofrece patrón probado para colas, tareas periódicas y reintentos, clave para scraping y mantenimiento de precios.                                                  |
| Scraping                  | Scrapy + Playwright                      | BeautifulSoup + requests, Selenium                                               | Escalabilidad scraping, sitios dinámicos, robustez                  | Se combina Scrapy (pipeline y rendimiento) con Playwright (renderizado JS) para cubrir supermercados con distintos niveles de complejidad web.                                    |
| OCR                       | Tesseract OCR (pytesseract en backend)   | Google Vision OCR, AWS Textract                                                  | Coste, control local, dependencia externa                           | Se prioriza Tesseract por coste cero de licenciamiento y capacidad de integración local para prototipado académico.                                                               |
| Optimización de rutas     | OR-Tools + algoritmo ponderado propio    | Heurísticas ad hoc puras, motores externos cerrados                              | Calidad de solución, reproducibilidad, control experimental         | OR-Tools aporta solvers de referencia y permite combinar un modelo formal con la función multicriterio definida para BargAIn.                                                     |
| Asistente LLM             | Claude API (vía backend)                 | OpenAI API, modelos open source autoalojados                                     | Calidad conversacional, integración, gobernanza de acceso           | Se integra Claude vía backend para centralizar seguridad, trazabilidad y control del contexto de compra.                                                                          |
| Observabilidad            | Sentry + structlog                       | Logging básico, Rollbar                                                          | Trazabilidad de errores, depuración, coste                          | Sentry facilita captura estructurada de excepciones y structlog estandariza logs para diagnóstico en desarrollo y staging.                                                        |
| CI/CD                     | GitHub Actions                           | GitLab CI, Jenkins                                                               | Integración con repositorio, mantenimiento, coste                   | GitHub Actions reduce fricción operativa al estar integrado con el control de versiones del proyecto.                                                                             |
| Contenedores y entorno    | Docker + Docker Compose (modelo híbrido) | Entorno totalmente local sin contenedores, Docker full-stack incluyendo frontend | Reproducibilidad backend, DX en Windows, complejidad                | Se adopta modelo híbrido: backend en Docker y frontend nativo en host, evitando problemas de HMR/volúmenes en Expo sobre Windows.                                                 |

## 5.3 Stack finalmente adoptado

### 5.3.1 Backend y API

- Django 5.x
- Django REST Framework
- django-filter
- djangorestframework-simplejwt

La capa backend se organiza por aplicaciones de dominio (users, products, stores,
prices, shopping_lists, optimizer, ocr, assistant, business, notifications), lo que
favorece cohesión modular y pruebas aisladas.

### 5.3.2 Persistencia y geolocalización

- PostgreSQL 16
- PostGIS 3.4
- psycopg 3

El soporte GIS es un requisito estructural para consultas por radio, cálculo de
proximidad y evaluación de rutas en el optimizador.

### 5.3.3 Frontend

- React Native con Expo
- React Navigation
- Zustand
- Axios
- TypeScript

Este conjunto permite construir una experiencia móvil prioritaria y mantener
consistencia de código con el companion web.

### 5.3.4 Procesamiento asíncrono y scraping

- Celery
- Redis
- django-celery-beat
- Scrapy
- Playwright

La separación entre API síncrona y procesos en segundo plano evita bloquear el
servicio ante tareas costosas (ingesta de precios, recálculos, jobs periódicos).

### 5.3.5 IA y optimización

- Claude API (integración backend)
- Tesseract OCR
- OR-Tools
- thefuzz

Este bloque cubre interacción en lenguaje natural, extracción de texto de tickets y
optimización multicriterio precio-distancia-tiempo.

### 5.3.6 Calidad, observabilidad y operaciones

- Ruff (lint y formato backend)
- ESLint + Prettier (frontend)
- Jest + React Native Testing Library
- pytest + pytest-django
- Sentry
- structlog
- GitHub Actions

Estas herramientas garantizan un flujo de validación continuo y mejoran la
confiabilidad del producto durante el desarrollo iterativo.

## 5.4 Adecuación al contexto del TFG

Desde una perspectiva académica y de viabilidad, el stack elegido ofrece equilibrio
entre rigor técnico y capacidad de ejecución en el marco temporal del proyecto.
La combinación de tecnologías maduras y ampliamente documentadas reduce riesgo
de implementación, facilita la defensa metodológica de decisiones y permite
trazabilidad clara entre requisitos, arquitectura y resultados de pruebas.

Asimismo, la elección de herramientas con versión comunitaria y bajo coste de entrada
resulta coherente con un entorno de prototipado avanzado, manteniendo una vía realista
de evolución futura a un despliegue productivo.

## 5.5 Limitaciones de las herramientas elegidas

Aunque la selección tecnológica es adecuada al alcance del TFG, se identifican
limitaciones relevantes que condicionan la evolución del sistema:

1. Dependencia de servicios de terceros. Integraciones como Claude API y Google
   Maps/OSRM introducen riesgo de variación en costes, cuotas y latencia, además de
   dependencia de disponibilidad externa.
2. Sensibilidad del scraping ante cambios de interfaz. La combinación Scrapy +
   Playwright ofrece robustez, pero sigue siendo vulnerable a modificaciones en las
   webs objetivo, lo que exige mantenimiento continuo de spiders.
3. Rendimiento en escenarios de alta carga. Celery + Redis resulta adecuado para el
   volumen esperado en fase académica, pero un crecimiento significativo de usuarios
   requeriría ajuste de concurrencia, colas y estrategia de observabilidad.
4. Precisión del OCR en datos no estructurados. Tesseract presenta degradación de
   calidad en imágenes con iluminación deficiente, escritura irregular o tickets
   deteriorados, lo que obliga a incorporar validación posterior por parte del usuario.
5. Complejidad operativa del entorno híbrido. El modelo backend en Docker y frontend
   nativo en host mejora la experiencia de desarrollo en Windows, pero introduce
   diferencias entre entornos que deben controlarse con documentación y automatización.

Estas limitaciones no invalidan la elección realizada; delimitan el marco de validez
del prototipo y definen líneas de mejora prioritaria para fases posteriores.
