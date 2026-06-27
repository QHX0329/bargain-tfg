# Scraping contra producción — guía rápida

Ejecuta los spiders de BarGAIN contra la base de datos de **producción** (Render) y verifica
el resultado, sin levantar Postgres/Redis locales. Cada spider corre en un contenedor efímero
construido con `backend/Dockerfile.dev` (ya trae Django+GIS, Scrapy, Playwright y Chromium).

## 1. Requisitos

- Docker Desktop en marcha.
- La **External Database URL** de Render (no la interna).
  Render → tu base de datos → *Connections* → **External Database URL**. Tiene esta forma:

  ```
  postgresql://bargain:CONTRASEÑA@dpg-d8k23oho3t8c73ddi11g-a.<region>-postgres.render.com/bargain_n0nw
  ```

  La **Internal** URL (`...@dpg-d8k23oho3t8c73ddi11g-a/bargain_n0nw`, sin dominio ni puerto)
  **no es accesible desde tu PC**: solo funciona dentro de la red de Render. El script avisa si
  detecta que le has pasado la interna.

## 2. Ejecución

La URL nunca se hardcodea: se pasa por variable de entorno (o el script la pide de forma oculta).

**Windows (PowerShell):**

```powershell
$env:BARGAIN_PROD_DATABASE_URL = "postgresql://bargain:...@dpg-...-a.<region>-postgres.render.com/bargain_n0nw"
.\scripts\win\scrapear-produccion.ps1
```

**WSL / Git Bash / Linux / shell de Render:**

```bash
export BARGAIN_PROD_DATABASE_URL="postgresql://bargain:...@dpg-...-a.<region>-postgres.render.com/bargain_n0nw"
bash scripts/run-scrapers-prod.sh
```

Opciones útiles (ambos scripts):

- Subconjunto de spiders: `... mercadona carrefour lidl dia alcampo` (PowerShell: `-Spiders mercadona,carrefour`).
- `--skip-build` / `-SkipBuild`: no reconstruir la imagen.
- `--yes` / `-Yes`: no pedir confirmación.

El script fuerza `sslmode=require` automáticamente.

## 3. Qué verás

Antes y después corre `python manage.py scraping_status`, que imprime:

- Las cadenas (`StoreChain`) presentes y sus tiendas activas.
- Para cada spider, si **persistirá** o **descartará** items (matching de cadena).
- Recuento de precios por fuente, precios `scraping` por cadena y total de productos.

Al final, una tabla resumen con `guardados` / `descartados` por spider. Los logs quedan en
`logs/scraping-prod/<timestamp>/`.

## 4. Importante: solo 5 de 11 spiders persisten con el seed actual

El pipeline (`PriceUpsertPipeline._match_stores`) **descarta** todo item cuya cadena no exista ya
en la BD: `Store.objects.filter(chain__name__icontains=<cadena>, is_active=True)`.

Con los seeds actuales (`seed_demo` + `seed_sevilla`) existen las cadenas **Mercadona, Carrefour,
Lidl, Dia, Alcampo** (reales) y 7 cadenas ficticias de Sevilla. Por tanto:

| Spider | Cadena emitida | ¿Persiste? |
|--------|----------------|------------|
| mercadona, carrefour, lidl, dia, alcampo | Mercadona/Carrefour/Lidl/DIA/Alcampo | ✅ sí |
| costco, hipercor, eroski, spar, consum, coviran | Costco/Hipercor/Eroski/Spar/Consum/Coviran | ❌ no (sin cadena → items descartados) |

Para habilitar los otros 6 hay que crear su `StoreChain` (y al menos una `Store` activa con esa
cadena) en producción. El comando `scraping_status` te dice exactamente cuáles fallarán antes de
lanzar.

## 5. Notas de fiabilidad

- **mercadona** usa API JSON pública: es el más robusto.
- **carrefour** y **dia** usan Playwright/Chromium: más lentos y sensibles a anti-bot.
- El resto raspan HTML/PDF y son frágiles ante cambios de maqueta; pueden devolver 0 items.
- Producción es Render *free tier*: el servicio puede hibernar y la BD tiene límites; lanza los
  spiders pesados de uno en uno si ves problemas de memoria/tiempo.
- **Seguridad:** rota la contraseña de la BD si la has compartido en texto plano.
