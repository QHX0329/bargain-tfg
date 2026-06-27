#!/bin/sh
# start_render_free.sh — Arranque del web service gratuito en Render.
#
# Ejecuta migraciones, asegura el superusuario (idempotente), siembra datos demo
# y deja Gunicorn en primer plano sirviendo en $PORT.
#
# Celery (worker + beat) ya NO se ejecuta aquí: corre en un servicio dedicado
# (bargain-free-worker, ver render.free.yaml / start_render_worker.sh).
set -e

echo "[start] Aplicando migraciones..."
python manage.py migrate --noinput

# collectstatic NO se ejecuta aquí: los estáticos se generan en el build de la
# imagen (ver Dockerfile.render) para acelerar el arranque en frío del free tier.

echo "[start] Asegurando superusuario (desde variables DJANGO_SUPERUSER_*)..."
python manage.py createsuperuser --noinput 2>/dev/null \
  && echo "[start] Superusuario creado." \
  || echo "[start] Superusuario ya existe o no configurado; continuando."

echo "[start] Sembrando datos de demostracion (idempotente)..."
python manage.py seed_demo 2>&1 | tail -5 \
  || echo "[start] seed_demo fallo; continuando sin datos demo."

echo "[start] Sembrando red de tiendas ficticias de Sevilla (idempotente)..."
python manage.py seed_sevilla 2>&1 | tail -4 \
  || echo "[start] seed_sevilla fallo; continuando."

# Celery worker + beat se ejecutan en el servicio dedicado bargain-free-worker
# (start_render_worker.sh), no aquí, para no competir por la RAM del web service.

echo "[start] Lanzando Gunicorn en el puerto ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --timeout 120
