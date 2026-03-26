# ADR-009: Desacoplar ShoppingListItem del catálogo Product

## Estado
Aceptado

## Fecha
2026-03-26

## Contexto

El diseño original modelaba cada ítem de lista con una relación directa `ShoppingListItem -> Product`
(`product_id` obligatorio). Esta estrategia parecía adecuada para garantizar integridad referencial,
pero introdujo fricción funcional en los casos reales de comparación de precios multitienda.

En la práctica, un mismo producto de consumo aparece con denominaciones heterogéneas según:

- cadena comercial (marca blanca y nomenclatura propia),
- formato de packaging y promociones temporales,
- fuente de captura (scraping, crowdsourcing, OCR, entrada manual),
- nivel de detalle del texto introducido por el usuario.

Forzar la selección de `Product` en el momento de creación del ítem desplazaba un problema
semántico complejo a una fase temprana del flujo y degradaba la experiencia de usuario:

- aumentaban los falsos negativos al añadir ítems,
- se producían asignaciones tempranas incorrectas,
- la comparación de cesta dependía de una normalización prematura y rígida.

## Decisión

Se elimina la relación directa `ShoppingListItem -> Product` y se adopta un modelo textual:

- `ShoppingListItem.name` como texto libre,
- `ShoppingListItem.normalized_name` como representación normalizada e indexada,
- resolución de candidatos a producto/precio en tiempo de comparación/optimización.

La resolución se realiza de forma contextual (tiendas candidatas + precios vigentes + matching fuzzy)
en lugar de imponer una identidad de catálogo única en el momento de alta del ítem.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
| --- | --- | --- |
| Mantener `product_id` obligatorio | Integridad fuerte y joins simples | Baja tolerancia a variantes comerciales; fricción al alta; errores tempranos de matching |
| `product_id` opcional + fallback textual | Migración suave | Doble semántica del ítem y mayor complejidad de mantenimiento |
| Ítem puramente textual con resolución diferida (elegida) | Captura flexible, mejor ajuste multifuente, matching contextual por tienda | Matching probabilístico, mayor coste computacional y necesidad de observabilidad |

## Justificación técnica

- Separa claramente dos responsabilidades distintas:
  - captura de intención del usuario (qué quiere comprar),
  - resolución de oferta concreta (qué SKU/precio lo representa en cada tienda).
- Evita acoplar la UX de listas a la calidad instantánea del catálogo normalizado.
- Permite incorporar mejoras de matching sin migrar el modelo de listas.
- Mejora la comparación multitienda, porque la resolución se hace sobre datos de precio actuales
y dentro del radio geográfico/configuración real de la consulta.

## Consecuencias

- El contrato de API de listas cambia: alta/edición de ítems por `name` y `quantity`, sin `product` obligatorio.
- El módulo de optimización debe reportar ítems no resueltos (`unmatched_items`) de forma explícita.
- El matching pasa a ser parte crítica del rendimiento; se mitiga con:
  - normalización determinista,
  - preselección por trigramas (`pg_trgm`),
  - ranking fuzzy con contexto de tienda,
  - límites de candidatos (`top-k`).

## Impacto en documentación

Esta ADR exige mantener sincronizados los siguientes artefactos:

- memoria de requisitos (modelo de información y RF de listas),
- memoria de diseño/implementación (modelo de datos y pipeline del optimizador),
- referencia API (payloads de `/api/v1/lists/*` y `/api/v1/prices/list-total/`),
- documentación operativa de agentes (`CLAUDE.md`).
