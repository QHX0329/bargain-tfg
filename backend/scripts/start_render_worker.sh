#!/bin/sh
# start_render_worker.sh — Arranque del background worker Celery en Render.
#
# Servicio dedicado (bargain-free-worker) que ejecuta el worker + beat de Celery
# separados del web service, para que el scraping (Playwright/Chromium) y las
# tareas periódicas no compitan por la RAM de Gunicorn.
#
# Aplica migraciones antes de arrancar para garantizar que existan las tablas de
# django_celery_beat (DatabaseScheduler) la primera vez. Reutiliza la imagen
# Dockerfile.render, que incluye Chromium para los spiders.
set -e

echo "[worker] Aplicando migraciones..."
python manage.py migrate --noinput

echo "[worker] Lanzando Celery worker + beat (concurrency=1, DatabaseScheduler)..."
exec celery -A config worker -B -l info --concurrency 1 \
  --scheduler django_celery_beat.schedulers:DatabaseScheduler
