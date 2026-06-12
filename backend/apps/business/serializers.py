"""Serializers para el portal business de BarGAIN."""

from rest_framework import serializers

from apps.prices.models import Price
from apps.products.models import Product
from apps.stores.models import Store

from .models import BusinessProfile, Promotion


class BusinessProfileSerializer(serializers.ModelSerializer):
    """Serializer para BusinessProfile."""

    is_verified = serializers.BooleanField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True)

    class Meta:
        model = BusinessProfile
        fields = [
            "id",
            "user",
            "business_name",
            "tax_id",
            "address",
            "website",
            "is_verified",
            "rejection_reason",
            "price_alert_threshold_pct",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_verified",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


class BusinessProfileAdminSerializer(BusinessProfileSerializer):
    """Serializer para admins: expone rejection_reason como campo de escritura."""

    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    class Meta(BusinessProfileSerializer.Meta):
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class PromotionSerializer(serializers.ModelSerializer):
    """Serializer para Promotion."""

    class Meta:
        model = Promotion
        fields = [
            "id",
            "product",
            "store",
            "discount_type",
            "discount_value",
            "start_date",
            "end_date",
            "is_active",
            "min_quantity",
            "title",
            "description",
            "views",
            "created_at",
        ]
        read_only_fields = ["id", "views", "created_at"]
        # Suppress DRF's automatic unique-constraint validator so the DB-level
        # IntegrityError propagates to the view where we return 409.
        validators = []

    def validate(self, attrs):
        """Verifica que la tienda pertenece al perfil del negocio del usuario."""
        request = self.context.get("request")
        store = attrs.get("store")
        if request and store:
            from apps.business.models import BusinessProfile

            try:
                profile = BusinessProfile.objects.get(user=request.user, is_verified=True)
                if store.business_profile != profile:
                    raise serializers.ValidationError(
                        "Solo puedes crear promociones para tus propias tiendas."
                    )
            except BusinessProfile.DoesNotExist as exc:
                raise serializers.ValidationError(
                    "Perfil de negocio verificado no encontrado."
                ) from exc
        return attrs


class PromotionMinimalSerializer(serializers.ModelSerializer):
    """Serializer mínimo para incluir en respuestas de comparación de precios."""

    class Meta:
        model = Promotion
        fields = ["id", "discount_type", "discount_value", "title", "end_date"]


class BusinessPriceSerializer(serializers.ModelSerializer):
    """Serializer para precios creados por negocios PYME."""

    updated_at = serializers.ReadOnlyField(source="verified_at")

    class Meta:
        model = Price
        fields = [
            "id",
            "product",
            "store",
            "price",
            "unit_price",
            "offer_price",
            "offer_end_date",
            "source",
            "is_stale",
            "verified_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "source", "is_stale", "verified_at", "created_at", "updated_at"]

    def validate(self, attrs):
        """Verifica que la tienda pertenece al perfil de negocio del usuario."""
        request = self.context.get("request")
        store = attrs.get("store")
        if request and store:
            from apps.business.models import BusinessProfile

            try:
                profile = BusinessProfile.objects.get(user=request.user, is_verified=True)
                if store.business_profile != profile:
                    raise serializers.ValidationError(
                        {"store": "Solo puedes gestionar precios de tus propias tiendas."}
                    )
            except BusinessProfile.DoesNotExist as exc:
                raise serializers.ValidationError(
                    "Perfil de negocio verificado no encontrado."
                ) from exc
        return attrs


class BusinessStoreSerializer(serializers.ModelSerializer):
    """Serializer ligero para tiendas asociadas al negocio autenticado."""

    class Meta:
        model = Store
        fields = ["id", "name", "address", "is_active"]


class BulkPriceItemSerializer(serializers.Serializer):
    """Serializer para cada elemento de una actualización masiva de precios."""

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
    )
    store = serializers.PrimaryKeyRelatedField(
        queryset=Store.objects.all(),
    )
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    offer_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    offer_end_date = serializers.DateField(required=False, allow_null=True)


class BusinessStatsSerializer(serializers.Serializer):
    """Serializer de solo lectura para estadísticas del perfil de negocio."""

    total_active_prices = serializers.IntegerField()
    total_active_promotions = serializers.IntegerField()
    total_stores = serializers.IntegerField()
    total_promotion_views = serializers.IntegerField()
    latest_price_update = serializers.DateTimeField(allow_null=True)
    latest_promotion_created = serializers.DateTimeField(allow_null=True)
