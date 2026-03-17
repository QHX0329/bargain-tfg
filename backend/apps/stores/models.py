"""Modelos de tiendas y cadenas comerciales para BargAIn."""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models

from apps.users.models import User


class StoreChain(models.Model):
    """Cadena comercial (ej. Mercadona, Carrefour, Lidl)."""

    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    logo_url = models.URLField(blank=True, verbose_name="URL del logo")

    class Meta:
        verbose_name = "Cadena comercial"
        verbose_name_plural = "Cadenas comerciales"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Store(models.Model):
    """Tienda física con geolocalización PostGIS."""

    name = models.CharField(max_length=200, verbose_name="Nombre")
    chain = models.ForeignKey(
        StoreChain,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stores",
        verbose_name="Cadena",
    )
    address = models.CharField(max_length=300, verbose_name="Dirección")
    location = gis_models.PointField(srid=4326, verbose_name="Ubicación")
    opening_hours = models.JSONField(default=dict, blank=True, verbose_name="Horario")
    is_local_business = models.BooleanField(
        default=False,
        verbose_name="Es comercio local",
    )
    business_profile = models.ForeignKey(
        "business.BusinessProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stores",
        verbose_name="Perfil de negocio",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activa")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tienda"
        verbose_name_plural = "Tiendas"
        ordering = ["name"]
        indexes = [
            GistIndex(fields=["location"], name="stores_store_location_gist"),
        ]

    def __str__(self) -> str:
        chain_name = self.chain.name if self.chain else "Local"
        return f"{self.name} ({chain_name})"


class UserFavoriteStore(models.Model):
    """Tiendas favoritas del usuario."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorite_stores",
        verbose_name="Usuario",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name="favorited_by",
        verbose_name="Tienda",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tienda favorita"
        verbose_name_plural = "Tiendas favoritas"
        unique_together = [("user", "store")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user} — {self.store}"
