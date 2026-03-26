import json
from decimal import Decimal
from pathlib import Path

from django.utils import timezone

from apps.products.models import Product
from apps.prices.models import Price
from apps.stores.models import Store, StoreChain

DATA_PATH = Path('/app/tmp/chain_products_batch_20260327.json')

if not DATA_PATH.exists():
    raise SystemExit(f'Data file not found: {DATA_PATH}')

with DATA_PATH.open('r', encoding='utf-8') as f:
    data = json.load(f)

summary = {
    'products_created': 0,
    'products_updated': 0,
    'prices_created': 0,
    'prices_updated': 0,
}


def upsert_product(name: str, chain_name: str, source_url: str) -> Product:
    normalized_name = name.lower().strip()
    product = (
        Product.objects.filter(normalized_name=normalized_name, brand=chain_name)
        .order_by('id')
        .first()
    )

    if product is None:
        product = Product.objects.create(
            name=name,
            normalized_name=normalized_name,
            brand=chain_name,
            image_url=source_url,
            unit=Product.Unit.UNITS,
            unit_quantity=1.0,
            is_active=True,
        )
        summary['products_created'] += 1
        return product

    changes = []
    if source_url and product.image_url != source_url:
        product.image_url = source_url
        changes.append('image_url')
    if not product.is_active:
        product.is_active = True
        changes.append('is_active')
    if changes:
        product.save(update_fields=changes)
        summary['products_updated'] += 1
    return product


for chain_key in ('eroski', 'spar', 'consum', 'coviran'):
    chain_name = chain_key.capitalize()
    chain = StoreChain.objects.filter(name__iexact=chain_name).first()
    if chain is None:
        print(f'[WARN] Chain not found: {chain_name}')
        continue

    stores = list(Store.objects.filter(chain=chain, is_active=True).order_by('id'))
    if not stores:
        print(f'[WARN] No active stores for chain: {chain_name}')

    rows = data.get(chain_key, [])
    print(f'Processing chain={chain_name}, rows={len(rows)}, stores={len(stores)}')

    for row in rows:
        name = row['name'].strip()
        source_url = row.get('source_url', '').strip()
        product = upsert_product(name, chain.name, source_url)

        price_str = row.get('price')
        if not price_str:
            continue

        price_value = Decimal(price_str)
        for store in stores:
            _, created = Price.objects.update_or_create(
                product=product,
                store=store,
                source=Price.Source.SCRAPING,
                defaults={
                    'price': price_value,
                    'is_stale': False,
                    'verified_at': timezone.now(),
                },
            )
            if created:
                summary['prices_created'] += 1
            else:
                summary['prices_updated'] += 1

print('--- IMPORT SUMMARY ---')
for key, value in summary.items():
    print(f'{key}={value}')
