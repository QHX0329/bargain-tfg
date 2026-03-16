"""
Serializers del dominio products.

Jerarquía:
- CategoryChildSerializer: id, name, slug
- CategorySerializer: id, name, slug, children
- ProductListSerializer: campos básicos para listados
- ProductDetailSerializer: extiende lista con price_min/price_max
- ProductProposalSerializer: creación de propuestas
"""

from django.db.models import Max, Min
from rest_framework import serializers

from apps.products.models import Category, Product, ProductProposal


class CategoryChildSerializer(serializers.ModelSerializer):
    """Serializer ligero para subcategorías (sin hijos recursivos)."""

    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer completo para categorías raíz con sus hijos."""

    children = CategoryChildSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "children"]


class CategoryNestedSerializer(serializers.ModelSerializer):
    """Serializer anidado para mostrar la categoría dentro de un producto."""

    class Meta:
        model = Category
        fields = ["id", "name"]


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer para listados de productos (campos básicos)."""

    category = CategoryNestedSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "normalized_name",
            "barcode",
            "category",
            "brand",
            "unit",
            "is_active",
        ]


class ProductDetailSerializer(ProductListSerializer):
    """Serializer de detalle: extiende el listado con precio y unidades."""

    price_min = serializers.SerializerMethodField()
    price_max = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "unit_quantity",
            "image_url",
            "price_min",
            "price_max",
        ]

    def _get_prices(self, obj: Product):
        """Obtiene los precios del producto si la app prices tiene el modelo Price."""
        try:
            from django.apps import apps

            Price = apps.get_model("prices", "Price")
            return Price.objects.filter(product=obj, is_stale=False)
        except LookupError:
            return None

    def get_price_min(self, obj: Product):
        """Precio mínimo entre todas las tiendas. None si no hay precios."""
        prices = self._get_prices(obj)
        if prices is None:
            return None
        agg = prices.aggregate(min_price=Min("price"))
        return agg.get("min_price")

    def get_price_max(self, obj: Product):
        """Precio máximo entre todas las tiendas. None si no hay precios."""
        prices = self._get_prices(obj)
        if prices is None:
            return None
        agg = prices.aggregate(max_price=Max("price"))
        return agg.get("max_price")


class ProductProposalSerializer(serializers.ModelSerializer):
    """Serializer para crear propuestas de productos."""

    status = serializers.CharField(read_only=True, default="pending")

    class Meta:
        model = ProductProposal
        fields = ["id", "name", "brand", "barcode", "category", "image_url", "notes", "status"]
