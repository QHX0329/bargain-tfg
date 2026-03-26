"""
Serializers para el dominio shopping_lists.

Incluye serialización de ítems de texto libre y plantillas.
"""

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


class ShoppingListItemEnrichedSerializer(serializers.ModelSerializer):
    """Serializer de ítem de lista con alias de compatibilidad."""

    product_name = serializers.CharField(source="name", read_only=True)

    class Meta:
        model = ShoppingListItem
        fields = [
            "id",
            "name",
            "normalized_name",
            "product_name",
            "quantity",
            "is_checked",
        ]
        read_only_fields = ["id"]


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
        fields = ["id", "name", "normalized_name", "quantity", "is_checked", "added_by"]
        read_only_fields = ["id", "normalized_name", "added_by"]

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("El nombre del item no puede estar vacío.")
        return cleaned

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
    """Serializer de ítem de plantilla textual."""

    class Meta:
        model = ListTemplateItem
        fields = ["id", "name", "normalized_name", "ordering"]
        read_only_fields = ["id"]


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
