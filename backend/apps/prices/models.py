"""
Modelos del dominio prices.

Incluye:
- Price: precio de un producto en una tienda con tracking de staleness
- PriceAlert: alerta de precio configurada por el usuario
"""

from django.conf import settings
from django.db import models
from django.utils import timezone


class Price(models.Model):
    """Precio de un producto en una tienda con fuente y estado de vigencia."""

    class Source(models.TextChoices):
        SCRAPING = "scraping", "Scraping"
        CROWDSOURCING = "crowdsourcing", "Crowdsourcing"
        API = "api", "API oficial"
        BUSINESS = "business", "Portal PYME"

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="prices",
        verbose_name="Producto",
    )
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.CASCADE,
        related_name="prices",
        verbose_name="Tienda",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio")
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Precio por unidad",
    )
    offer_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Precio de oferta",
    )
    offer_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fin de oferta",
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.SCRAPING,
        verbose_name="Fuente",
    )
    confidence_weight = models.FloatField(
        default=1.0,
        verbose_name="Peso de confianza",
    )
    is_stale = models.BooleanField(default=False, verbose_name="Caducado")
    verified_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Verificado en",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")

    class Meta:
        verbose_name = "Precio"
        verbose_name_plural = "Precios"
        ordering = ["-verified_at"]
        indexes = [
            models.Index(
                fields=["product", "store", "is_stale"],
                name="prices_product_store_stale_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} @ {self.store.name}: {self.price}€ [{self.source}]"


class PriceAlert(models.Model):
    """Alerta de precio: notifica al usuario cuando el precio baja del umbral."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="price_alerts",
        verbose_name="Usuario",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="price_alerts",
        verbose_name="Producto",
    )
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_alerts",
        verbose_name="Tienda (opcional)",
    )
    target_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio objetivo",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activa")
    triggered_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Disparada en",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creada en")

    class Meta:
        verbose_name = "Alerta de precio"
        verbose_name_plural = "Alertas de precio"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        store_str = f" en {self.store.name}" if self.store else ""
        return f"Alerta: {self.product.name}{store_str} <= {self.target_price}€"
