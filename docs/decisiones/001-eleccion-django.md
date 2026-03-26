# ADR-001: Elección de Django como framework backend

## Estado
Aceptado

## Contexto
Se necesita un framework backend que soporte: API REST, integración con PostgreSQL/PostGIS para cálculos geoespaciales, tareas asíncronas (scraping), ORM robusto para modelos complejos, y un ecosistema maduro con documentación en español.

## Decisión
Se elige **Django 5.x** con **Django REST Framework** como framework backend principal.

## Alternativas Consideradas

| Framework | Pros | Contras |
|-----------|------|---------|
| **Django + DRF** | ORM maduro, admin integrado, PostGIS nativo, gran ecosistema, comunidad activa | Monolítico, menos flexible que microservicios |
| FastAPI | Async nativo, tipado, rápido | Ecosistema más joven, sin ORM propio, sin admin |
| Express.js (Node) | JavaScript full-stack con React Native | ORM menos maduro, PostGIS requiere más configuración |
| Spring Boot | Enterprise-grade, tipado fuerte | Sobreingeniería para un TFG, curva de aprendizaje |

## Justificación
- **PostGIS nativo**: `django.contrib.gis` ofrece soporte de primera clase para campos geoespaciales, consultas por distancia y operaciones espaciales, esencial para el algoritmo de optimización de rutas.
- **ORM potente**: Modelos complejos con relaciones, validaciones y migraciones automáticas.
- **Admin integrado**: Panel de administración inmediato para gestión de datos durante desarrollo.
- **Celery**: Integración probada para tareas asíncronas de scraping.
- **Comunidad**: Amplia documentación, tutoriales y paquetes disponibles.
- **Familiaridad**: Stack Python alineado con las herramientas de IA/ML del proyecto (Google Cloud Vision API, OR-Tools, Anthropic SDK).

## Consecuencias
- El backend será un monolito modular (no microservicios), adecuado para el alcance del TFG.
- Se usará Python 3.12+ para type hints nativos y mejoras de rendimiento.
- Las operaciones pesadas (scraping, OCR, optimización) se delegan a Celery para no bloquear la API.
