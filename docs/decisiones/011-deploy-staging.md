# ADR-011: Estrategia de Despliegue en Staging

## Estado
Aceptado — Alternativa D: Render + OpenRouteService API

## Contexto

Phase 7 requiere un entorno de staging accesible para:
1. Validar NFR-02 (disponibilidad 99% mensual)
2. Grabar el vídeo de demo para la defensa
3. Servir de backend para la app iOS (sideload) en el día de defensa

El stack a desplegar es: Django API + PostgreSQL + Redis + Celery worker + Celery beat + Graphhopper.

**El punto crítico es Graphhopper:** necesita cargar el PBF de OSM (Sevilla/Andalucía ~90 MB comprimido) y procesarlo en memoria. La JVM de Graphhopper requiere ~512 MB–1 GB de RAM con el recorte andaluz. Esto condiciona la plataforma elegida.

## Alternativas Consideradas

### Alternativa A — Render (plan gratuito, actual)

| Servicio | Render tier | RAM | Coste |
|----------|-------------|-----|-------|
| Django API | Web Service (free) | 512 MB | 0 € |
| PostgreSQL | Render DB (free) | — | 0 € (90 días) |
| Redis | Render Redis (free) | 25 MB | 0 € (90 días) |
| Celery worker | Background Worker (free) | 512 MB | 0 € |
| Celery beat | Background Worker (free) | 512 MB | 0 € |
| Graphhopper | Private Service (free) | 512 MB | 0 € |

**Ventajas:**
- Coste cero durante los 90 días del plan gratuito
- Render soporta Docker images en Private Services
- Familiar: documentado en `docs/memoria/06-planificacion.md`

**Problemas:**
- 512 MB RAM para Graphhopper con Andalucía OSM es **insuficiente** (la JVM necesita ~700 MB–1 GB)
- Los Web Services gratuitos se suspenden tras 15 min de inactividad (cold start de ~30 s en la demo)
- Solución paliativa: haversine fallback en el optimizer si Graphhopper OOM → distancias incorrectas

**Veredicto:** Viable si se sustituye Graphhopper self-hosted por OpenRouteService API (ver Alternativa D). Sin esa sustitución, Graphhopper no cabe en el free tier.

---

### Alternativa B — Hetzner CX22 VPS (~4,5 €/mes)

Un único VPS donde corre todo el `docker-compose.yml` de producción.

| Spec | Valor |
|------|-------|
| RAM | 4 GB |
| vCPU | 2 shared |
| Disco | 40 GB SSD |
| Tráfico | 20 TB/mes |
| Coste | ~4,5 €/mes |

**Ventajas:**
- 4 GB RAM: Graphhopper con Andalucía OSM funciona sin ajustes
- Sin cold starts: todos los servicios están siempre activos
- `docker-compose up -d` despliega el stack completo en minutos
- Nginx + Certbot para HTTPS en un paso
- Entorno realista: idéntico al `docker-compose.yml` de prod
- Control total sobre versiones y configuración

**Desventajas:**
- Requiere gestión manual del servidor (actualizaciones, SSL, etc.)
- Sin auto-scaling ni health-check automático de Render/Railway
- Coste mensual (~4,5 €), aunque mínimo en el contexto de un TFG

**Veredicto:** La opción más robusta para el TFG. Graphhopper funciona sin restricciones, el stack es idéntico al local, y el coste es despreciable. Recomendada si el tutor o tribunal espera un deploy "real".

---

### Alternativa C — Railway (plan Hobby, $5/mes crédito gratuito)

| Característica | Valor |
|----------------|-------|
| RAM por servicio | hasta 8 GB |
| Crédito gratuito | $5/mes (≈ 4,5 €) |
| Docker Compose | Soportado |
| PostgreSQL/Redis | Plugins nativos |

**Ventajas:**
- Soporta Docker Compose directamente — despliegue del stack completo en un CLI
- RAM suficiente para Graphhopper sin configuración especial
- Interfaz más amigable que un VPS bare-metal
- PostgreSQL y Redis como plugins gestionados

**Desventajas:**
- El crédito de $5/mes puede agotarse si los servicios corren 24/7 (Graphhopper es CPU/RAM intensivo al arrancar)
- Si se supera el crédito, Railway suspende todos los servicios sin previo aviso
- Requiere tarjeta de crédito para el plan Hobby

**Veredicto:** Buena alternativa si se prefiere PaaS sobre VPS. El riesgo principal es el agotamiento del crédito gratuito si los builds de Graphhopper son frecuentes.

---

### Alternativa D — Render + OpenRouteService API (eliminar Graphhopper self-hosted)

En lugar de desplegar Graphhopper, usar la **API pública de OpenRouteService (ORS)** para el cálculo de matrices de distancia.

| Plan ORS | Límite |
|----------|--------|
| Free | 40 req/min, 2.000 req/día |
| Sin coste adicional | — |

El optimizer (`apps/optimizer/services.py`) ya encapsula la llamada a Graphhopper vía HTTP. Cambiar la URL de `http://graphhopper:8989` a `https://api.openrouteservice.org/v2/matrix/driving-car` requiere solo ajustar el adaptador y la API key.

**Ventajas:**
- Elimina el problema de RAM de Graphhopper completamente
- Stack en Render queda con solo 5 servicios (sin Private Service de Graphhopper)
- El free tier de ORS (2.000 req/día) es suficiente para staging y demos

**Desventajas:**
- Dependencia de servicio externo (ORS podría no estar disponible en la demo)
- Los límites de rate (40 req/min) pueden impactar si Playwright E2E lanza muchas optimizaciones seguidas
- Cambio de contrato de API (Graphhopper matrix API ≠ ORS matrix API — payload distinto)

**Veredicto:** Excelente si se prioriza simplicidad de despliegue. El riesgo de disponibilidad de ORS es bajo pero existe. Mitigación: pre-calentar la demo y tener Graphhopper local como fallback.

---

## Comparativa

| Criterio | A: Render puro | B: Hetzner VPS | C: Railway | D: Render+ORS |
|----------|---------------|----------------|------------|---------------|
| Graphhopper | ❌ OOM probable | ✅ 4 GB RAM | ✅ hasta 8 GB | ✅ sin self-host |
| Coste mensual | 0 € | ~4,5 € | ~0 € (crédito) | 0 € |
| Cold starts | ❌ 30 s | ✅ ninguno | ✅ ninguno | ❌ 30 s |
| Gestión manual | mínima | media | mínima | mínima |
| Fiabilidad demo | media | alta | alta | alta* |
| Idéntico a prod | parcial | ✅ total | parcial | parcial |
| Complejidad setup | baja | media | baja | baja |

*ORS depende de servicio externo

## Decisión

**Alternativa D — Render + OpenRouteService API.**

Se elige eliminar Graphhopper self-hosted y sustituirlo por la API pública de OpenRouteService
en staging. El optimizer en `apps/optimizer/services.py` adaptará el cliente HTTP para llamar
a `https://api.openrouteservice.org/v2/matrix/driving-car` con la API key como variable de entorno.

## Consecuencias (según opción elegida)

**Si B (Hetzner VPS):**
- Crear servidor en Hetzner, instalar Docker, configurar nginx + Certbot
- Adaptar `docker-compose.yml` para producción real (variables de entorno, volúmenes persistentes)
- CI/CD: añadir step en GitHub Actions para SSH deploy al VPS

**Si D (Render + ORS):**
- Adaptar `apps/optimizer/services.py` para llamar a ORS matrix API (payload distinto a Graphhopper)
- Gestionar API key de ORS como variable de entorno en Render
- Eliminar servicio Graphhopper del plan de deploy en Render

---

## Instrucciones de despliegue en Render (actualizado 2026-04-08)

### Prerequisitos
- Plan 07-01 completado (`render.yaml` en raíz del repo, ORS integrado)
- Cuenta en Render.com conectada al repositorio GitHub

### Proceso de despliegue inicial

1. **Crear Blueprint en Render:**
   - Render Dashboard → New → Blueprint
   - Seleccionar repositorio `bargain-tfg`
   - Render detecta `render.yaml` y crea los 5 servicios automáticamente:
     `bargain-api`, `bargain-postgres`, `bargain-redis`, `bargain-celery-worker`, `bargain-celery-beat`

2. **Configurar variables de entorno (sync: false):**
   En el Dashboard de Render para el servicio `bargain-api`:
   ```
   SECRET_KEY=<generar con: python -c "import secrets; print(secrets.token_urlsafe(50))">
   ALLOWED_HOSTS=bargain-api.onrender.com
   ORS_API_KEY=<clave de openrouteservice.org>
   GOOGLE_MAPS_API_KEY=<Google Cloud Console>
   GEMINI_API_KEY=<Google AI Studio>
   GOOGLE_CLOUD_VISION_API_KEY=<Google Cloud Console>
   CORS_ALLOWED_ORIGINS=http://localhost:5173,https://bargain-api.onrender.com
   ```
   Para workers, Render ya inyecta `DATABASE_URL` y `REDIS_URL` desde `render.yaml`
   (`fromDatabase` / `fromService`). Solo define las variables `sync: false` que aplique
   a cada servicio (por ejemplo `SECRET_KEY`, `ORS_API_KEY`).

3. **Primer deploy:**
   - El servicio `bargain-api` ejecuta automáticamente `migrate` y `collectstatic`
     en `dockerCommand` antes de levantar Gunicorn.
   - Tras desplegar, crea únicamente el superusuario desde Render Dashboard → Shell:
   ```bash
   python manage.py createsuperuser
   ```

4. **Verificar salud del servicio:**
   ```
   curl https://bargain-api.onrender.com/api/v1/health/
   # Esperado: {"status": "ok"}
   ```

5. **Re-despliegues automáticos:**
   Cada push a `main` dispara un nuevo deploy (configurado en render.yaml).

### Sideload iOS para la demo

1. Ir a `.github/workflows/ios-build.yml` → Actions → Run workflow
2. Descargar el artefacto `BarGAIN-unsigned-*.ipa` del run
3. En Windows: abrir Sideloadly → arrastrar el `.ipa` → conectar iPhone por USB
4. Iniciar sesión con Apple ID gratuito → Install
5. En iPhone: Settings → General → VPN & Device Management → confiar en el certificado
6. **Programar re-sideload 1-2 días antes de la defensa** (certificado gratuito caduca en 7 días)

