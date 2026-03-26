---
status: fixing
trigger: "Comprueba que se crean los productos por scraping en todas las cadenas de supermercados"
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T11:32:00+01:00
---

## Current Focus

hypothesis: Lidl y DIA pueden extraerse sin depender de selectores de SPA si se consume su estado embebido/API interna; Carrefour sigue bloqueado por anti-bot.
test: Refactorizar Lidl y DIA para parsear payload embebido o endpoint interno y ejecutar spiders con timeout de 60s.
expecting: Lidl y DIA pasan de 0 items a item_scraped_count > 0 y matched > 0 en pipeline.
next_action: aplicar cambios en spiders lidl.py y dia.py y validar por ejecucion real en contenedor

## Symptoms

expected: Que se creen datos de scraping para todas las cadenas soportadas por spiders del proyecto.
actual: Pendiente de comprobacion empirica.
errors: Ninguno reportado por usuario (tarea de validacion).
reproduction: Ejecutar spiders/pipeline y verificar en BD conteos por cadena de registros creados.
started: Auditoria solicitada el 2026-03-26.

## Eliminated

- hypothesis: Los cuatro spiders estan creando productos en este entorno.
	evidence: Carrefour/Lidl/DIA muestran ModuleNotFoundError: scrapy_playwright y pipeline cerrado con matched=0 processed=0.
	timestamp: 2026-03-26T10:22:30+01:00

## Evidence

- timestamp: 2026-03-26T10:06:40+01:00
	checked: .planning/debug/knowledge-base.md
	found: No existe archivo de knowledge base para patrones previos.
	implication: No hay hipotesis inicial basada en incidencias resueltas.

- timestamp: 2026-03-26T10:06:50+01:00
	checked: Makefile target scrape
	found: El target make scrape ejecuta solo mercadona y carrefour.
	implication: La verificacion automatica por defecto no cubre todas las cadenas con spider disponible.

- timestamp: 2026-03-26T10:08:40+01:00
	checked: scraping/bargain_scraping/spiders
	found: Existen spiders para mercadona, carrefour, lidl y dia.
	implication: El alcance real a validar son 4 cadenas; no hay spider alcampo en este repositorio.

- timestamp: 2026-03-26T10:08:55+01:00
	checked: scraping/bargain_scraping/pipelines.py
	found: El pipeline crea/actualiza Product y Price, con source='scraping', emparejando Store por chain__name__icontains(store_chain).
	implication: Si no existe tienda activa por cadena, los items se descartan y no se crean productos/precios.

- timestamp: 2026-03-26T10:12:10+01:00
	checked: DB baseline via Django shell
	found: Existen cadenas seed_Alcampo, seed_Carrefour, seed_Dia, seed_Lidl y seed_Mercadona; todas tienen prices/products con source='scraping'.
	implication: Los datos actuales no prueban scraping real reciente porque pueden proceder de seed inicial.

- timestamp: 2026-03-26T10:13:50+01:00
	checked: ejecucion local scrapy list
	found: El comando scrapy no existe en el host actual.
	implication: La verificacion debe hacerse en contenedor o instalando dependencias locales.

- timestamp: 2026-03-26T10:14:00+01:00
	checked: consulta docker compose desde carpeta scraping/
	found: Fallo por no encontrar docker-compose.dev.yml al ejecutar fuera de la raiz del repo.
	implication: Ejecutar comandos docker desde la raiz del workspace.

- timestamp: 2026-03-26T10:21:40+01:00
	checked: ejecucion spider mercadona en contenedor
	found: PriceUpsertPipeline cerrado con matched=20, processed=20; item_scraped_count=20.
	implication: Mercadona crea/actualiza registros correctamente por scraping real.

- timestamp: 2026-03-26T10:22:05+01:00
	checked: ejecucion spider carrefour en contenedor
	found: Error Unsupported URL scheme 'https': No module named 'scrapy_playwright'; pipeline matched=0 processed=0.
	implication: Carrefour no crea productos en este entorno.

- timestamp: 2026-03-26T10:22:18+01:00
	checked: ejecucion spider lidl en contenedor
	found: Error Unsupported URL scheme 'https': No module named 'scrapy_playwright'; pipeline matched=0 processed=0.
	implication: Lidl no crea productos en este entorno.

- timestamp: 2026-03-26T10:22:26+01:00
	checked: ejecucion spider dia en contenedor
	found: Error Unsupported URL scheme 'https': No module named 'scrapy_playwright'; pipeline matched=0 processed=0.
	implication: DIA no crea productos en este entorno.

- timestamp: 2026-03-26T10:23:05+01:00
	checked: consulta BD source='scraping' ultimas 3h
	found: Solo seed_Mercadona presenta updates recientes (prices=14, new_products=14).
	implication: No se crean productos por scraping en todas las cadenas; solo Mercadona esta operativo.

- timestamp: 2026-03-26T11:04:40+01:00
	checked: docker-compose.dev.yml + backend Dockerfile.dev + backend requirements
	found: /scraping esta montado y en PYTHONPATH; faltaba scrapy-playwright en requirements.
	implication: La ubicacion externa de scraping no bloquea el acceso; la causa raiz es dependencia faltante.

- timestamp: 2026-03-26T11:05:10+01:00
	checked: backend/requirements/base.txt
	found: Se anadio scrapy-playwright>=0.0.34,<1.0.
	implication: El siguiente rebuild debe corregir el import error de spiders Playwright.

- timestamp: 2026-03-26T11:31:40+01:00
	checked: payload HTML/JS de www.dia.es y www.lidl.es
	found: DIA expone products en script vike_pageContext (INITIAL_STATE.home.sections[].content[].products) y Lidl expone endpoints internos /q/api/search y /q/api/gridboxes.
	implication: Es viable eliminar dependencia de selectores visuales frágiles y extraer por datos estructurados.

## Resolution

root_cause: El contenedor backend no tiene instalada la dependencia scrapy_playwright, requerida por spiders de Carrefour/Lidl/DIA.
fix: Añadida dependencia scrapy-playwright en backend/requirements/base.txt; pendiente validar tras rebuild.
verification: Ejecutados 4 spiders individualmente y contrastado en BD en ventana de 3h; solo Mercadona persiste.
files_changed: [.planning/debug/verificar-scraping-productos-cadenas.md]
