"""
Modelos del dominio optimizer.

Incluye:
- OptimizationResult: resultado de una optimizacion multicriterio de ruta de compra
"""

from django.contrib.gis.db import models as gis_models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class OptimizationResult(models.Model):
    """Resultado de una optimizacion de ruta de compra multicriterio (precio, distancia, tiempo)."""

    shopping_list = models.ForeignKey(
        "shopping_lists.ShoppingList",
        on_delete=models.CASCADE,
        related_name="optimizations",
        verbose_name="Lista de la compra",
    )
    user_location = gis_models.PointField(
        srid=4326,
        help_text="Ubicacion del usuario al optimizar",
        verbose_name="Ubicacion del usuario",
    )
    max_distance_km = models.FloatField(
        default=10.0,
        verbose_name="Radio maximo (km)",
    )
    max_stops = models.IntegerField(
        default=3,
        validators=[MinValueValidator(2), MaxValueValidator(5)],
        verbose_name="Numero maximo de paradas",
    )
    optimization_mode = models.CharField(
        max_length=20,
        choices=[
            ("precio", "Precio"),
            ("distancia", "Distancia"),
            ("balanced", "Equilibrado"),
        ],
        default="balanced",
        verbose_name="Modo de optimizacion",
    )
    w_precio = models.FloatField(default=0.5, verbose_name="Peso precio")
    w_distancia = models.FloatField(default=0.3, verbose_name="Peso distancia")
    w_tiempo = models.FloatField(default=0.2, verbose_name="Peso tiempo")
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio total",
    )
    total_distance_km = models.FloatField(verbose_name="Distancia total (km)")
    estimated_time_minutes = models.FloatField(verbose_name="Tiempo estimado (min)")
    route_data = models.JSONField(
        help_text="Paradas ordenadas con detalle por tienda",
        verbose_name="Datos de ruta",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")

    class Meta:
        verbose_name = "Resultado de optimizacion"
        verbose_name_plural = "Resultados de optimizacion"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Optimizacion #{self.pk} — {self.shopping_list.name} ({self.optimization_mode})"
