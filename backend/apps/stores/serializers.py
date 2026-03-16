"""Serializadores para el módulo de tiendas."""

from rest_framework import serializers

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

    class Meta:
        model = Store
        fields = ["id", "name", "chain", "address", "distance_km", "is_local_business", "is_active"]

    def get_distance_km(self, obj: Store) -> float | None:
        """Convierte la distancia anotada de metros a kilómetros."""
        distance = getattr(obj, "distance", None)
        if distance is None:
            return None
        # django.contrib.gis Distance object — .m gives metres
        return round(distance.m / 1000, 2)


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
