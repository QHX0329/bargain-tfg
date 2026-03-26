"""Comando para poblar usuarios seed y tiendas reales de scraping."""

from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.stores.models import Store, StoreChain

DEFAULT_SEED_PASSWORD = "seedpass123"
SEED_PREFIX = "seed_"

# Solo cadenas soportadas por los spiders productivos.
CHAIN_SPECS = [
    ("Mercadona", "mercadona"),
    ("Carrefour", "carrefour"),
    ("Lidl", "lidl"),
    ("DIA", "dia"),
]

# (nombre tienda, slug cadena, lat, lon, dirección, google_place_id | None)
CHAIN_STORE_SPECS = [
    (
        "Mercadona Triana",
        "mercadona",
        37.379742,
        -5.999756,
        "C. Salado, s/n, 41010 Sevilla",
        "ChIJi71i9xVsEg0Rts2Uj5zQPN0",
    ),
    (
        "Mercadona Kansas City",
        "mercadona",
        37.389591,
        -5.974207,
        "Av. de Kansas City, 32, 41007 Sevilla",
        "ChIJawDv6IpvEg0R792FYxdrA70",
    ),
    (
        "Mercadona Macarena",
        "mercadona",
        37.406521,
        -5.989578,
        "Don Fadrique, 63, 41009 Sevilla",
        "ChIJg0JmbPlrEg0RFBeG_v47BfU",
    ),
    (
        "Carrefour Express Centro",
        "carrefour",
        37.388378,
        -5.997026,
        "C. Zaragoza, 31, 41001 Sevilla",
        "ChIJidaK5tttEg0RSS_aEITaM9A",
    ),
    (
        "Carrefour Sevilla Este",
        "carrefour",
        37.407294,
        -5.939123,
        "C. José Jesús García Díaz, 1, 41020 Sevilla",
        "ChIJBcALJkRpEg0RrZhp0GvM9ns",
    ),
    (
        "Lidl Bellavista",
        "lidl",
        37.333180,
        -5.969590,
        "Av. de Jerez, 6, 41014 Sevilla",
        "ChIJU_phYxFuEg0RFoMectqEUSo",
    ),
    (
        "Lidl San Juan",
        "lidl",
        37.372740,
        -6.033980,
        "Ctra. de Tomares al Manchón, 10-B, San Juan de Aznalfarache",
        "ChIJMVbyGv1sEg0RN9YzZW7jHLU",
    ),
    (
        "Dia Los Remedios",
        "dia",
        37.3791,
        -6.0095,
        "Los Remedios, Sevilla",
        None,
    ),
    (
        "Dia Heliópolis",
        "dia",
        37.3511,
        -5.9815,
        "Heliópolis, Sevilla",
        None,
    ),
    (
        "Dia Pino Montano",
        "dia",
        37.4150,
        -5.9825,
        "Pino Montano, Sevilla",
        None,
    ),
]


@dataclass
class SeedStats:
    created: int = 0
    updated: int = 0


class Command(BaseCommand):
    """Puebla usuarios seed y tiendas reales necesarias para scraping."""

    help = (
        "Crea solo usuarios seed y tiendas/cadenas reales de scraping. "
        "No genera catálogo, precios, listas ni datos demo inventados."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--consumers",
            type=int,
            default=10,
            help="Cantidad de usuarios consumer a crear (por defecto: 10)",
        )
        parser.add_argument(
            "--businesses",
            type=int,
            default=5,
            help="Cantidad de usuarios business a crear (por defecto: 5)",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina usuarios y tiendas gestionados por este comando antes de recrearlos",
        )

    def handle(self, *args, **options) -> None:
        consumers = options["consumers"]
        businesses = options["businesses"]
        reset = options["reset"]

        if consumers < 0 or businesses < 0:
            raise CommandError("Los argumentos --consumers y --businesses no pueden ser negativos")

        user_model = get_user_model()
        if reset:
            deleted_count = self._reset_seed_data(user_model)
            self.stdout.write(self.style.WARNING(f"Registros eliminados: {deleted_count}"))

        stats = SeedStats()
        with transaction.atomic():
            self._upsert_admin_user(user_model, stats)
            self._upsert_role_users(user_model, role="consumer", total=consumers, stats=stats)
            self._upsert_role_users(user_model, role="business", total=businesses, stats=stats)
            self._seed_store_network(stats)

        self.stdout.write(
            self.style.SUCCESS(
                "Seed ejecutado: solo usuarios y tiendas reales de scraping."
            )
        )
        self.stdout.write(f"Registros creados: {stats.created}")
        self.stdout.write(f"Registros actualizados: {stats.updated}")
        self.stdout.write(f"Password común seed: {DEFAULT_SEED_PASSWORD}")

    def _reset_seed_data(self, user_model) -> int:
        """Elimina únicamente usuarios y tiendas controlados por el comando."""
        deleted_total = 0

        managed_store_names = [name for name, _, _, _, _, _ in CHAIN_STORE_SPECS]
        managed_chain_slugs = [slug for _, slug in CHAIN_SPECS]

        for queryset in [
            Store.objects.filter(name__in=managed_store_names),
            StoreChain.objects.filter(slug__in=managed_chain_slugs),
            user_model.objects.filter(username__startswith=SEED_PREFIX),
        ]:
            deleted_count, _ = queryset.delete()
            deleted_total += deleted_count

        return deleted_total

    def _upsert_admin_user(self, user_model, stats: SeedStats) -> None:
        defaults = {
            "email": "seed_admin@bargain.local",
            "first_name": "Admin",
            "last_name": "Seed",
            "role": user_model.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True,
        }
        user, created = user_model.objects.get_or_create(username="seed_admin", defaults=defaults)
        if created:
            user.set_password(DEFAULT_SEED_PASSWORD)
            user.save(update_fields=["password"])
            stats.created += 1
            return

        self._update_user_fields(user=user, defaults=defaults, stats=stats)

    def _upsert_role_users(self, user_model, role: str, total: int, stats: SeedStats):
        first_names = [
            "Ana",
            "Carlos",
            "María",
            "Javier",
            "Laura",
            "Pedro",
            "Sofía",
            "Diego",
            "Elena",
            "Marcos",
        ]
        last_names = [
            "García",
            "López",
            "Martínez",
            "Sánchez",
            "Pérez",
            "González",
            "Rodríguez",
            "Fernández",
            "Jiménez",
            "Díaz",
        ]

        for index in range(1, total + 1):
            username = f"seed_{role}_{index}"
            defaults = {
                "email": f"{username}@bargain.local",
                "first_name": first_names[(index - 1) % len(first_names)],
                "last_name": last_names[(index - 1) % len(last_names)],
                "role": role,
                "is_staff": False,
                "is_superuser": False,
                "max_search_radius_km": 10,
                "max_stops": 3,
                "weight_price": 34,
                "weight_distance": 33,
                "weight_time": 33,
            }
            user, created = user_model.objects.get_or_create(username=username, defaults=defaults)
            if created:
                user.set_password(DEFAULT_SEED_PASSWORD)
                user.save(update_fields=["password"])
                stats.created += 1
                continue

            self._update_user_fields(user=user, defaults=defaults, stats=stats)

    def _seed_store_network(self, stats: SeedStats) -> None:
        chains_by_slug: dict[str, StoreChain] = {}
        for chain_name, chain_slug in CHAIN_SPECS:
            chain, created = StoreChain.objects.update_or_create(
                slug=chain_slug,
                defaults={
                    "name": chain_name,
                    "logo_url": "",
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            chains_by_slug[chain_slug] = chain

        for store_name, chain_slug, lat, lon, address, place_id in CHAIN_STORE_SPECS:
            _, created = Store.objects.update_or_create(
                name=store_name,
                defaults={
                    "chain": chains_by_slug[chain_slug],
                    "address": address,
                    "location": Point(lon, lat, srid=4326),
                    "opening_hours": {},
                    "is_local_business": False,
                    "business_profile": None,
                    "is_active": True,
                    "google_place_id": place_id or "",
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)

    @staticmethod
    def _update_user_fields(*, user, defaults: dict[str, object], stats: SeedStats) -> None:
        changed_fields: list[str] = []
        for field_name, expected_value in defaults.items():
            if getattr(user, field_name, None) != expected_value:
                setattr(user, field_name, expected_value)
                changed_fields.append(field_name)

        user.set_password(DEFAULT_SEED_PASSWORD)
        changed_fields.append("password")
        user.save(update_fields=changed_fields)
        stats.updated += 1
