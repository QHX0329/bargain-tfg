"""
Serializers para el dominio shopping_lists.

Incluye enriquecimiento de ítems con nombre de producto, categoría y precio más reciente.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    ListCollaborator,
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)

User = get_user_model()


def _get_latest_price(product) -> tuple[Decimal | None, bool | None] | None:
    """
    Obtiene el precio más reciente y si está obsoleto para un producto.

    Importación lazy para no depender de apps.prices (plan 01-04, puede no estar disponible).
    Devuelve (price, is_stale) o (None, None) si no hay precios.
    """
    try:
        from apps.prices.models import Price  # noqa: PLC0415

        latest = Price.objects.filter(product=product).order_by("-verified_at").first()
        if latest is None:
            return None, None
        return latest.price, latest.is_stale
    except (ImportError, LookupError, Exception):  # noqa: BLE001
        return None, None


class ShoppingListItemEnrichedSerializer(serializers.ModelSerializer):
    """Serializer de ítem enriquecido con datos de producto y precio."""

    product_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    latest_price = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingListItem
        fields = [
            "id",
            "product",
            "product_name",
            "category_name",
            "quantity",
            "is_checked",
            "latest_price",
            "is_stale",
        ]
        read_only_fields = ["id"]

    def get_product_name(self, obj) -> str | None:
        if obj.product_id and hasattr(obj, "product"):
            return obj.product.name
        return None

    def get_category_name(self, obj) -> str | None:
        if obj.product_id and hasattr(obj, "product") and obj.product.category_id:
            return obj.product.category.name
        return None

    def get_latest_price(self, obj) -> Decimal | None:
        if not obj.product_id:
            return None
        price, _ = _get_latest_price(obj.product)
        return price

    def get_is_stale(self, obj) -> bool | None:
        if not obj.product_id:
            return None
        _, is_stale = _get_latest_price(obj.product)
        return is_stale


class ShoppingListSerializer(serializers.ModelSerializer):
    """Serializer completo de lista de la compra con ítems enriquecidos."""

    owner = serializers.StringRelatedField(read_only=True)
    items = ShoppingListItemEnrichedSerializer(many=True, read_only=True)

    class Meta:
        model = ShoppingList
        fields = ["id", "name", "owner", "is_archived", "created_at", "updated_at", "items"]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class ShoppingListCreateSerializer(serializers.ModelSerializer):
    """Serializer para creación/actualización de lista."""

    class Meta:
        model = ShoppingList
        fields = ["id", "name", "is_archived", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ShoppingListItemSerializer(serializers.ModelSerializer):
    """Serializer para creación/actualización de ítems de lista."""

    class Meta:
        model = ShoppingListItem
        fields = ["id", "product", "quantity", "is_checked", "added_by"]
        read_only_fields = ["id", "added_by"]

    def validate_quantity(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("La cantidad debe ser al menos 1.")
        return value


class CollaboratorUserSerializer(serializers.ModelSerializer):
    """Serializer ligero de usuario para mostrar en colaboradores."""

    class Meta:
        model = User
        fields = ["id", "username"]


class ListCollaboratorSerializer(serializers.ModelSerializer):
    """Serializer de colaborador con datos de usuario."""

    user = CollaboratorUserSerializer(read_only=True)
    invited_by = CollaboratorUserSerializer(read_only=True)

    class Meta:
        model = ListCollaborator
        fields = ["id", "user", "invited_by", "created_at"]
        read_only_fields = ["id", "user", "invited_by", "created_at"]


class AddCollaboratorSerializer(serializers.Serializer):
    """Serializer para invitar colaborador por nombre de usuario."""

    username = serializers.CharField()

    def validate_username(self, value: str) -> str:
        try:
            User.objects.get(username=value)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError(
                f"No existe ningún usuario con el nombre '{value}'."
            ) from exc
        return value


class ListTemplateItemSerializer(serializers.ModelSerializer):
    """Serializer de ítem de plantilla con nombre de producto."""

    product_name = serializers.SerializerMethodField()

    class Meta:
        model = ListTemplateItem
        fields = ["id", "product", "product_name", "ordering"]
        read_only_fields = ["id"]

    def get_product_name(self, obj) -> str | None:
        if obj.product_id and hasattr(obj, "product"):
            return obj.product.name
        return None


class ListTemplateSerializer(serializers.ModelSerializer):
    """Serializer de plantilla con sus ítems enriquecidos."""

    items = ListTemplateItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = ListTemplate
        fields = ["id", "name", "source_list", "created_at", "items", "item_count"]
        read_only_fields = ["id", "source_list", "created_at"]

    def get_item_count(self, obj) -> int:
        return obj.items.count()
