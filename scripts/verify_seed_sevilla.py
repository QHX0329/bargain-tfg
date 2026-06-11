"""Verificación de seed_sevilla: conteos de tiendas, precios y productos.

Pensado para ejecutarse vía ``manage.py shell`` (local o staging):
    Get-Content -Raw scripts/verify_seed_sevilla.py | python manage.py shell
"""

from django.db.models import Avg, Count

from apps.prices.models import Price
from apps.products.models import Product
from apps.stores.models import Store

FICTIONAL_SLUGS = [
    "superguadalquivir",
    "mercasur",
    "hispalis-market",
    "superazahar",
    "almacenes-triana",
    "la-giralda-super",
    "superbetica",
]

stores = Store.objects.filter(chain__slug__in=FICTIONAL_SLUGS, is_active=True)
n_stores = stores.count()
agg = list(
    Price.objects.filter(store__in=stores).values("store_id").annotate(n=Count("id"))
)
counts = [a["n"] for a in agg] or [0]
total = sum(counts)
media = Price.objects.filter(store__in=stores).aggregate(a=Avg("price"))["a"]

print(f"TIENDAS FICTICIAS: {n_stores}")
print(f"TIENDAS CON PRECIOS: {len(agg)}")
print(f"PRECIOS POR TIENDA min/max: {min(counts)}/{max(counts)}")
print(f"PRECIOS TOTALES (ficticias): {total}")
print(f"PRECIO MEDIO: {media:.2f} EUR" if media else "PRECIO MEDIO: n/a")
print(f"PRODUCTOS TOTALES EN CATALOGO: {Product.objects.count()}")

ok = n_stores >= 50 and len(agg) >= 50 and min(counts) >= 1000
print("VERIFICACION SEED_SEVILLA: " + ("OK" if ok else "FALLIDA"))
