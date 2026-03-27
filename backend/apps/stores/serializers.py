"""Serializadores para el módulo de tiendas."""

from rest_framework import serializers

from apps.prices.models import Price
from apps.products.models import Product

from .models import Store, StoreChain, UserFavoriteStore


class StoreChainSerializer(serializers.ModelSerializer):
    """Serializa los datos básicos de una cadena comercial."""

    class Meta:
        model = StoreChain
        fields = ["id", "name"]


class StoreListSerializer(serializers.ModelSerializer):
    """Serializa tiendas para listados con distancia anotada."""

    chain = StoreChainSerializer(read_only=True)
    distance_km = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "chain",
            "address",
            "distance_km",
            "location",
            "is_local_business",
            "is_active",
            "google_place_id",
        ]

    def get_distance_km(self, obj: Store) -> float | None:
        """Convierte la distancia anotada de metros a kilómetros."""
        distance = getattr(obj, "distance", None)
        if distance is None:
            return None
        # django.contrib.gis Distance object — .m gives metres
        return round(distance.m / 1000, 2)

    def get_location(self, obj: Store) -> dict[str, object] | None:
        """Serializa PointField a GeoJSON simple para frontend de mapas."""
        if obj.location is None:
            return None
        return {
            "type": "Point",
            "coordinates": [obj.location.x, obj.location.y],
        }


class StoreDetailSerializer(StoreListSerializer):
    """Serializa una tienda con detalle: horario y favorito del usuario."""

    is_favorite = serializers.SerializerMethodField()

    class Meta(StoreListSerializer.Meta):
        fields = StoreListSerializer.Meta.fields + ["opening_hours", "is_favorite"]

    def get_is_favorite(self, obj: Store) -> bool:
        """Comprueba si el usuario actual ha marcado esta tienda como favorita."""
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return UserFavoriteStore.objects.filter(user=request.user, store=obj).exists()


class StoreProductSerializer(serializers.ModelSerializer):
    """Serializa producto para listados de perfil de tienda."""

    category = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "normalized_name",
            "category",
            "brand",
            "unit",
            "unit_quantity",
            "image_url",
        ]

    def get_category(self, obj: Product) -> dict[str, object] | None:
        """Devuelve la categoría embebida con formato estable para frontend."""
        if obj.category_id is None or obj.category is None:
            return None
        return {
            "id": obj.category_id,
            "name": obj.category.name,
        }


class StoreProductOfferSerializer(serializers.ModelSerializer):
    """Serializa la mejor oferta disponible por producto dentro de una tienda."""

    product = StoreProductSerializer(read_only=True)

    class Meta:
        model = Price
        fields = [
            "product",
            "price",
            "offer_price",
            "source",
            "is_stale",
            "verified_at",
        ]
