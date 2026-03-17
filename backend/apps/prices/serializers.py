"""Serializers para el módulo de precios."""

from rest_framework import serializers

from apps.stores.models import Store

from .models import Price, PriceAlert


class PriceCompareSerializer(serializers.Serializer):
    """Serializer para un resultado del endpoint de comparación de precios."""

    store_id = serializers.IntegerField()
    store_name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    offer_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    source = serializers.CharField()
    is_stale = serializers.BooleanField()
    distance_km = serializers.FloatField(allow_null=True)
    verified_at = serializers.DateTimeField()


class PriceHistoryPointSerializer(serializers.Serializer):
    """Serializer para un punto de la serie histórica de precios (por día)."""

    day = serializers.DateTimeField()
    store_id = serializers.IntegerField()
    store_name = serializers.CharField()
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    avg_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class PriceAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas de precio."""

    store = serializers.PrimaryKeyRelatedField(
        queryset=Store.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PriceAlert
        fields = ["id", "product", "store", "target_price", "is_active", "triggered_at", "created_at"]
        read_only_fields = ["id", "is_active", "triggered_at", "created_at"]


class CrowdsourcePriceSerializer(serializers.ModelSerializer):
    """Serializer para el reporte de precios por crowdsourcing."""

    class Meta:
        model = Price
        fields = ["id", "product", "store", "price", "offer_price", "source", "confidence_weight", "is_stale", "verified_at"]
        read_only_fields = ["id", "source", "confidence_weight", "is_stale", "verified_at"]
