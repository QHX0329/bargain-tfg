"""Modelos de usuario personalizados para BargAIn."""

from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models
from django.db import models


class User(AbstractUser):
    """
    Modelo de usuario extendido con roles y ubicación.

    Roles:
        - consumer: Usuario final que compra
        - business: PYME / comercio local
        - admin: Administrador de la plataforma
    """

    class Role(models.TextChoices):
        CONSUMER = "consumer", "Consumidor"
        BUSINESS = "business", "Comercio"
        ADMIN = "admin", "Administrador"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CONSUMER,
        verbose_name="Rol",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Teléfono",
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        verbose_name="Avatar",
    )
    default_location = gis_models.PointField(
        null=True,
        blank=True,
        srid=4326,
        verbose_name="Ubicación por defecto",
        help_text="Ubicación habitual del usuario para búsquedas.",
    )
    max_search_radius_km = models.FloatField(
        default=10.0,
        verbose_name="Radio máximo de búsqueda (km)",
    )
    max_stops = models.PositiveSmallIntegerField(
        default=3,
        verbose_name="Máximo de paradas por ruta",
    )
    optimization_preference = models.CharField(
        max_length=20,
        choices=[
            ("price", "Priorizar precio"),
            ("distance", "Priorizar distancia"),
            ("time", "Priorizar tiempo"),
            ("balanced", "Equilibrado"),
        ],
        default="balanced",
        verbose_name="Preferencia de optimización",
    )
    push_notifications_enabled = models.BooleanField(
        default=True,
        verbose_name="Notificaciones push activadas",
    )
    email_notifications_enabled = models.BooleanField(
        default=True,
        verbose_name="Notificaciones por email activadas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_consumer(self) -> bool:
        return self.role == self.Role.CONSUMER

    @property
    def is_business(self) -> bool:
        return self.role == self.Role.BUSINESS
