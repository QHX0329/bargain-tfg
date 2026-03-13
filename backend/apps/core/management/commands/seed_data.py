"""Comando para poblar datos de prueba del proyecto BargAIn."""

from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

DEFAULT_SEED_PASSWORD = "seedpass123"
SEED_PREFIX = "seed_"


@dataclass
class SeedStats:
    """Contadores del proceso de seed para reportar resultados."""

    created: int = 0
    updated: int = 0


class Command(BaseCommand):
    """Puebla usuarios de prueba idempotentes para desarrollo local."""

    help = "Crea usuarios seed (consumer, business y admin) para pruebas locales"

    def add_arguments(self, parser) -> None:
        """Define argumentos CLI opcionales para controlar el seed."""
        parser.add_argument(
            "--consumers",
            type=int,
            default=10,
            help="Cantidad de usuarios consumer a crear (por defecto: 10)",
        )
        parser.add_argument(
            "--businesses",
            type=int,
            default=3,
            help="Cantidad de usuarios business a crear (por defecto: 3)",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina los usuarios seed existentes antes de recrearlos",
        )

    def handle(self, *args, **options) -> None:
        """Ejecuta el seed de usuarios de prueba."""
        consumers = options["consumers"]
        businesses = options["businesses"]
        reset = options["reset"]

        if consumers < 0 or businesses < 0:
            raise CommandError("Los argumentos --consumers y --businesses no pueden ser negativos")

        user_model = get_user_model()

        if reset:
            deleted_count, _ = user_model.objects.filter(username__startswith=SEED_PREFIX).delete()
            self.stdout.write(self.style.WARNING(f"Usuarios seed eliminados: {deleted_count}"))

        stats = SeedStats()

        self._upsert_admin_user(user_model, stats)
        self._upsert_role_users(user_model, role="consumer", total=consumers, stats=stats)
        self._upsert_role_users(user_model, role="business", total=businesses, stats=stats)

        self.stdout.write(self.style.SUCCESS("Seed de usuarios completado correctamente."))
        self.stdout.write(f"Usuarios creados: {stats.created}")
        self.stdout.write(f"Usuarios actualizados: {stats.updated}")
        self.stdout.write(f"Password común seed: {DEFAULT_SEED_PASSWORD}")

    def _upsert_admin_user(self, user_model, stats: SeedStats) -> None:
        """Crea o actualiza el usuario administrador seed."""
        defaults = {
            "email": "seed_admin@bargain.local",
            "first_name": "Admin",
            "last_name": "Seed",
            "role": user_model.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True,
        }
        user, created = user_model.objects.get_or_create(
            username="seed_admin",
            defaults=defaults,
        )
        if created:
            user.set_password(DEFAULT_SEED_PASSWORD)
            user.save(update_fields=["password"])
            stats.created += 1
            return

        self._update_user_fields(user=user, defaults=defaults, stats=stats)

    def _upsert_role_users(self, user_model, role: str, total: int, stats: SeedStats) -> None:
        """Crea o actualiza usuarios seed del rol indicado."""
        for index in range(1, total + 1):
            username = f"seed_{role}_{index}"
            defaults = {
                "email": f"{username}@bargain.local",
                "first_name": role.capitalize(),
                "last_name": f"{index}",
                "role": role,
                "is_staff": False,
                "is_superuser": False,
            }
            user, created = user_model.objects.get_or_create(username=username, defaults=defaults)
            if created:
                user.set_password(DEFAULT_SEED_PASSWORD)
                user.save(update_fields=["password"])
                stats.created += 1
                continue

            self._update_user_fields(user=user, defaults=defaults, stats=stats)

    @staticmethod
    def _update_user_fields(*, user, defaults: dict[str, object], stats: SeedStats) -> None:
        """Sincroniza atributos del usuario existente y refresca su contraseña seed."""
        changed_fields: list[str] = []
        for field_name, expected_value in defaults.items():
            if getattr(user, field_name) != expected_value:
                setattr(user, field_name, expected_value)
                changed_fields.append(field_name)

        user.set_password(DEFAULT_SEED_PASSWORD)
        changed_fields.append("password")
        user.save(update_fields=changed_fields)
        stats.updated += 1
