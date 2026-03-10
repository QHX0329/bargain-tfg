# Glosario — Proyecto BargAIn

Términos internos, siglas y abreviaturas del proyecto.

## Acrónimos del proyecto
| Término | Significado | Contexto |
|---------|-------------|---------|
| BargAIn | Asistente Unificado de Rutas y Ahorro | Nombre del proyecto TFG |
| TFG | Trabajo Fin de Grado | Documento académico final |
| PDT | Precio-Distancia-Tiempo | Pesos del algoritmo de optimización |
| DRF | Django REST Framework | Framework API backend |
| ETSII-US | Escuela Técnica Superior de Ingeniería Informática, Universidad de Sevilla | Universidad |
| HU | Historia de Usuario | Artefacto de requisitos ágiles |
| RF | Requisito Funcional | Artefacto de requisitos |
| RNF | Requisito No Funcional | Artefacto de requisitos |
| RI | Requisito de Información | Artefacto de requisitos |
| RN | Regla de Negocio | Artefacto de requisitos |
| ADR | Architecture Decision Record | Documento de decisión arquitectónica (docs/decisiones/) |
| PYME | Pequeña y Mediana Empresa | Módulo business de BargAIn |

## Términos internos del proyecto
| Término | Significado |
|---------|-------------|
| la memoria | Documento TFG en docs/memoria/ (12 capítulos) |
| el algoritmo | Algoritmo de optimización multicriterio PDT (backend/apps/optimizer/) |
| el scraping | Módulo Scrapy para obtener precios de supermercados (scraping/) |
| el OCR | Módulo de visión artificial para tickets/listas (backend/apps/ocr/) |
| el asistente | Módulo LLM con Claude API (backend/apps/assistant/) |
| el optimizer | App Django backend/apps/optimizer/ |
| el portal / portal business | App Django backend/apps/business/ para PYMEs |
| staging | Entorno de pruebas en Render (deploy automático vía GitHub Actions) |
| la ruta | Resultado de optimización con paradas ordenadas de compra |
| candidatos | Combinaciones de tiendas evaluadas por el optimizer |
| score | Puntuación de una ruta candidata según función PDT |
| fuentes verificadas | Jerarquía: API oficial > Scraping > Crowdsourcing |
| caducidad de precio | 48h para scraping, 24h para crowdsourcing |

## Supermercados con spider
| Nombre | Spider |
|--------|--------|
| Mercadona | scraping/bargain_scraping/spiders/mercadona.py |
| Carrefour | scraping/bargain_scraping/spiders/carrefour.py |
| Lidl | scraping/bargain_scraping/spiders/lidl.py |
| DIA | scraping/bargain_scraping/spiders/dia.py |
| Alcampo | scraping/bargain_scraping/spiders/alcampo.py |

## Apps Django (backend/apps/)
| App | Responsabilidad |
|-----|----------------|
| users | Autenticación, perfiles, roles |
| products | Catálogo de productos normalizados |
| stores | Supermercados y comercios (PostGIS) |
| prices | Precios actuales e histórico |
| scraping | Spiders Scrapy + pipeline |
| shopping_lists | Listas de la compra del usuario |
| optimizer | Algoritmo PDT |
| ocr | Procesamiento de fotos/tickets |
| assistant | Integración LLM (Claude API) |
| business | Portal PYMEs, suscripciones |
| notifications | Push + email |
| core | Excepciones, utilidades comunes |

## Comandos Make frecuentes
| Comando | Acción |
|---------|--------|
| make dev | Levantar entorno completo (Docker) |
| make test | Ejecutar todos los tests |
| make lint | Lint backend + frontend |
| make migrate | Aplicar migraciones Django |
| make seed | Poblar BD con datos de prueba |
| make scrape | Ejecutar spiders de scraping |

## Modelos de datos clave
| Modelo | Campos clave |
|--------|-------------|
| Product | id, name, normalized_name, barcode, category, brand |
| Store | id, name, chain, address, location (PostGIS), opening_hours |
| Price | id, product, store, price, offer_price, source, verified_at |
| ShoppingList | id, user, name, items |
| OptimizationResult | id, shopping_list, user_location, mode, route_data (JSON) |

## Git / Convenciones
| Concepto | Convención |
|----------|-----------|
| Rama producción | main |
| Rama integración | develop |
| Nuevas features | feature/XX-descripcion |
| Bugfixes | fix/XX-descripcion |
| Documentación | docs/XX-descripcion |
| Commits | Conventional Commits en español |
| PR target | Siempre contra develop |
