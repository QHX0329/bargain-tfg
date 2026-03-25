---
phase: 05-optimizer-scraping
plan: 01
subsystem: scraping
tags: [scrapy, celery, playwright, web-scraping, spiders]
dependency_graph:
  requires: [apps.prices.models.Price, apps.products.models.Product, apps.stores.models.Store]
  provides: [run_spider celery task, 4 scrapy spiders, price upsert pipeline]
  affects: [apps.scraping, scraping/bargain_scraping]
tech_stack:
  added: [scrapy-playwright, multiprocessing spider isolation]
  patterns: [CrawlerProcess in subprocess, Django ORM upsert pipeline, Celery Beat scheduling]
key_files:
  created:
    - scraping/bargain_scraping/spiders/mercadona.py
    - scraping/bargain_scraping/spiders/carrefour.py
    - scraping/bargain_scraping/spiders/lidl.py
    - scraping/bargain_scraping/spiders/dia.py
    - scraping/bargain_scraping/pipelines.py
    - scraping/bargain_scraping/items.py
    - backend/tests/unit/test_scraping_pipeline.py
  modified:
    - backend/apps/scraping/tasks.py
    - backend/config/settings/base.py
    - backend/Dockerfile.dev
decisions:
  - Mercadona uses JSON API (no Playwright needed), other 3 use scrapy-playwright for JS rendering
  - Scrapy runs in subprocess via multiprocessing to isolate Twisted reactor from Celery
  - Celery Beat staggered: Mercadona 6:00, Carrefour 6:30, Lidl 7:00, DIA 7:30
  - Graceful 403 handling for anti-bot detection in Playwright spiders
metrics:
  duration_minutes: 10
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 7
  files_modified: 3
---

## Self-Check: PASSED

All plan tasks completed:
1. Scrapy spiders + items + pipeline (ProductPriceItem, PriceUpsertPipeline, 4 spiders)
2. Celery tasks + Beat schedule + Playwright Docker + tests

## What Was Built

Complete web scraping infrastructure for 4 Spanish supermarkets:
- **MercadonaSpider**: Direct JSON API scraping (no browser needed)
- **CarrefourSpider, LidlSpider, DiaSpider**: Playwright-based browser scraping with anti-bot handling
- **PriceUpsertPipeline**: Upserts prices into Django Price model with source=scraping
- **ProductPriceItem**: Scrapy item with price, unit_price, offer_price, barcode, url fields
- **run_spider Celery task**: Isolated subprocess execution to avoid Twisted/Celery reactor conflicts
- **Celery Beat schedule**: 4 daily spider runs staggered every 30 minutes starting 6:00 AM
- **Playwright in Docker**: chromium browser installed in Dockerfile.dev

## Deviations

- Agent hit linter issues on first commit attempt; Lidl/DIA Beat entries and Celery tasks committed separately by orchestrator
