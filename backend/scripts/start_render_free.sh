#!/bin/sh
# start_render_free.sh — Arranque del web service gratuito en Render.
#
# Ejecuta migraciones, recopila estáticos, asegura el superusuario (idempotente),
# lanza Celery worker + beat embebidos en segundo plano y deja Gunicorn en primer
# plano sirviendo en $PORT. Diseñado para el free tier (512 MB, concurrencia baja).
set -e

echo "[start] Aplicando migraciones..."
python manage.py migrate --noinput

# collectstatic NO se ejecuta aquí: los estáticos se generan en el build de la
# imagen (ver Dockerfile.render) para acelerar el arranque en frío del free tier.

echo "[start] Asegurando superusuario (desde variables DJANGO_SUPERUSER_*)..."
python manage.py createsuperuser --noinput 2>/dev/null \
  && echo "[start] Superusuario creado." \
  || echo "[start] Superusuario ya existe o no configurado; continuando."

echo "[start] Lanzando Celery worker + beat embebidos (concurrency=1)..."
celery -A config worker -B -l info --concurrency 1 \
  --scheduler django_celery_beat.schedulers:DatabaseScheduler &

echo "[start] Lanzando Gunicorn en el puerto ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --timeout 120
