# ADR-005: Estrategia de matching de tiendas con Google Places

**Fecha:** 2026-03-24
**Estado:** Aceptada
**Contexto:** Integración Google Places autocomplete con tiendas en base de datos

## Problema

Al buscar un supermercado en el autocompletado de Google Places (ej: "Mercadona Kansas City"),
el sistema necesita determinar si el resultado corresponde a una tienda ya registrada en la BD
o si es un lugar desconocido (discovery marker gris).

La implementación inicial usaba únicamente distancia haversine < 50 metros entre las
coordenadas de Google y las de la BD. Esto fallaba porque:

1. Las coordenadas seed eran aproximadas (errores de 100m a 1.9km respecto a Google).
2. Incluso con coordenadas exactas, 50m es un umbral frágil para tiendas en zonas densas.
3. No aprovechaba el campo `google_place_id` ya existente en el modelo `Store`.

## Decisión

Se implementa una estrategia de matching en 3 niveles (más fiable → menos fiable):

### Nivel 1: Backend match por `google_place_id` (exacto)
El endpoint `places-resolve` busca en la BD si alguna tienda activa tiene ese `google_place_id`.
Si encuentra coincidencia, devuelve `matched_store_id` en la respuesta.

```python
matched = Store.objects.filter(
    google_place_id=place_id, is_active=True
).values_list("pk", flat=True).first()
```

### Nivel 2: Frontend match local por `google_place_id`
El serializer ahora expone `google_place_id` en el listado de tiendas.
El frontend busca en las tiendas ya cargadas en el mapa.

### Nivel 3: Fallback por proximidad haversine < 200m
Para tiendas sin `google_place_id`, se amplía el umbral a 200m (antes 50m).
Esto cubre tiendas sin vincular que estén razonablemente cerca.

### Coordenadas del seed
Se corrigieron las coordenadas de las 9 tiendas con `google_place_id` usando los datos
exactos de la Google Places API. Las direcciones también se actualizaron.

## Consecuencias

**Positivas:**
- El matching es determinista para tiendas con `google_place_id` (9 de 22 en seed).
- El fallback por proximidad ahora funciona con coordenadas reales.
- El `google_place_id` en el serializer permite a futuro enriquecer la UI directamente.

**Negativas:**
- El `matched_store_id` no se cachea (se consulta la BD en cada resolución) porque
  el estado de la BD puede cambiar. El impacto es mínimo: 1 query simple por FK indexado.
- Las tiendas sin `google_place_id` (13 de 22) dependen del fallback por proximidad.

## Alternativas descartadas

- **Solo haversine con umbral mayor:** Podría dar falsos positivos en zonas con tiendas cercanas.
- **Matching por nombre:** Frágil — los nombres de Google no coinciden con los de la BD
  (ej: "Mercadona" vs "seed_Mercadona Kansas City").
- **Cache del matched_store_id:** Ahorraría queries pero podría devolver datos obsoletos
  si se elimina o desactiva una tienda.
