# 8. Diseño e Implementación

## 8.1 Arquitectura del Sistema

### 8.1.1 Visión general

BargAIn sigue una arquitectura de **tres capas** clásica (presentación, lógica de negocio y datos), desplegada mediante contenedores Docker y organizada internamente según los principios de la **arquitectura hexagonal** (puertos y adaptadores). Esta elección permite desacoplar la lógica de dominio de los detalles de infraestructura —bases de datos, APIs externas, brokers de mensajería— facilitando el testing independiente de cada componente y la sustitución de servicios sin alterar el núcleo del sistema.

Para evitar duplicidad con la Sección 5, en este capítulo se describen decisiones de
diseño e implementación, mientras que la justificación comparativa de herramientas se
mantiene centralizada en el apartado de herramientas utilizadas.

La arquitectura global se divide en cinco bloques principales que se comunican de forma asíncrona o mediante API REST:

1. **Aplicación cliente:** React Native (Expo) para iOS y Android, con una aplicación web React para el Portal Business de PYMEs.
2. **API Backend:** Django REST Framework como núcleo de la lógica de negocio, expuesto bajo HTTPS mediante Gunicorn + Nginx.
3. **Capa de datos:** PostgreSQL 16 con extensión PostGIS 3.4 para consultas geoespaciales.
4. **Capa de tareas asíncronas:** Celery con Redis como broker, para scraping periódico, envío de notificaciones, procesamiento OCR y cálculos pesados de optimización.
5. **Integraciones y servicios auxiliares:** Claude API (Anthropic), Google Maps / OSRM,
   Sentry y motor OCR Tesseract (ejecutado en servicios del backend).

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTES                                │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │  App Móvil          │    │  Portal Business (Web)   │   │
│  │  React Native/Expo  │    │  React                   │   │
│  │  iOS + Android      │    │  (Companion web)         │   │
│  └──────────┬──────────┘    └────────────┬─────────────┘   │
└─────────────┼──────────────────────────── ┼────────────────┘
              │  HTTPS + JWT                │
┌─────────────▼────────────────────────────▼────────────────┐
│                   NGINX (Reverse Proxy)                    │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│              DJANGO REST FRAMEWORK (Gunicorn)              │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │
│  │  users   │ │products  │ │  stores   │ │   prices    │  │
│  ├──────────┤ ├──────────┤ ├───────────┤ ├─────────────┤  │
│  │shopping  │ │optimizer │ │  scraping │ │  assistant  │  │
│  ├──────────┤ ├──────────┤ ├───────────┤ ├─────────────┤  │
│  │   ocr    │ │business  │ │   notif.  │ │    core     │  │
│  └──────────┘ └──────────┘ └───────────┘ └─────────────┘  │
└────────────────────┬───────────────────────────────────────┘
          ┌──────────┼──────────┐
          │          │          │
┌─────────▼──┐  ┌────▼────┐  ┌─▼──────────────┐
│ PostgreSQL │  │  Redis  │  │ Celery Workers │
│ + PostGIS  │  │ (Broker)│  │ (Async tasks)  │
└────────────┘  └─────────┘  └────────────────┘
```

### 8.1.2 Patrón de organización interna del backend

Cada aplicación Django del backend sigue una estructura modular consistente que separa responsabilidades:

```
apps/<modulo>/
├── models.py          # Entidades de dominio (ORM)
├── serializers.py     # Transformación de datos (entrada/salida)
├── views.py           # ViewSets y vistas (controladores)
├── urls.py            # Rutas del módulo
├── services.py        # Lógica de negocio (desacoplada de la vista)
├── tasks.py           # Tareas Celery asíncronas
├── permissions.py     # Lógica de autorización específica
├── filters.py         # Filtros DRF (django-filter)
└── tests/
    ├── test_models.py
    ├── test_views.py
    └── test_services.py
```

La separación entre `views.py` y `services.py` es deliberada: los ViewSets se limitan a la gestión HTTP (autenticación, serialización, códigos de respuesta), mientras que la lógica de negocio reside exclusivamente en los servicios, lo que permite invocarla desde tareas Celery, comandos de gestión o tests sin necesidad de simular peticiones HTTP.

### 8.1.3 Comunicación entre componentes

- **Frontend → Backend:** API REST con autenticación JWT (Bearer token). El cliente Axios gestiona la renovación automática del token de acceso usando el refresh token cuando recibe un `401 Unauthorized`.
- **Backend → Celery:** Encolar tareas mediante `.delay()` o `.apply_async()` sobre el broker Redis.
- **Backend → PostgreSQL:** Django ORM con consultas geoespaciales mediante
  `django.contrib.gis` y capacidades nativas de PostGIS.
- **Backend → APIs externas:** Clientes HTTP aislados en `apps/<modulo>/clients/` para Google Maps, Claude API y OSRM. Esto permite mockearlos en tests sin afectar a la lógica de negocio.

---

## 8.2 Modelo de Datos

### 8.2.1 Diseño del modelo entidad-relación

El modelo de datos está diseñado para soportar los tres pilares del sistema: catálogo de productos normalizados, gestión geoespacial de tiendas, e histórico temporal de precios. A continuación se describe el esquema principal y las relaciones entre entidades.

#### Módulo de usuarios

```
User (AbstractBaseUser)
├── id              UUID (PK)
├── email           VARCHAR(255) UNIQUE
├── username        VARCHAR(150) UNIQUE
├── first_name      VARCHAR(100)
├── last_name       VARCHAR(100)
├── phone           VARCHAR(20) NULL
├── avatar          ImageField NULL
├── role            ENUM(consumer, business, admin)
├── default_location PointField(SRID=4326) NULL
├── max_radius_km   DECIMAL(5,2) DEFAULT 10.0
├── max_stops       SMALLINT DEFAULT 3
├── optimization_pref ENUM(price, time, balanced)
├── is_active       BOOLEAN DEFAULT True
├── date_joined     TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ

UserNotificationPrefs
├── user            FK → User (1:1)
├── push_enabled    BOOLEAN DEFAULT True
├── email_enabled   BOOLEAN DEFAULT True
├── price_alerts    BOOLEAN DEFAULT True
├── promo_alerts    BOOLEAN DEFAULT True
└── shared_list_alerts BOOLEAN DEFAULT True
```

#### Módulo de productos

```
Category
├── id              SERIAL (PK)
├── name            VARCHAR(100)
├── slug            VARCHAR(110) UNIQUE
├── description     TEXT NULL
├── parent          FK → Category NULL (self-reference)
├── icon_url        VARCHAR(500) NULL
└── sort_order      SMALLINT DEFAULT 0

Brand
├── id              SERIAL (PK)
├── name            VARCHAR(150)
├── logo_url        VARCHAR(500) NULL
└── is_own_brand    BOOLEAN DEFAULT False  -- marca blanca

Product
├── id              UUID (PK)
├── name            VARCHAR(255)
├── normalized_name VARCHAR(255)           -- para matching fuzzy
├── barcode         VARCHAR(20) NULL UNIQUE
├── category        FK → Category
├── brand           FK → Brand NULL
├── unit            ENUM(kg, g, l, ml, unit, pack)
├── unit_quantity   DECIMAL(10,3)
├── image_url       VARCHAR(500) NULL
├── is_active       BOOLEAN DEFAULT True
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ
```

#### Módulo de tiendas

```
Chain
├── id              SERIAL (PK)
├── name            VARCHAR(150)
├── logo_url        VARCHAR(500) NULL
├── website_url     VARCHAR(500) NULL
├── has_official_api BOOLEAN DEFAULT False
├── brand_color     VARCHAR(7)             -- hex color
└── is_active       BOOLEAN DEFAULT True

Store
├── id              UUID (PK)
├── name            VARCHAR(255)
├── chain           FK → Chain NULL        -- null si es PYME independiente
├── address         VARCHAR(500)
├── location        PointField(SRID=4326)  -- índice GiST
├── opening_hours   JSONB                  -- {mon: [{open: "09:00", close: "21:00"}], ...}
├── phone           VARCHAR(20) NULL
├── is_local_business BOOLEAN DEFAULT False
├── subscription_tier ENUM(free, basic, premium)
├── is_active       BOOLEAN DEFAULT True
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ
```

#### Módulo de precios

```
Price
├── id              UUID (PK)
├── product         FK → Product
├── store           FK → Store
├── price           DECIMAL(10,2)
├── unit_price      DECIMAL(10,4) NULL     -- precio/unidad de medida
├── offer_price     DECIMAL(10,2) NULL
├── offer_end_date  DATE NULL
├── source          ENUM(scraping, crowdsourcing, api, business)
├── is_verified     BOOLEAN DEFAULT False
├── verified_at     TIMESTAMPTZ NULL
├── created_at      TIMESTAMPTZ            -- sirve de timestamp para histórico
└── expires_at      TIMESTAMPTZ NULL       -- null = no caduca (Business)

-- Índice único parcial para precio activo por producto+tienda
-- UNIQUE (product, store) WHERE expires_at IS NULL OR expires_at > NOW()
```

El histórico de precios se materializa automáticamente: cada vez que se actualiza el precio de un producto en una tienda, se inserta un nuevo registro en lugar de sobreescribir el anterior. Las consultas de precio actual filtran por el registro más reciente no expirado.

#### Módulo de listas de la compra

```
ShoppingList
├── id              UUID (PK)
├── owner           FK → User
├── name            VARCHAR(255)
├── status          ENUM(active, completed, archived)
├── is_template     BOOLEAN DEFAULT False
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ

ShoppingListItem
├── id              UUID (PK)
├── shopping_list   FK → ShoppingList
├── product         FK → Product
├── quantity        DECIMAL(10,3) DEFAULT 1
├── is_checked      BOOLEAN DEFAULT False
├── notes           VARCHAR(500) NULL
└── added_at        TIMESTAMPTZ

ShoppingListShare
├── id              UUID (PK)
├── shopping_list   FK → ShoppingList
├── shared_with     FK → User
├── can_edit        BOOLEAN DEFAULT True
└── shared_at       TIMESTAMPTZ
```

#### Módulo del optimizador

```
OptimizationResult
├── id              UUID (PK)
├── shopping_list   FK → ShoppingList
├── user_location   PointField(SRID=4326)
├── max_distance_km DECIMAL(5,2)
├── max_stops       SMALLINT
├── mode            ENUM(price, time, balanced)
├── weight_price    DECIMAL(4,3)           -- suma con weight_dist + weight_time = 1.0
├── weight_distance DECIMAL(4,3)
├── weight_time     DECIMAL(4,3)
├── total_price     DECIMAL(10,2)
├── total_distance_km DECIMAL(8,3)
├── estimated_time_min INTEGER
├── savings_vs_single DECIMAL(10,2)
├── route_data      JSONB                  -- paradas con orden, productos y precios
├── rank            SMALLINT               -- 1, 2 o 3 (top-3 rutas)
└── generated_at    TIMESTAMPTZ
```

#### Módulo OCR y asistente

```
OcrSession
├── id              UUID (PK)
├── user            FK → User
├── image           ImageField
├── raw_text        TEXT NULL
├── recognized_items JSONB                 -- [{text, product_id, confidence}, ...]
├── resulting_list  FK → ShoppingList NULL
├── status          ENUM(processing, completed, failed)
├── created_at      TIMESTAMPTZ
└── completed_at    TIMESTAMPTZ NULL

Conversation
├── id              UUID (PK)
├── user            FK → User
├── title           VARCHAR(255)
├── status          ENUM(active, archived)
├── created_at      TIMESTAMPTZ
└── last_message_at TIMESTAMPTZ

Message
├── id              UUID (PK)
├── conversation    FK → Conversation
├── role            ENUM(user, assistant)
├── content         TEXT
├── tokens_used     INTEGER NULL
└── sent_at         TIMESTAMPTZ
```

#### Módulo de negocio (PYMEs)

```
BusinessProfile
├── id              UUID (PK)
├── user            FK → User (1:1)
├── business_name   VARCHAR(255)
├── tax_id          VARCHAR(20)            -- NIF/CIF
├── description     TEXT NULL
├── store           FK → Store (1:1) NULL
├── tier            ENUM(free, basic, premium)
├── status          ENUM(pending, active, suspended)
├── created_at      TIMESTAMPTZ
└── verified_at     TIMESTAMPTZ NULL

Promotion
├── id              UUID (PK)
├── business        FK → BusinessProfile
├── product         FK → Product
├── discount_type   ENUM(percent, fixed)
├── discount_value  DECIMAL(10,2)
├── description     VARCHAR(500)
├── starts_at       TIMESTAMPTZ
├── ends_at         TIMESTAMPTZ
└── is_active       BOOLEAN DEFAULT True

PriceAlert
├── id              UUID (PK)
├── user            FK → User
├── product         FK → Product
├── target_price    DECIMAL(10,2)
├── triggered_at    TIMESTAMPTZ NULL
└── created_at      TIMESTAMPTZ
```

### 8.2.2 Índices clave

El rendimiento del sistema depende en gran medida de los índices definidos sobre las tablas más consultadas:

| Tabla                | Columna(s)                     | Tipo           | Justificación                     |
| -------------------- | ------------------------------ | -------------- | --------------------------------- |
| `store`              | `location`                     | GiST           | Búsquedas geoespaciales por radio |
| `price`              | `(product, store, created_at)` | B-Tree         | Histórico y precio actual         |
| `price`              | `expires_at`                   | B-Tree parcial | Filtrar precios vigentes          |
| `product`            | `normalized_name`              | GIN (trigram)  | Búsqueda fuzzy por nombre         |
| `product`            | `barcode`                      | B-Tree UNIQUE  | Lookup por código de barras       |
| `shopping_list_item` | `(shopping_list, is_checked)`  | B-Tree         | Ítems pendientes                  |
| `message`            | `(conversation, sent_at)`      | B-Tree         | Historial de chat paginado        |

---

## 8.3 Diseño de la API REST

### 8.3.1 Estructura general

La API sigue las convenciones REST y está versionada bajo el prefijo `/api/v1/`. Todos los endpoints requieren autenticación JWT salvo los de registro, login y recuperación de contraseña. Las respuestas siguen el formato unificado definido en la sección de manejo de errores del proyecto:

```json
// Respuesta exitosa
{
  "success": true,
  "data": { ... },
  "meta": {
    "count": 42,
    "page": 1,
    "page_size": 20
  }
}

// Respuesta de error
{
  "success": false,
  "error": {
    "code": "STORE_NOT_FOUND",
    "message": "No se encontraron tiendas en el radio especificado",
    "details": {}
  }
}
```

### 8.3.2 Endpoints principales

#### Autenticación

| Método | Endpoint                               | Descripción                             |
| ------ | -------------------------------------- | --------------------------------------- |
| `POST` | `/api/v1/auth/register/`               | Registro de nuevo usuario               |
| `POST` | `/api/v1/auth/login/`                  | Login → devuelve access + refresh token |
| `POST` | `/api/v1/auth/token/refresh/`          | Renovar access token                    |
| `POST` | `/api/v1/auth/logout/`                 | Invalidar refresh token                 |
| `POST` | `/api/v1/auth/password/reset/`         | Solicitar reset de contraseña           |
| `POST` | `/api/v1/auth/password/reset/confirm/` | Confirmar reset con token               |

#### Usuarios y perfiles

| Método      | Endpoint                          | Descripción                    |
| ----------- | --------------------------------- | ------------------------------ |
| `GET/PATCH` | `/api/v1/users/me/`               | Perfil del usuario autenticado |
| `GET/PATCH` | `/api/v1/users/me/preferences/`   | Preferencias de optimización   |
| `GET/PATCH` | `/api/v1/users/me/notifications/` | Preferencias de notificaciones |

#### Productos

| Método | Endpoint                               | Descripción                              |
| ------ | -------------------------------------- | ---------------------------------------- |
| `GET`  | `/api/v1/products/`                    | Listado con filtros y paginación         |
| `GET`  | `/api/v1/products/{id}/`               | Detalle de producto                      |
| `GET`  | `/api/v1/products/search/?q=`          | Búsqueda con autocompletado              |
| `GET`  | `/api/v1/products/{id}/prices/`        | Precios del producto en tiendas cercanas |
| `GET`  | `/api/v1/products/{id}/price-history/` | Histórico de precios                     |
| `GET`  | `/api/v1/categories/`                  | Árbol de categorías                      |

#### Tiendas

| Método        | Endpoint                        | Descripción                                             |
| ------------- | ------------------------------- | ------------------------------------------------------- |
| `GET`         | `/api/v1/stores/`               | Tiendas con filtro geoespacial (`lat`, `lng`, `radius`) |
| `GET`         | `/api/v1/stores/{id}/`          | Detalle de tienda                                       |
| `POST/DELETE` | `/api/v1/stores/{id}/favorite/` | Marcar/desmarcar favorita                               |
| `GET`         | `/api/v1/stores/favorites/`     | Tiendas favoritas del usuario                           |

#### Precios

| Método       | Endpoint                           | Descripción                        |
| ------------ | ---------------------------------- | ---------------------------------- |
| `POST`       | `/api/v1/prices/crowdsource/`      | Reportar precio (crowdsourcing)    |
| `GET`        | `/api/v1/prices/compare/?list_id=` | Comparar cesta completa por tienda |
| `POST`       | `/api/v1/prices/alerts/`           | Crear alerta de precio             |
| `GET/DELETE` | `/api/v1/prices/alerts/{id}/`      | Gestionar alerta                   |

#### Listas de la compra

| Método             | Endpoint                                        | Descripción            |
| ------------------ | ----------------------------------------------- | ---------------------- |
| `GET/POST`         | `/api/v1/shopping-lists/`                       | Listar y crear listas  |
| `GET/PATCH/DELETE` | `/api/v1/shopping-lists/{id}/`                  | Gestionar lista        |
| `POST`             | `/api/v1/shopping-lists/{id}/share/`            | Compartir lista        |
| `GET/POST`         | `/api/v1/shopping-lists/{id}/items/`            | Ítems de la lista      |
| `PATCH/DELETE`     | `/api/v1/shopping-lists/{id}/items/{item_id}/`  | Modificar ítem         |
| `POST`             | `/api/v1/shopping-lists/{id}/save-as-template/` | Guardar como plantilla |

#### Optimizador

| Método | Endpoint                          | Descripción                             |
| ------ | --------------------------------- | --------------------------------------- |
| `POST` | `/api/v1/optimizer/optimize/`     | Calcular rutas óptimas                  |
| `GET`  | `/api/v1/optimizer/results/{id}/` | Obtener resultado previo                |
| `GET`  | `/api/v1/optimizer/history/`      | Historial de optimizaciones del usuario |

#### OCR

| Método | Endpoint                             | Descripción                         |
| ------ | ------------------------------------ | ----------------------------------- |
| `POST` | `/api/v1/ocr/sessions/`              | Iniciar sesión con imagen           |
| `GET`  | `/api/v1/ocr/sessions/{id}/`         | Estado y resultado de sesión        |
| `POST` | `/api/v1/ocr/sessions/{id}/confirm/` | Confirmar productos y generar lista |

#### Asistente

| Método     | Endpoint                                         | Descripción                   |
| ---------- | ------------------------------------------------ | ----------------------------- |
| `GET/POST` | `/api/v1/assistant/conversations/`               | Listar y crear conversaciones |
| `GET`      | `/api/v1/assistant/conversations/{id}/`          | Detalle de conversación       |
| `POST`     | `/api/v1/assistant/conversations/{id}/messages/` | Enviar mensaje                |

#### Portal Business

| Método      | Endpoint                               | Descripción                 |
| ----------- | -------------------------------------- | --------------------------- |
| `POST`      | `/api/v1/business/register/`           | Registro de PYME            |
| `GET/PATCH` | `/api/v1/business/profile/`            | Gestionar perfil de negocio |
| `GET/POST`  | `/api/v1/business/prices/`             | Ver y actualizar precios    |
| `POST`      | `/api/v1/business/prices/bulk-update/` | Actualización masiva (CSV)  |
| `GET/POST`  | `/api/v1/business/promotions/`         | Gestionar promociones       |
| `GET`       | `/api/v1/business/stats/`              | Estadísticas de visibilidad |

### 8.3.3 Autenticación y autorización

Se implementa un sistema de permisos a tres niveles mediante clases de permiso personalizadas en DRF:

- **`IsAuthenticated`:** Aplicado por defecto a todos los endpoints privados.
- **`IsConsumer`:** Restringe el acceso a usuarios con rol `consumer`.
- **`IsBusinessOwner`:** Permite operar solo sobre el perfil de negocio propio.
- **`IsAdminUser`:** Para endpoints de administración del sistema.
- **`IsShoppingListOwnerOrShared`:** Permite acceso a la lista al propietario y a los usuarios con los que se compartió.

Los tokens JWT se generan con `djangorestframework-simplejwt`. El token de acceso tiene validez de 60 minutos y el de refresco de 7 días con rotación automática (cada uso del refresh invalida el anterior y emite uno nuevo).

---

## 8.4 Implementación del Backend

### 8.4.1 Módulo de usuarios (`apps/users`)

El modelo `User` extiende `AbstractBaseUser` de Django para permitir el login mediante email en lugar del username por defecto. Se definen tres roles mediante un campo `ENUM`: `consumer`, `business` y `admin`. El campo `default_location` utiliza `PointField` de `django.contrib.gis.db.models`, lo que permite al sistema ejecutar consultas de proximidad directamente sobre este campo sin transformaciones adicionales.

Las preferencias de optimización (pesos `w_precio`, `w_distancia`, `w_tiempo`) se almacenan como decimales con la restricción de que su suma debe ser igual a 1.0, validada a nivel de serializer mediante un validador personalizado:

```python
def validate(self, data: dict) -> dict:
    """Valida que los pesos de optimización sumen exactamente 1.0."""
    weights = [
        data.get('weight_price', 0),
        data.get('weight_distance', 0),
        data.get('weight_time', 0),
    ]
    if abs(sum(weights) - 1.0) > 0.001:
        raise serializers.ValidationError(
            "Los pesos de optimización deben sumar exactamente 1.0"
        )
    return data
```

### 8.4.2 Módulo de productos (`apps/products`)

La búsqueda de productos por nombre utiliza **matching fuzzy** mediante la extensión PostgreSQL `pg_trgm` (trigramas), accesible desde Django con `django-pg-trgm`. Esto permite encontrar productos aunque el usuario cometa errores tipográficos o use denominaciones alternativas. El campo `normalized_name` almacena el nombre del producto en minúsculas, sin tildes y sin caracteres especiales, sobre el que se aplican los índices GIN de trigramas.

```python
# services.py
def search_products(query: str, limit: int = 20) -> QuerySet[Product]:
    """Busca productos usando similaridad de trigramas con umbral de 0.3."""
    return (
        Product.objects
        .annotate(similarity=TrigramSimilarity('normalized_name', normalize(query)))
        .filter(similarity__gt=0.3, is_active=True)
        .order_by('-similarity')[:limit]
    )
```

### 8.4.3 Módulo de tiendas (`apps/stores`)

La funcionalidad central de este módulo es la **búsqueda geoespacial por radio**, implementada mediante la función `ST_DWithin` de PostGIS a través del ORM de Django GeoDjango:

```python
# services.py
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

def get_stores_in_radius(lat: float, lng: float, radius_km: float) -> QuerySet[Store]:
    """Devuelve tiendas dentro del radio especificado, ordenadas por distancia."""
    user_location = Point(lng, lat, srid=4326)
    return (
        Store.objects
        .filter(location__dwithin=(user_location, D(km=radius_km)), is_active=True)
        .annotate(distance=Distance('location', user_location))
        .order_by('distance')
    )
```

El uso de `ST_DWithin` en lugar de `ST_Distance` en el `WHERE` es deliberado: `ST_DWithin` puede aprovechar el índice GiST sobre el campo `location`, mientras que calcular distancias en el filtro forzaría un escaneo completo de la tabla.

### 8.4.4 Módulo de precios (`apps/prices`)

La gestión de precios implementa tres aspectos críticos:

**Histórico temporal:** Cada precio es inmutable una vez creado. La actualización de un precio supone la inserción de un nuevo registro con `expires_at = None` y la actualización de `expires_at` del registro anterior con el timestamp actual. Esto garantiza la preservación completa del histórico sin tablas de auditoría adicionales.

**Sistema de caducidad:** Una tarea Celery periódica (`tasks.expire_stale_prices`) se ejecuta cada hora y marca como expirados los precios de scraping con más de 48 horas de antigüedad y los de crowdsourcing con más de 24 horas. Esta tarea utiliza una consulta de actualización masiva para eficiencia:

```python
@app.task
def expire_stale_prices() -> dict[str, int]:
    """Marca como expirados los precios cuya vigencia ha finalizado."""
    now = timezone.now()
    scraping_cutoff = now - timedelta(hours=48)
    crowdsource_cutoff = now - timedelta(hours=24)

    scraping_expired = Price.objects.filter(
        source='scraping', created_at__lt=scraping_cutoff, expires_at__isnull=True
    ).update(expires_at=now)

    crowd_expired = Price.objects.filter(
        source='crowdsourcing', created_at__lt=crowdsource_cutoff, expires_at__isnull=True
    ).update(expires_at=now)

    return {'scraping': scraping_expired, 'crowdsourcing': crowd_expired}
```

**Prioridad de fuentes:** Cuando se consultan precios para el optimizador, el servicio aplica la jerarquía de fuentes definida en RN-004 mediante una subconsulta con `DISTINCT ON` en PostgreSQL, que selecciona el precio de mayor prioridad por cada par `(product, store)`.

### 8.4.5 Módulo del optimizador (`apps/optimizer`)

Este es el núcleo algorítmico del sistema. Se describe en detalle en la sección 8.5.

### 8.4.6 Módulo de notificaciones (`apps/notifications`)

Las notificaciones se procesan de forma asíncrona mediante tareas Celery para no bloquear las peticiones API. El módulo implementa un sistema de plantillas para los distintos tipos de evento:

```python
NOTIFICATION_TEMPLATES = {
    'price_alert': {
        'title': 'Precio objetivo alcanzado',
        'body': '{product} está a {price}€ en {store}',
    },
    'promo_favorite_store': {
        'title': 'Nueva promoción en {store}',
        'body': '{product} con {discount}% de descuento hasta el {end_date}',
    },
    # ...
}
```

Las notificaciones push se envían mediante Firebase Cloud Messaging (FCM) y las de email mediante SMTP con plantillas HTML generadas con el motor de plantillas de Django.

---

## 8.5 El Algoritmo de Optimización de Rutas

El algoritmo de optimización es la aportación técnica central del TFG. Dado que el problema de optimización multitienda es una variante del **Problema de la Ruta más Corta con Múltiples Orígenes y Restricciones de Cobertura** (Vehicle Routing Problem con objetivos múltiples), se opta por una solución heurística eficiente en lugar de una búsqueda exhaustiva.

### 8.5.1 Formulación del problema

**Entrada:**

- Lista de la compra `L = {p₁, p₂, ..., pₙ}` (n productos)
- Ubicación del usuario `u = (lat, lng)`
- Radio máximo `r` (km)
- Número máximo de paradas `k` (1–4)
- Pesos de preferencia `w_precio, w_distancia, w_tiempo` (suman 1.0)

**Salida:**

- Top-3 asignaciones de productos a tiendas `A = {(pᵢ → Sⱼ)}` que minimizan la función de coste

**Restricciones:**

- Cada producto debe estar asignado a exactamente una tienda
- Todas las tiendas en la asignación deben tener precio disponible para el producto asignado
- El número de tiendas distintas en la asignación ≤ k
- Todas las tiendas deben estar dentro del radio r

### 8.5.2 Función de scoring multicriterio

```
Score(A) = w_precio × ahorro_normalizado(A)
         - w_distancia × distancia_extra_normalizada(A)
         - w_tiempo × tiempo_extra_normalizado(A)
```

Donde:

- **`ahorro_normalizado`** = `(coste_single_best - coste(A)) / coste_single_best` ∈ [0, 1]
  - `coste_single_best`: coste de la lista en la tienda individual más barata
  - `coste(A)`: coste total de la asignación A
- **`distancia_extra_normalizada`** = `max(0, distancia_ruta(A) - distancia_single) / distancia_max_aceptable`
  - `distancia_single`: distancia mínima a la mejor tienda individual
  - `distancia_max_aceptable = r × 1.5`
- **`tiempo_extra_normalizado`** = `max(0, tiempo_ruta(A) - tiempo_single) / tiempo_max_aceptable`

### 8.5.3 Pipeline de ejecución

El algoritmo se ejecuta en cinco fases secuenciales dentro de `apps/optimizer/services.py`:

**Fase 1: Ingesta de precios candidatos**

Para cada producto de la lista, se obtienen todos los precios vigentes en tiendas dentro del radio. Esta consulta se optimiza con una sola llamada a la base de datos usando `select_related` y filtros geoespaciales:

```python
def fetch_candidate_prices(
    products: list[Product],
    user_location: Point,
    radius_km: float,
) -> dict[UUID, list[PriceCandidate]]:
    """Devuelve precios agrupados por producto para tiendas en el radio."""
    prices = (
        Price.objects
        .select_related('product', 'store')
        .filter(
            product__in=products,
            store__location__dwithin=(user_location, D(km=radius_km)),
            expires_at__isnull=True,
            store__is_active=True,
        )
        .annotate(distance=Distance('store__location', user_location))
        .order_by('product', 'source_priority', 'price')
    )
    return _group_by_product(prices)
```

**Fase 2: Pre-filtrado de tiendas candidatas**

Para evitar la explosión combinatoria, se limita el conjunto de tiendas candidatas. Solo se consideran tiendas que:

1. Ofrecen precio para al menos 1 producto de la lista
2. Están dentro del radio configurado
3. Se toman solo las N mejores por algún criterio (precio medio relativo, distancia)

En la práctica, se limita a 30 tiendas candidatas como máximo, lo que garantiza que el número de combinaciones de k tiendas de un conjunto de 30 sea manejable: C(30, 3) = 4.060 combinaciones.

**Fase 3: Generación y evaluación de asignaciones**

Para cada combinación de tiendas, se calcula la asignación óptima de productos: cada producto se asigna a la tienda de la combinación que ofrece el precio más bajo. Esta asignación greedy es óptima dado un subconjunto fijo de tiendas.

```python
def evaluate_combination(
    stores: list[Store],
    candidates: dict[UUID, list[PriceCandidate]],
    distances: dict[tuple, float],
) -> OptimizationCandidate | None:
    """Evalúa una combinación de tiendas y devuelve la asignación óptima."""
    assignment = {}
    total_cost = Decimal('0.00')

    for product_id, price_candidates in candidates.items():
        best = min(
            (p for p in price_candidates if p.store_id in {s.id for s in stores}),
            key=lambda p: p.price,
            default=None,
        )
        if best is None:
            return None  # Esta combinación no cubre todos los productos
        assignment[product_id] = best
        total_cost += best.price

    route_distance = calculate_route_distance(stores, distances)
    return OptimizationCandidate(assignment, total_cost, route_distance, stores)
```

**Fase 4: Cálculo de distancias reales**

Las distancias entre tiendas se calculan usando la **API de OSRM** (Open Source Routing Machine), que ofrece distancias de conducción reales en lugar de distancias en línea recta. Para optimizar el número de llamadas a la API, se calcula la **matriz de distancias** entre todas las tiendas candidatas en una sola petición.

```
POST http://router.project-osrm.org/table/v1/driving/
     lng1,lat1;lng2,lat2;...lngN,latN
     ?annotations=duration,distance
```

La respuesta incluye la matriz completa de tiempos y distancias entre todos los puntos. Se cachean los resultados con Redis (TTL de 24 horas) para evitar llamadas redundantes.

**Fase 5: Scoring y ranking**

Se aplica la función de scoring a todas las asignaciones válidas, se normalizan los valores entre 0 y 1, y se devuelven las top-3 ordenadas por score descendente.

### 8.5.4 Integración con OR-Tools

Para combinaciones con muchos productos y tiendas donde el problema de asignación se vuelve complejo, se utiliza la librería **OR-Tools de Google** para resolver el problema de asignación como un problema de programación lineal entera (ILP). Esto garantiza la optimalidad de la asignación de productos a tiendas dentro de un subconjunto fijo, complementando la heurística combinatoria de la fase 3.

### 8.5.5 Complejidad y rendimiento

| Escenario               | Tiendas candidatas | Combinaciones (k=3) | Tiempo estimado |
| ----------------------- | :----------------: | :-----------------: | :-------------: |
| Lista pequeña (5 prod.) |        ≤15         |         455         |      < 1 s      |
| Lista media (20 prod.)  |        ≤30         |        4.060        |      < 3 s      |
| Lista grande (50 prod.) |        ≤30         |        4.060        |      < 5 s      |

El umbral de rendimiento de 5 segundos definido en RNF-001 se cumple gracias a:

1. Pre-filtrado agresivo del conjunto de tiendas candidatas
2. Caché de matriz de distancias en Redis
3. Ejecución como tarea Celery asíncrona (el cliente recibe un `task_id` inmediatamente y consulta el resultado vía polling o WebSocket)

---

## 8.6 Módulo de Web Scraping

### 8.6.1 Arquitectura del scraper

El módulo de scraping es un **proyecto Scrapy independiente** (`scraping/`) desacoplado del backend Django. La comunicación con la base de datos se realiza a través de la API REST del propio backend, no mediante acceso directo a la base de datos. Esta separación permite escalar los workers de scraping de forma independiente.

```
scraping/
└── bargain_scraping/
    ├── spiders/
    │   ├── base.py            # Spider base con lógica común
    │   ├── mercadona.py       # Spider Mercadona (API oficial)
    │   ├── carrefour.py       # Spider Carrefour (Playwright)
    │   ├── lidl.py            # Spider Lidl
    │   └── dia.py             # Spider DIA
    ├── items.py               # Definición de items scrapeados
    ├── pipelines.py           # Normalización + envío a API
    ├── middlewares.py         # Rotación User-Agent, delays
    └── settings.py            # Configuración Scrapy
```

### 8.6.2 Estrategia por cadena

Cada cadena de supermercados requiere una estrategia diferente:

- **Mercadona:** Dispone de una API interna (`uapi.mercadona.es`) no oficial pero estable, accesible mediante peticiones HTTP estándar. El spider la interroga directamente sin necesidad de renderizado JavaScript.

- **Carrefour / Lidl / DIA:** Sus catálogos de precios se encuentran en páginas con renderizado del lado del cliente (SPA), lo que requiere el uso de **Playwright** para ejecutar el JavaScript y obtener el DOM completamente hidratado. Scrapy-Playwright integra el navegador sin cabeza en el pipeline de Scrapy.

### 8.6.3 Pipeline de normalización

Tras la extracción, cada ítem pasa por el siguiente pipeline:

1. **`ValidationPipeline`:** Descarta ítems con precio ≤ 0 o sin nombre de producto.
2. **`NormalizationPipeline`:** Normaliza el nombre del producto (minúsculas, sin tildes, sin caracteres especiales) y la unidad de medida.
3. **`ProductMatchingPipeline`:** Busca el producto en el catálogo mediante matching fuzzy. Si la similitud supera 0.85, vincula con el producto existente. Si no, crea un nuevo producto pendiente de validación.
4. **`ApiSubmitPipeline`:** Envía el precio a `POST /api/v1/scraping/prices/` con autenticación de sistema.

### 8.6.4 Programación de tareas

Los spiders se programan con **Celery Beat**, que actúa como scheduler:

```python
# config/celery.py
app.conf.beat_schedule = {
    'scrape-mercadona-daily': {
        'task': 'apps.scraping.tasks.run_spider',
        'schedule': crontab(hour=6, minute=0),
        'args': ('mercadona',),
    },
    'scrape-carrefour-daily': {
        'task': 'apps.scraping.tasks.run_spider',
        'schedule': crontab(hour=6, minute=30),
        'args': ('carrefour',),
    },
    # ...
}
```

Se respeta la regla de negocio RN-010: frecuencia máxima de una ejecución por cadena cada 24 horas y un delay mínimo de 2 segundos entre peticiones consecutivas, configurado en `DOWNLOAD_DELAY = 2` de Scrapy.

---

## 8.7 Módulo OCR

### 8.7.1 Flujo de procesamiento

El procesamiento de imágenes sigue un flujo asíncrono de tres pasos:

1. **Captura:** El cliente sube la imagen al endpoint `POST /api/v1/ocr/sessions/`. El backend crea una sesión OCR en estado `processing` y encola una tarea Celery. La respuesta incluye el `session_id` para consultar el estado.

2. **Extracción de texto:** La tarea Celery invoca **Tesseract OCR** mediante `pytesseract`, configurado para reconocimiento de español (`lang='spa'`). Se aplica un preprocesamiento de imagen (conversión a escala de grises, binarización adaptativa con OpenCV) para mejorar la tasa de reconocimiento en fotografías de listas escritas a mano.

```python
# apps/ocr/services.py
import cv2
import pytesseract
import numpy as np

def extract_text_from_image(image_path: str) -> str:
    """Extrae texto de una imagen con preprocesamiento para listas manuscritas."""
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    return pytesseract.image_to_string(thresh, lang='spa', config='--psm 6')
```

3. **Matching con catálogo:** Cada línea de texto extraído se normaliza y se busca en el catálogo mediante el mismo servicio de matching fuzzy de `apps/products`. Se devuelve una lista de candidatos con su nivel de confianza, que el usuario puede confirmar o corregir desde la interfaz.

---

## 8.8 Integración del Asistente LLM

### 8.8.1 Arquitectura del asistente

El asistente conversacional utiliza la **Claude API de Anthropic** como modelo subyacente. El backend actúa como proxy, añadiendo contexto de la compra del usuario (lista activa, precios cercanos, historial) al sistema de prompts antes de enviar cada mensaje a la API.

```
Usuario → Frontend → POST /api/v1/assistant/.../messages/
        → Backend añade contexto → Claude API
        → Respuesta → Persistida en BD → Frontend
```

### 8.8.2 Diseño del system prompt

El sistema de prompts incluye un **guardrail** que limita las respuestas del asistente a consultas relacionadas con la compra (RN-007):

```python
SYSTEM_PROMPT = """
Eres BargAIn Assistant, un asistente especializado en ayudar a los usuarios
a optimizar su compra semanal. Tu ámbito es exclusivamente:
- Comparación de precios de productos en supermercados
- Recomendaciones de ahorro y sustitución de productos
- Planificación de recetas con presupuesto
- Información sobre tiendas y ofertas cercanas

No debes responder consultas ajenas a la compra doméstica o la alimentación.
Si el usuario hace una pregunta fuera de este ámbito, responde educadamente
que solo puedes ayudar con temas relacionados con la compra.

Contexto actual del usuario:
- Lista de la compra activa: {shopping_list_summary}
- Tiendas cercanas (radio {radius_km} km): {nearby_stores}
- Precios destacados: {relevant_prices}
"""
```

### 8.8.3 Gestión del contexto de conversación

Para conversaciones largas, se aplica una estrategia de **ventana deslizante** sobre el historial de mensajes: se envían los últimos 20 mensajes más el system prompt, lo que mantiene el consumo de tokens controlado sin perder coherencia de la conversación.

---

## 8.9 Infraestructura y Despliegue

### 8.9.1 Contenerización con Docker

Cada componente del sistema se ejecuta en un contenedor Docker independiente, orquestados con Docker Compose:

```yaml
# docker-compose.yml (producción)
services:
  nginx: # Reverse proxy y servicio de estáticos
  backend: # Django + Gunicorn (3 workers)
  celery-worker: # Workers para tareas asíncronas
  celery-beat: # Scheduler de tareas periódicas
  db: # PostgreSQL 16 + PostGIS
  redis: # Broker Celery + caché
```

Para el entorno de desarrollo (`docker-compose.dev.yml`) se añade un volumen de hot-reload y se sustituye Gunicorn por el servidor de desarrollo de Django.

### 8.9.2 Variables de entorno y secretos

La configuración sensible (claves API, credenciales de base de datos, secret key de Django) se gestiona exclusivamente mediante variables de entorno, nunca hardcodeadas en el código. Se proporciona un fichero `.env.example` con los nombres de todas las variables requeridas sin valores.

### 8.9.3 Pipeline CI/CD

El repositorio incluye tres workflows de GitHub Actions:

- **`ci-backend.yml`:** Ejecuta `ruff check`, `ruff format --check` y `pytest --cov` en cada push a cualquier rama.
- **`ci-frontend.yml`:** Ejecuta `eslint`, `prettier --check` y `jest --coverage` en cada push.
- **`deploy-staging.yml`:** Desplegado automático a Render al hacer merge a `main`.

Los deploys a staging solo se ejecutan si ambos workflows de CI pasan satisfactoriamente (dependencia de jobs en GitHub Actions).

### 8.9.4 Monitorización

- **Sentry:** Captura de excepciones en backend y frontend con contexto de usuario y request.
- **Prometheus + Grafana:** Métricas de rendimiento de la API (latencia, throughput, tasa de error) expuestas por `django-prometheus`.
- **Logging estructurado:** `structlog` formatea los logs como JSON para facilitar su ingesta en herramientas como Datadog o CloudWatch en producción.

---

## 8.10 Diseño de la Interfaz de Usuario

### 8.10.1 Sistema de diseño

El frontend define un sistema de diseño propio en `src/theme/` con los siguientes tokens:

**Paleta de colores:**
| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#2E7D32` | Acciones principales, CTAs |
| `primaryLight` | `#60AD5E` | Estados hover, fondos sutiles |
| `secondary` | `#FF6F00` | Ahorros, destacados, ofertas |
| `surface` | `#FAFAFA` | Fondo de tarjetas |
| `error` | `#C62828` | Errores y alertas |
| `textPrimary` | `#212121` | Texto principal |
| `textSecondary` | `#757575` | Texto de apoyo |

**Tipografía:** Inter (sans-serif) con escala modular: `xs(12)`, `sm(14)`, `base(16)`, `lg(18)`, `xl(20)`, `2xl(24)`, `3xl(30)`.

**Espaciado:** Escala de 4px: `xs(4)`, `sm(8)`, `md(16)`, `lg(24)`, `xl(32)`, `2xl(48)`.

### 8.10.2 Pantallas principales

La aplicación se estructura en cinco pestañas principales (tab navigation):

1. **Inicio / Dashboard:** Resumen de la lista activa, precio estimado en la tienda más barata cercana, acceso rápido al asistente y alertas de precios activas.

2. **Mi Lista:** Gestión de la lista de la compra activa. Buscador de productos con autocompletado en la parte superior, lista agrupada por categoría con swipe-to-delete, contador de productos pendientes / comprados y botón de optimizar ruta.

3. **Explorar:** Mapa interactivo (React Native Maps) con marcadores de tiendas cercanas diferenciados por cadena. Panel inferior deslizable con detalles de la tienda seleccionada y precios de los productos de la lista activa.

4. **Optimizador:** Pantalla de configuración de pesos (sliders), resultados en forma de cards comparativas para las top-3 rutas y visualización de la ruta seleccionada en mapa con polylines y marcadores numerados.

5. **Perfil:** Datos personales, preferencias de optimización, notificaciones, listas guardadas y acceso al historial del asistente.

### 8.10.3 Flujo de captura OCR

El flujo de captura de lista por cámara sigue un wizard de tres pasos:

1. **Captura:** Pantalla con visor de cámara (Expo Camera) con guías de encuadre y botón de galería como alternativa.
2. **Revisión:** Lista de productos reconocidos con nivel de confianza (chip de color), campo de edición inline para corregir, y opción de eliminar ítems no deseados.
3. **Confirmación:** Selección de lista destino (existente o nueva) y botón de confirmación.

### 8.10.4 Interfaz del asistente

La pantalla del asistente sigue el patrón de chat estándar: mensajes del usuario alineados a la derecha (burbuja verde), respuestas del asistente alineados a la izquierda (burbuja gris). Las respuestas que incluyen productos, precios o tiendas se renderizan con chips interactivos que permiten añadir el producto a la lista activa directamente desde el chat.
