"""Vistas del módulo de asistente LLM."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.exceptions import AssistantError

from .serializers import ChatRequestSerializer
from .services import chat_with_assistant


class AssistantChatView(APIView):
    """POST /api/v1/assistant/chat/

    Recibe el historial de mensajes del usuario y devuelve la respuesta del
    asistente LLM con guardarraíles de dominio de compras.

    Rate-limited a 30 solicitudes por hora por usuario.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "assistant"

    def post(self, request: Request) -> Response:
        """Procesa la solicitud de chat y retorna la respuesta del asistente."""
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        messages = serializer.validated_data["messages"]

        try:
            response_text = chat_with_assistant(messages)
        except AssistantError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": exc.default_code,
                        "message": str(exc.detail),
                        "details": {},
                    },
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "success": True,
                "data": {
                    "role": "assistant",
                    "content": response_text,
                },
            },
            status=status.HTTP_200_OK,
        )
