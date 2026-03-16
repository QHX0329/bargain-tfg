"""
Filtros personalizados para el dominio products.

Usa django-filters para filtrado avanzado de productos.
"""

import django_filters
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import QuerySet

from apps.products.models import Product


class ProductFilter(django_filters.FilterSet):
    """FilterSet para el modelo Product con soporte pg_trgm."""

    q = django_filters.CharFilter(method="filter_by_trigram", label="Búsqueda fuzzy")
    category = django_filters.NumberFilter(field_name="category__id", label="ID de categoría")
    brand = django_filters.CharFilter(
        field_name="brand", lookup_expr="icontains", label="Marca"
    )
    is_active = django_filters.BooleanFilter(field_name="is_active", label="Activo")

    class Meta:
        model = Product
        fields = ["q", "category", "brand", "is_active"]

    def filter_by_trigram(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        """Aplica búsqueda por trigrama si la query tiene al menos 2 caracteres."""
        if not value or len(value) < 2:
            return queryset.none()
        return (
            queryset.annotate(similarity=TrigramSimilarity("normalized_name", value))
            .filter(similarity__gte=0.3)
            .order_by("-similarity")
        )
