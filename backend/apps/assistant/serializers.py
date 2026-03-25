"""Serializers del módulo de asistente LLM."""

from rest_framework import serializers


class MessageSerializer(serializers.Serializer):
    """Serializer para un único mensaje del historial de conversación."""

    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class ChatRequestSerializer(serializers.Serializer):
    """Serializer para la solicitud de chat al asistente.

    Valida que el historial contenga al menos un mensaje y que el último
    mensaje sea del usuario.
    """

    messages = MessageSerializer(many=True, min_length=1)

    def validate_messages(self, value: list[dict]) -> list[dict]:
        """Valida que el último mensaje sea del rol 'user'."""
        if not value:
            raise serializers.ValidationError(
                "El historial de mensajes no puede estar vacío."
            )
        if value[-1]["role"] != "user":
            raise serializers.ValidationError(
                "El último mensaje debe ser del usuario."
            )
        return value


class ChatResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta del asistente."""

    role = serializers.CharField(default="assistant")
    content = serializers.CharField()
