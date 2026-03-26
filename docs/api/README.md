# Referencia de la API REST — BargAIn (Fases 1-4)

> Estado de sincronización: 2026-03-19. La API backend core (F3) está completada y el frontend (F4) consume estos contratos.

## Índice

1. [Información general](#información-general)
2. [Autenticación](#autenticación)
3. [Formato de respuesta](#formato-de-respuesta)
4. [Códigos de error](#códigos-de-error)
5. [Endpoints de autenticación y perfil](#endpoints-de-autenticación-y-perfil-apiv1auth)
6. [Endpoints de productos](#endpoints-de-productos-apiv1products)
7. [Endpoints de tiendas](#endpoints-de-tiendas-apiv1stores)
8. [Endpoints de precios](#endpoints-de-precios-apiv1prices)
9. [Endpoints de listas de la compra](#endpoints-de-listas-de-la-compra-apiv1lists)

---

## Información general

| Atributo | Valor |
|----------|-------|
| **Base URL** | `http://localhost:8000/api/v1/` |
| **Formato** | JSON (UTF-8) |
| **Versión** | v1 |
| **Esquema interactivo (Swagger)** | `GET /api/v1/schema/swagger-ui/` |
| **Esquema interactivo (ReDoc)** | `GET /api/v1/schema/redoc/` |
| **Esquema OpenAPI (JSON)** | `GET /api/v1/schema/` |

---

## Autenticación

La API utiliza **JWT (JSON Web Tokens)**. El flujo estándar es:

1. Obtener tokens con `POST /api/v1/auth/token/`.
2. Incluir el token de acceso en cada petición autenticada:

```
Authorization: Bearer <access_token>
```

3. Cuando el token de acceso expire, renovarlo con `POST /api/v1/auth/token/refresh/` usando el token de refresco.

**Vida útil de los tokens:**
- Acceso: 5 minutos en producción, 60 minutos en desarrollo (configurable con `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` en `.env`).
- Refresco: 7 días con rotación automática.

Los endpoints marcados con **(autenticado)** requieren el encabezado `Authorization`. Los endpoints sin marca son públicos.

---

## Formato de respuesta

Todas las respuestas siguen la misma estructura:

### Éxito

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "CODIGO_ERROR",
    "message": "Descripción legible del error",
    "details": {}
  }
}
```

---

## Códigos de error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `PRODUCT_NOT_FOUND` | 404 | Producto no encontrado por código de barras |
| `MISSING_LOCATION` | 400 | Se requieren `lat` y `lng` en la búsqueda de tiendas |
| `ACTIVE_LIST_LIMIT` | 409 | Se ha alcanzado el límite de 20 listas activas por usuario |
| `STORE_NOT_FOUND` | 404 | Tienda no encontrada |
| *(estándar DRF)* | 400 | Error de validación en los datos enviados |
| *(estándar DRF)* | 401 | Token ausente o inválido |
| *(estándar DRF)* | 403 | Sin permiso para este recurso |
| *(estándar DRF)* | 404 | Recurso no encontrado |
| *(estándar DRF)* | 500 | Error interno del servidor |

---

## Endpoints de autenticación y perfil (`/api/v1/auth/`)

### Registro de usuario

```
POST /api/v1/auth/register/
```

Crea una nueva cuenta de usuario. El email debe ser único en el sistema.

**Body:**

```json
{
  "username": "usuario123",
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura"
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "usuario123",
      "email": "usuario@ejemplo.com"
    }
  }
}
```

---

### Login (obtener tokens)

```
POST /api/v1/auth/token/
```

Autentica al usuario y devuelve un par de tokens JWT.

**Body:**

```json
{
  "username": "usuario123",
  "password": "contraseña_segura"
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "access": "<jwt_access_token>",
    "refresh": "<jwt_refresh_token>"
  }
}
```

---

### Renovar token de acceso

```
POST /api/v1/auth/token/refresh/
```

Obtiene un nuevo token de acceso usando el token de refresco.

**Body:**

```json
{
  "refresh": "<jwt_refresh_token>"
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "access": "<nuevo_jwt_access_token>"
  }
}
```

---

### Solicitar restablecimiento de contraseña

```
POST /api/v1/auth/password-reset/
```

Envía un email con el enlace de restablecimiento. Siempre devuelve 200 independientemente de si el email existe (anti-enumeración).

**Body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "message": "Si el email existe, recibirá las instrucciones."
  }
}
```

---

### Confirmar restablecimiento de contraseña

```
POST /api/v1/auth/password-reset/confirm/
```

**Body:**

```json
{
  "token": "<reset_token>",
  "new_password": "nueva_contraseña_segura"
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {}
}
```

---

### Ver perfil propio

```
GET /api/v1/auth/profile/me/    (autenticado)
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "usuario123",
    "email": "usuario@ejemplo.com",
    "phone": "+34600000000",
    "preferences": {}
  }
}
```

---

### Actualizar perfil propio

```
PATCH /api/v1/auth/profile/me/    (autenticado)
```

Actualización parcial. Se pueden enviar solo los campos a modificar.

**Body (campos opcionales):**

```json
{
  "phone": "+34600000000",
  "preferences": {
    "notifications_enabled": true,
    "default_radius_km": 5
  }
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": { ... }
}
```

---

## Endpoints de productos (`/api/v1/products/`)

### Buscar productos

```
GET /api/v1/products/
```

Busca en el catálogo normalizado. Sin parámetros de filtro devuelve una lista vacía.

**Parámetros de consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string (mín. 2 chars) | Búsqueda fuzzy por nombre usando similitud trigrama |
| `barcode` | string | Búsqueda exacta por código EAN-13 |
| `category` | integer | Filtro por ID de categoría |
| `brand` | string | Filtro por marca |

**Nota sobre `barcode`:** Si se proporciona y no se encuentra el producto, la respuesta es 404 con código `PRODUCT_NOT_FOUND`.

**Ejemplo de uso:**

```
GET /api/v1/products/?q=leche
GET /api/v1/products/?barcode=8410376025819
GET /api/v1/products/?category=3&brand=Hacendado
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "count": 12,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 42,
        "name": "Leche entera UHT 1L",
        "normalized_name": "leche entera uht 1l",
        "barcode": "8410376025819",
        "category": { "id": 3, "name": "Lácteos" },
        "brand": "Hacendado",
        "unit": "L",
        "unit_quantity": 1.0,
        "image_url": "https://...",
        "price_min": 0.69,
        "price_max": 0.89
      }
    ]
  }
}
```

---

### Autocompletado de productos

```
GET /api/v1/products/autocomplete/?q=lec
```

Devuelve hasta 10 resultados con umbral de similitud bajo (0.1) para soportar prefijos cortos como "lec" → "leche entera".

**Parámetros de consulta:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `q` | string (mín. 2 chars) | Sí | Texto de búsqueda |

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    { "id": 42, "name": "Leche entera UHT 1L", "brand": "Hacendado" },
    { "id": 43, "name": "Leche semidesnatada 1L", "brand": "Puleva" }
  ]
}
```

---

### Detalle de producto

```
GET /api/v1/products/<id>/
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "Leche entera UHT 1L",
    "normalized_name": "leche entera uht 1l",
    "barcode": "8410376025819",
    "category": { "id": 3, "name": "Lácteos" },
    "brand": "Hacendado",
    "unit": "L",
    "unit_quantity": 1.0,
    "image_url": "https://...",
    "price_min": 0.69,
    "price_max": 0.89,
    "is_active": true,
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

---

### Árbol de categorías

```
GET /api/v1/products/categories/
```

Devuelve el árbol completo de categorías en 2 niveles, sin paginación.

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alimentación",
      "children": [
        { "id": 3, "name": "Lácteos" },
        { "id": 4, "name": "Cereales y galletas" }
      ]
    }
  ]
}
```

---

### Proponer nuevo producto

```
POST /api/v1/products/proposals/    (autenticado)
```

Permite a un usuario proponer un producto que no existe en el catálogo. La propuesta queda pendiente de revisión por un moderador.

**Body:**

```json
{
  "name": "Leche de avena 1L",
  "barcode": "8435185000123",
  "category": 3,
  "brand": "Oatly",
  "unit": "L"
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Leche de avena 1L",
    "status": "pending"
  }
}
```

---

## Endpoints de tiendas (`/api/v1/stores/`)

### Buscar tiendas por proximidad

```
GET /api/v1/stores/?lat=37.38&lng=-5.99&radius_km=5
```

Devuelve las tiendas en el radio especificado, ordenadas de menor a mayor distancia. Endpoint público, no requiere autenticación.

**Parámetros de consulta:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `lat` | float | Sí | Latitud del punto de origen |
| `lng` | float | Sí | Longitud del punto de origen |
| `radius_km` | float | No (defecto: 10) | Radio de búsqueda en kilómetros |

Si se omiten `lat` y `lng`, la respuesta es 400 con código `MISSING_LOCATION`.

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "count": 5,
    "results": [
      {
        "id": 7,
        "name": "Mercadona Triana",
        "chain": { "id": 1, "name": "Mercadona" },
        "address": "Calle San Jacinto, 12, Sevilla",
        "distance_km": 0.82,
        "opening_hours": { "lunes": "09:00-21:30" },
        "is_local_business": false
      }
    ]
  }
}
```

---

### Detalle de tienda

```
GET /api/v1/stores/<id>/
```

Devuelve el detalle de la tienda incluyendo los precios activos actuales.

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Mercadona Triana",
    "chain": { "id": 1, "name": "Mercadona" },
    "address": "Calle San Jacinto, 12, Sevilla",
    "location": { "lat": 37.383, "lng": -6.001 },
    "opening_hours": {},
    "is_local_business": false,
    "active_prices": [
      {
        "product_id": 42,
        "product_name": "Leche entera UHT 1L",
        "price": 0.72,
        "offer_price": null,
        "verified_at": "2026-03-16T08:00:00Z"
      }
    ]
  }
}
```

---

### Marcar/desmarcar tienda como favorita

```
POST /api/v1/stores/<id>/favorite/    (autenticado)
```

Alterna el estado de favorito de la tienda para el usuario autenticado. Si no era favorita, la añade; si ya lo era, la elimina.

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "is_favorite": true
  }
}
```

---

## Endpoints de precios (`/api/v1/prices/`)

### Comparar precios de un producto entre tiendas

```
GET /api/v1/prices/compare/?product=<id>&lat=37.38&lng=-5.99
```

Devuelve el precio del producto en cada tienda cercana, con indicador de frescura (`is_stale`) y distancia al usuario. Endpoint público.

**Parámetros de consulta:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `product` | integer | Sí | ID del producto |
| `lat` | float | Sí | Latitud del usuario |
| `lng` | float | Sí | Longitud del usuario |
| `radius_km` | float | No (defecto: 10) | Radio de búsqueda |

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "store": {
        "id": 7,
        "name": "Mercadona Triana",
        "chain": "Mercadona"
      },
      "price": 0.72,
      "offer_price": null,
      "distance_km": 0.82,
      "is_stale": false,
      "verified_at": "2026-03-16T08:00:00Z",
      "source": "scraping"
    }
  ]
}
```

**Nota sobre `is_stale`:** Un precio se considera obsoleto si tiene más de 48 horas (scraping) o 24 horas (crowdsourcing) sin actualización.

---

### Histórico de precios de un producto

```
GET /api/v1/prices/<product_id>/history/
```

Devuelve el histórico agregado diariamente (mínimo, máximo y media) de los últimos 90 días. Endpoint público.

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-03-16",
      "price_min": 0.69,
      "price_max": 0.89,
      "price_avg": 0.75
    }
  ]
}
```

---

### Total de una lista en una tienda

```
GET /api/v1/prices/list-total/?list=<id>&store=<id>    (autenticado)
```

Calcula el coste total de los ítems no marcados de una lista en la tienda indicada. La resolución de
ítems es textual (matching diferido), por lo que la respuesta incluye los ítems no resueltos para
esa tienda en `missing_items`.

**Parámetros de consulta:**

| Parámetro | Tipo | Obligatorio |
|-----------|------|-------------|
| `list` | integer | Sí |
| `store` | integer | Sí |

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "store_id": 7,
    "store_name": "Mercadona Triana",
    "total": "12.45",
    "missing_items": [
      "leche de avena 1l"
    ]
  }
}
```

---

### Crear alerta de precio

```
POST /api/v1/prices/alerts/    (autenticado)
```

Crea una alerta que notificará al usuario cuando el producto alcance o baje del precio objetivo.

**Body:**

```json
{
  "product": 42,
  "target_price": 0.65,
  "store": 7
}
```

El campo `store` es opcional. Si se omite, la alerta aplica a cualquier tienda.

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "product": 42,
    "target_price": 0.65,
    "store": 7,
    "is_active": true,
    "created_at": "2026-03-17T10:00:00Z"
  }
}
```

---

### Desactivar alerta de precio

```
DELETE /api/v1/prices/alerts/<id>/    (autenticado)
```

Desactiva la alerta (pone `is_active=False`). No elimina el registro de la base de datos para preservar el historial de alertas.

**Respuesta 204:** Sin cuerpo.

---

### Reportar precio observado (crowdsourcing)

```
POST /api/v1/prices/crowdsource/    (autenticado)
```

Permite a los usuarios reportar un precio que han visto en tienda. Las aportaciones de crowdsourcing tienen mayor caducidad (24h) que los datos de scraping.

**Body:**

```json
{
  "product": 42,
  "store": 7,
  "price": 0.70,
  "offer_price": 0.59
}
```

El campo `offer_price` es opcional.

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 200,
    "product": 42,
    "store": 7,
    "price": 0.70,
    "offer_price": 0.59,
    "source": "crowdsourcing",
    "verified_at": "2026-03-17T11:00:00Z"
  }
}
```

---

## Endpoints de listas de la compra (`/api/v1/lists/`)

### Listar listas del usuario

```
GET /api/v1/lists/    (autenticado)
```

Devuelve todas las listas en las que el usuario es propietario o colaborador.

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Compra semanal",
      "is_archived": false,
      "owner": "usuario123",
      "created_at": "2026-03-10T09:00:00Z",
      "updated_at": "2026-03-17T10:00:00Z",
      "items": [
        {
          "id": 15,
          "name": "leche entera",
          "normalized_name": "leche entera",
          "product_name": "leche entera",
          "quantity": 2,
          "is_checked": false
        }
      ]
    }
  ]
}
```

---

### Crear lista

```
POST /api/v1/lists/    (autenticado)
```

Crea una nueva lista de la compra. Límite: 20 listas activas por usuario (error 409 con código `ACTIVE_LIST_LIMIT` si se supera).

**Body:**

```json
{
  "name": "Compra del fin de semana"
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Compra del fin de semana",
    "is_archived": false,
    "created_at": "2026-03-17T10:00:00Z",
    "updated_at": "2026-03-17T10:00:00Z"
  }
}
```

---

### Detalle de lista

```
GET /api/v1/lists/<id>/    (autenticado)
```

Devuelve el detalle de la lista con sus ítems textuales (`name`, `normalized_name`) y el alias de
compatibilidad `product_name`.

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Compra semanal",
    "is_archived": false,
    "owner": "usuario123",
    "created_at": "2026-03-10T09:00:00Z",
    "updated_at": "2026-03-17T10:00:00Z",
    "items": [
      {
        "id": 15,
        "name": "leche entera",
        "normalized_name": "leche entera",
        "product_name": "leche entera",
        "quantity": 2,
        "is_checked": false
      }
    ]
  }
}
```

---

### Actualizar lista

```
PATCH /api/v1/lists/<id>/    (autenticado)
```

Actualización parcial. Permite renombrar la lista o archivarla.

**Body (campos opcionales):**

```json
{
  "name": "Nuevo nombre",
  "is_archived": true
}
```

**Respuesta 200:** Devuelve la lista actualizada.

---

### Eliminar lista

```
DELETE /api/v1/lists/<id>/    (autenticado, solo propietario)
```

Elimina la lista permanentemente. Solo el propietario puede eliminarla.

**Respuesta 204:** Sin cuerpo.

---

### Obtener ítems de una lista

```
GET /api/v1/lists/<id>/items/    (autenticado)
```

Devuelve los ítems de la lista en formato textual normalizado.

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "name": "leche entera",
      "normalized_name": "leche entera",
      "product_name": "leche entera",
      "quantity": 2,
      "is_checked": false
    }
  ]
}
```

---

### Añadir ítem a una lista

```
POST /api/v1/lists/<id>/items/    (autenticado)
```

**Body:**

```json
{
  "name": "leche entera",
  "quantity": 2
}
```

Si ya existe un ítem con el mismo `normalized_name` en la lista, el backend suma cantidades y
responde `200` con el ítem actualizado en lugar de crear uno nuevo.

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "leche entera",
    "normalized_name": "leche entera",
    "product_name": "leche entera",
    "quantity": 2,
    "is_checked": false
  }
}
```

---

### Actualizar ítem de una lista

```
PATCH /api/v1/lists/<id>/items/<pk>/    (autenticado)
```

**Body (campos opcionales):**

```json
{
  "quantity": 3,
  "is_checked": true
}
```

**Respuesta 200:** Devuelve el ítem actualizado.

---

### Eliminar ítem de una lista

```
DELETE /api/v1/lists/<id>/items/<pk>/    (autenticado)
```

**Respuesta 204:** Sin cuerpo.

---

### Ver colaboradores de una lista

```
GET /api/v1/lists/<id>/collaborators/    (autenticado)
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "user_id": 5,
      "username": "colaborador1",
      "added_at": "2026-03-12T10:00:00Z"
    }
  ]
}
```

---

### Invitar colaborador

```
POST /api/v1/lists/<id>/collaborators/    (autenticado, solo propietario)
```

**Body:**

```json
{
  "username": "colaborador1"
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "username": "colaborador1"
  }
}
```

---

### Eliminar colaborador

```
DELETE /api/v1/lists/<id>/collaborators/<user_pk>/    (autenticado, solo propietario)
```

**Respuesta 204:** Sin cuerpo.

---

### Guardar lista como plantilla

```
POST /api/v1/lists/<id>/save-template/    (autenticado)
```

Guarda el contenido actual de la lista como una plantilla reutilizable.

**Body:**

```json
{
  "name": "Compra habitual"
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "template_id": 2,
    "name": "Compra habitual",
    "item_count": 8
  }
}
```

---

### Crear lista desde plantilla

```
POST /api/v1/lists/from-template/<template_pk>/    (autenticado)
```

Crea una nueva lista de la compra copiando todos los ítems de la plantilla indicada.

**Body (opcional):**

```json
{
  "name": "Compra semana 12"
}
```

Si no se proporciona `name`, se usa el nombre de la plantilla.

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Compra semana 12",
    "item_count": 8
  }
}
```

---

*Documentación generada para la Fase 1 del TFG BargAIn — ETSII-US, 2026.*
