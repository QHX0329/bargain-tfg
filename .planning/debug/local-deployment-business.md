---
status: resolved
trigger: "El usuario quiere saber cómo desplegar la app en local paso a paso y acceder a la parte de 'business' desde su ordenador."
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T00:00:00Z
---

## Current Focus

hypothesis: No es un bug — es una pregunta de documentación sobre proceso de despliegue local y acceso al portal business.
test: Investigación de archivos del proyecto
expecting: Guía completa generada
next_action: COMPLETE — guía entregada al usuario

## Symptoms

expected: Poder levantar la app localmente y navegar a la sección de business portal
actual: No sabe los pasos exactos para hacerlo
errors: Ninguno reportado
reproduction: N/A
started: Nueva pregunta

## Eliminated

- hypothesis: No hay bug que eliminar — investigación documental pura
  evidence: El usuario solo pregunta cómo hacerlo
  timestamp: 2026-03-19

## Evidence

- timestamp: 2026-03-19
  checked: docker-compose.dev.yml
  found: Backend corre en Docker (postgres:5432, redis:6379, backend:8000, celery, celery-beat). Usa Dockerfile.dev. El backend sobreescribe DATABASE_URL y REDIS_URL con hostnames de servicio Docker.
  implication: Para desarrollo solo hace falta `make dev` (o `docker-compose -f docker-compose.dev.yml up -d`)

- timestamp: 2026-03-19
  checked: .env.example
  found: Variables críticas: SECRET_KEY, DATABASE_URL, REDIS_URL, CORS_ALLOWED_ORIGINS, JWT_*, GOOGLE_MAPS_API_KEY, ANTHROPIC_API_KEY. Las variables GDAL/GEOS solo son necesarias en host — dentro de Docker están preinstaladas en la imagen postgis.
  implication: El .env mínimo viable para desarrollo local no requiere Google Maps ni Anthropic (solo opcionales para mapas y asistente).

- timestamp: 2026-03-19
  checked: seed_data.py
  found: `make seed-docker` crea: 1 admin (seed_admin / seedpass123), 10 consumers (seed_consumer_1..10 / seedpass123), 5 business (seed_business_1..5 / seedpass123). Los business profiles se crean con is_verified=True.
  implication: Para probar el portal business basta con iniciar sesión como seed_business_1 con contraseña seedpass123.

- timestamp: 2026-03-19
  checked: backend/apps/business/views.py + config/urls.py
  found: Endpoints business en /api/v1/business/. BusinessProfileViewSet requiere role='business'. PromotionViewSet y BusinessPriceViewSet requieren IsVerifiedBusiness (role business + is_verified=True).
  implication: El usuario seed_business_1 ya tiene is_verified=True, puede usar todos los endpoints inmediatamente.

- timestamp: 2026-03-19
  checked: frontend/src/navigation/MainTabs.tsx + RootNavigator.tsx
  found: La app React Native tiene 5 tabs: Inicio, Listas, Mapa, Asistente, Perfil. NO hay tab dedicado para "business" en el frontend móvil — el portal business es exclusivamente accesible vía API REST o Django Admin.
  implication: Para probar el portal business desde el ordenador, hay que usar Swagger UI (/api/v1/schema/swagger-ui/) o el Django Admin (/admin/).

- timestamp: 2026-03-19
  checked: Makefile
  found: `make dev` = docker-compose up -d (backend completo). `make frontend` = npx expo start --web. `make seed-docker` = seed en Docker. `make createsuperuser-docker` = crear admin Django. `make migrate-docker` = migraciones.
  implication: El flujo completo está orquestado por Makefile.

## Resolution

root_cause: No hay bug. El usuario necesita documentación del proceso de despliegue local.
fix: Guía completa generada y entregada en la respuesta al usuario.
verification: Investigación documental completa — todos los archivos clave leídos.
files_changed: []
