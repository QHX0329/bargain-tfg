#!/usr/bin/env bash
#
# run-scrapers-prod.sh — Ejecuta los spiders de BarGAIN contra la BD de PRODUCCIÓN y verifica.
#
# Lanza cada spider en un contenedor efímero construido con backend/Dockerfile.dev
# (Django+GIS, Scrapy, Playwright y Chromium ya incluidos; ./scraping montado en /scraping),
# apuntando a producción sobrescribiendo DATABASE_URL solo para esa ejecución (--no-deps,
# sin Postgres/Redis locales). Antes y después ejecuta `scraping_status` para ver qué spiders
# persisten datos y el conteo real de precios/productos.
#
# Equivalente Bash de scripts/win/scrapear-produccion.ps1 (para WSL, Git Bash, Linux o
# la shell de Render). Usa la EXTERNAL Database URL de Render (host .render.com + SSL);
# la Internal URL (host sin dominio) no es accesible desde fuera de Render.
#
# Uso:
#   export BARGAIN_PROD_DATABASE_URL="postgresql://bargain:***@dpg-xxxx-a.<region>-postgres.render.com/bargain_n0nw"
#   bash scripts/run-scrapers-prod.sh                       # los 11 spiders
#   bash scripts/run-scrapers-prod.sh mercadona carrefour   # subconjunto
#   bash scripts/run-scrapers-prod.sh --yes --skip-build    # sin confirmación ni rebuild
#
set -uo pipefail

COMPOSE_FILE="docker-compose.dev.yml"
DEFAULT_SPIDERS=(mercadona carrefour lidl dia alcampo costco hipercor eroski spar consum coviran)

SKIP_BUILD=0
ASSUME_YES="${YES:-0}"
SPIDERS=()

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --yes|-y)     ASSUME_YES=1 ;;
    -*)           echo "Opción desconocida: $arg" >&2; exit 2 ;;
    *)            SPIDERS+=("$arg") ;;
  esac
done
[ ${#SPIDERS[@]} -eq 0 ] && SPIDERS=("${DEFAULT_SPIDERS[@]}")

# ── Raíz del repo (este script vive en scripts/) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
[ -f "$COMPOSE_FILE" ] || { echo "No encuentro $COMPOSE_FILE en $REPO_ROOT" >&2; exit 1; }

# ── URL de producción (sin hardcodear) ──
PROD_URL="${BARGAIN_PROD_DATABASE_URL:-}"
if [ -z "$PROD_URL" ]; then
  read -rs -p "Pega la EXTERNAL Database URL de producción (Render): " PROD_URL
  echo
fi
[ -n "$PROD_URL" ] || { echo "No se proporcionó ninguna URL." >&2; exit 1; }
case "$PROD_URL" in
  postgres://*|postgresql://*|postgis://*) ;;
  *) echo "La URL no parece una cadena de conexión PostgreSQL válida." >&2; exit 1 ;;
esac

# Aviso si parece la URL INTERNA de Render (host sin punto).
DB_HOST="$(printf '%s' "$PROD_URL" | sed -nE 's#.*@([^/:?]+).*#\1#p')"
if [ -n "$DB_HOST" ] && ! printf '%s' "$DB_HOST" | grep -q '\.'; then
  echo "AVISO: el host '$DB_HOST' no tiene dominio: parece la Internal Database URL de Render," >&2
  echo "       no accesible desde fuera de Render. Usa la External Database URL." >&2
fi

# Forzar SSL.
if ! printf '%s' "$PROD_URL" | grep -q 'sslmode='; then
  if printf '%s' "$PROD_URL" | grep -q '?'; then PROD_URL="${PROD_URL}&sslmode=require";
  else PROD_URL="${PROD_URL}?sslmode=require"; fi
fi

MASKED="$(printf '%s' "$PROD_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#')"
echo
echo "Destino de escritura (PRODUCCIÓN): $MASKED"
echo "Spiders a ejecutar: ${SPIDERS[*]}"

if [ "$ASSUME_YES" != "1" ]; then
  read -r -p 'Vas a ESCRIBIR en producción. ¿Continuar? (escribe "si"): ' CONFIRM
  [ "$CONFIRM" = "si" ] || { echo "Cancelado."; exit 0; }
fi

RUN_ARGS=(compose -f "$COMPOSE_FILE" run --rm --no-deps
  -e "DATABASE_URL=$PROD_URL"
  -e "DJANGO_SETTINGS_MODULE=config.settings.dev"
  backend)

# ── Build (idempotente) ──
if [ "$SKIP_BUILD" != "1" ]; then
  echo; echo "[build] Construyendo imagen backend..."
  docker compose -f "$COMPOSE_FILE" build backend || { echo "Falló el build." >&2; exit 1; }
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$REPO_ROOT/logs/scraping-prod/$STAMP"
mkdir -p "$LOG_DIR"

last_count() {  # $1=logfile  $2=clave
  [ -f "$1" ] || { echo 0; return; }
  grep -oE "'$2': *[0-9]+" "$1" | tail -n1 | grep -oE '[0-9]+' || echo 0
}

# ── PREFLIGHT ──
echo; echo "[preflight] Estado previo en producción..."
docker "${RUN_ARGS[@]}" python manage.py scraping_status --title "PREFLIGHT (antes de scrapear)" 2>&1 \
  | tee "$LOG_DIR/00-preflight.log"

# ── Spiders ──
declare -a SUMMARY
for spider in "${SPIDERS[@]}"; do
  LOG="$LOG_DIR/$spider.log"
  echo; echo "[spider] $spider → log: $LOG"
  docker "${RUN_ARGS[@]}" sh -lc "cd /scraping && scrapy crawl $spider -s LOG_LEVEL=INFO" 2>&1 \
    | tee "$LOG"
  EXIT="${PIPESTATUS[0]}"
  SAVED="$(last_count "$LOG" item_scraped_count)"
  DROPPED="$(last_count "$LOG" item_dropped_count)"
  SUMMARY+=("$(printf '%-11s exit=%-3s guardados=%-6s descartados=%s' \
    "$spider" "$EXIT" "$SAVED" "$DROPPED")")
done

# ── POSTFLIGHT ──
echo; echo "[postflight] Estado final en producción..."
docker "${RUN_ARGS[@]}" python manage.py scraping_status --title "POSTFLIGHT (después de scrapear)" 2>&1 \
  | tee "$LOG_DIR/99-postflight.log"

# ── Resumen ──
echo; echo "================ RESUMEN ================"
for line in "${SUMMARY[@]}"; do echo "  $line"; done
echo "Logs completos en: $LOG_DIR"
echo "Nota: guardados=0 y descartados>0 → la cadena del spider no existe en producción."
