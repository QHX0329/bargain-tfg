"""Serializadores del módulo de notificaciones."""

from rest_framework import serializers

from .models import Notification, UserPushToken


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para el inbox de notificaciones del usuario."""

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "body",
            "is_read",
            "data",
            "action_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "notification_type",
            "title",
            "body",
            "data",
            "action_url",
            "created_at",
        ]


class PushTokenSerializer(serializers.Serializer):
    """Serializer para registrar/actualizar un token push Expo."""

    token = serializers.CharField(max_length=200)
    device_id = serializers.CharField(max_length=200, default="")

    def validate_token(self, value: str) -> str:
        """Valida que el token no esté vacío."""
        if not value.strip():
            raise serializers.ValidationError("El token no puede estar vacío.")
        return value
