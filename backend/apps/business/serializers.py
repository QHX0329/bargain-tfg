"""Serializers para el portal business de BarGAIN."""

from rest_framework import serializers

from apps.prices.models import Price
from apps.products.models import Product
from apps.stores.models import Store

from .models import BusinessProfile, Promotion


class BusinessProfileSerializer(serializers.ModelSerializer):
    """Serializer para BusinessProfile.

    Expone ``verification_status`` derivado (pending/verified/rejected) para que el
    frontend pueda bloquear el acceso de perfiles no verificados, y acepta unas
    coordenadas opcionales (``latitude``/``longitude``) con las que crea
    automáticamente la tienda asociada al negocio en el momento del alta.
    """

    is_verified = serializers.BooleanField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True)
    verification_status = serializers.SerializerMethodField()
    # Coordenadas opcionales para crear la tienda asociada (solo escritura).
    latitude = serializers.FloatField(
        write_only=True, required=False, min_value=-90, max_value=90
    )
    longitude = serializers.FloatField(
        write_only=True, required=False, min_value=-180, max_value=180
    )

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
            "verification_status",
            "rejection_reason",
            "price_alert_threshold_pct",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_verified",
            "verification_status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def get_verification_status(self, obj: BusinessProfile) -> str:
        """Estado de verificación derivado para el cliente."""
        if obj.is_verified:
            return "verified"
        if obj.rejection_reason:
            return "rejected"
        return "pending"

    def create(self, validated_data: dict) -> BusinessProfile:
        """Crea el perfil y, de forma atómica, su tienda asociada.

        Si no se aportan coordenadas se usa el centro de Sevilla por defecto, de modo
        que el negocio siempre disponga de una tienda sobre la que cargar precios y
        promociones una vez verificado.
        """
        from django.contrib.gis.geos import Point
        from django.db import transaction

        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        # Centro de Sevilla (lat, lng) por defecto si el negocio no aporta ubicación.
        lat = latitude if latitude is not None else 37.3891
        lng = longitude if longitude is not None else -5.9845

        with transaction.atomic():
            profile = super().create(validated_data)
            Store.objects.create(
                name=profile.business_name,
                address=profile.address[:300],
                location=Point(lng, lat, srid=4326),
                is_local_business=True,
                business_profile=profile,
                is_active=True,
            )
        return profile

    def update(self, instance: BusinessProfile, validated_data: dict) -> BusinessProfile:
        """Reubica la tienda asociada si se reciben nuevas coordenadas."""
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        profile = super().update(instance, validated_data)

        if latitude is not None and longitude is not None:
            from django.contrib.gis.geos import Point

            store = profile.stores.order_by("id").first()
            if store is not None:
                store.location = Point(longitude, latitude, srid=4326)
                store.save(update_fields=["location", "updated_at"])
        return profile


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
