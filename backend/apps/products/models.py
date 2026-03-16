"""
Modelos del dominio products.

Incluye:
- Category: jerarquía 2 niveles con auto-slug
- Product: catálogo normalizado con pg_trgm
- ProductProposal: propuestas de crowdsourcing
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    """Categoría de producto con jerarquía de 2 niveles máximo."""

    name = models.CharField(max_length=100, verbose_name="Nombre")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
        verbose_name="Categoría padre",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["name"]

    def __str__(self) -> str:
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def clean(self) -> None:
        """Valida que no se superen los 2 niveles de jerarquía."""
        if self.parent and self.parent.parent_id is not None:
            raise ValidationError("Máximo 2 niveles de jerarquía permitidos.")


class Product(models.Model):
    """Producto normalizado del catálogo con soporte pg_trgm."""

    class Unit(models.TextChoices):
        KG = "kg", "Kilogramos"
        G = "g", "Gramos"
        L = "l", "Litros"
        ML = "ml", "Mililitros"
        UNITS = "units", "Unidades"

    name = models.CharField(max_length=200, verbose_name="Nombre")
    normalized_name = models.CharField(
        max_length=200, blank=True, verbose_name="Nombre normalizado"
    )
    barcode = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Código de barras",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name="Categoría",
    )
    brand = models.CharField(max_length=100, blank=True, verbose_name="Marca")
    unit = models.CharField(
        max_length=10,
        choices=Unit.choices,
        default=Unit.UNITS,
        verbose_name="Unidad",
    )
    unit_quantity = models.FloatField(default=1.0, verbose_name="Cantidad por unidad")
    image_url = models.URLField(blank=True, verbose_name="URL imagen")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ["normalized_name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.brand})" if self.brand else self.name

    def save(self, *args, **kwargs) -> None:
        if not self.normalized_name:
            self.normalized_name = self.name.lower().strip()
        super().save(*args, **kwargs)


class ProductProposal(models.Model):
    """Propuesta de nuevo producto enviada por un usuario (crowdsourcing)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        APPROVED = "approved", "Aprobado"
        REJECTED = "rejected", "Rechazado"

    proposed_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="proposals",
        verbose_name="Propuesto por",
    )
    name = models.CharField(max_length=200, verbose_name="Nombre")
    brand = models.CharField(max_length=100, blank=True, verbose_name="Marca")
    barcode = models.CharField(max_length=20, blank=True, verbose_name="Código de barras")
    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Categoría",
    )
    image_url = models.URLField(blank=True, verbose_name="URL imagen")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Estado",
    )
    notes = models.TextField(blank=True, verbose_name="Notas")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Propuesta de producto"
        verbose_name_plural = "Propuestas de productos"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Propuesta: {self.name} [{self.status}]"
