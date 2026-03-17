"""
Modelos del portal business de BargAIn.

Incluye:
- BusinessProfile: perfil verificable de un negocio PYME
- Promotion: promoción temporal con descuento fijo o porcentual
"""

from django.conf import settings
from django.db import models
from django.db.models import Q


class BusinessProfile(models.Model):
    """Perfil de negocio PYME con verificación por admin."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_profile",
        verbose_name="Usuario",
    )
    business_name = models.CharField(
        max_length=200,
        verbose_name="Nombre del negocio",
    )
    tax_id = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="CIF/NIF",
    )
    address = models.TextField(verbose_name="Dirección")
    website = models.URLField(blank=True, verbose_name="Sitio web")
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Verificado",
    )
    rejection_reason = models.TextField(
        blank=True,
        verbose_name="Motivo de rechazo",
    )
    price_alert_threshold_pct = models.PositiveSmallIntegerField(
        default=10,
        verbose_name="Umbral de alerta de precio (%)",
        help_text="Porcentaje de diferencia mínimo para enviar alerta de competidor.",
    )
    # Evitar alertas repetidas en 24h: se actualiza tras enviar alerta de competidor
    last_competitor_alert_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Último aviso competidor",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado en")

    class Meta:
        verbose_name = "Perfil de Negocio"
        verbose_name_plural = "Perfiles de Negocio"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        status = "verificado" if self.is_verified else "pendiente"
        return f"{self.business_name} ({self.tax_id}) [{status}]"


class Promotion(models.Model):
    """Promoción temporal de un producto en una tienda."""

    class DiscountType(models.TextChoices):
        FLAT = "flat", "Descuento fijo (€)"
        PERCENTAGE = "percentage", "Descuento porcentual (%)"

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="promotions",
        verbose_name="Producto",
    )
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.CASCADE,
        related_name="promotions",
        verbose_name="Tienda",
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        verbose_name="Tipo de descuento",
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor del descuento",
    )
    start_date = models.DateField(verbose_name="Inicio de la promoción")
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fin de la promoción",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activa")
    min_quantity = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Cantidad mínima",
    )
    title = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Título",
    )
    description = models.TextField(blank=True, verbose_name="Descripción")
    views = models.PositiveIntegerField(default=0, verbose_name="Visualizaciones")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")

    class Meta:
        verbose_name = "Promoción"
        verbose_name_plural = "Promociones"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "store"],
                condition=Q(is_active=True),
                name="unique_active_promo_per_product_store",
            )
        ]

    def __str__(self) -> str:
        return (
            f"{self.discount_type} {self.discount_value} on "
            f"{self.product.name} at {self.store.name}"
        )
