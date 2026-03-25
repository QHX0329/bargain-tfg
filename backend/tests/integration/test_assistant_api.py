"""
Tests de integración para el endpoint del asistente LLM de BargAIn.

Cubre: autenticación, validación, respuesta 200, 400, 401, 503.
El servicio de backend (chat_with_assistant) siempre se mockea.
"""

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.exceptions import AssistantError

CHAT_URL = "/api/v1/assistant/chat/"


# ── Tests ─────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAssistantChatAuthentication:
    """Verifica los controles de acceso del endpoint."""

    def test_chat_endpoint_requires_auth(self, api_client: APIClient):
        """Sin token, el endpoint devuelve 401."""
        payload = {"messages": [{"role": "user", "content": "Hola"}]}
        response = api_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.assistant.views.chat_with_assistant", return_value="Hola, puedo ayudarte")
    def test_chat_endpoint_returns_200(self, mock_service, authenticated_client: APIClient):
        """Con token válido y mensaje de usuario, devuelve 200 y datos correctos."""
        payload = {"messages": [{"role": "user", "content": "Hola"}]}
        response = authenticated_client.post(CHAT_URL, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["role"] == "assistant"
        assert data["data"]["content"] == "Hola, puedo ayudarte"


@pytest.mark.django_db
class TestAssistantChatValidation:
    """Verifica la validación del cuerpo de la solicitud."""

    def test_chat_rejects_empty_messages(self, authenticated_client: APIClient):
        """Con lista de mensajes vacía, devuelve 400."""
        payload = {"messages": []}
        response = authenticated_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_chat_rejects_last_message_not_user(self, authenticated_client: APIClient):
        """Si el último mensaje es del asistente (no user), devuelve 400."""
        payload = {"messages": [{"role": "assistant", "content": "Respuesta anterior"}]}
        response = authenticated_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_chat_rejects_missing_messages_field(self, authenticated_client: APIClient):
        """Si falta el campo messages, devuelve 400."""
        response = authenticated_client.post(CHAT_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_chat_rejects_invalid_role(self, authenticated_client: APIClient):
        """Si el role no es 'user' ni 'assistant', devuelve 400."""
        payload = {"messages": [{"role": "system", "content": "Hack"}]}
        response = authenticated_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAssistantChatServiceErrors:
    """Verifica el comportamiento ante errores del servicio LLM."""

    @patch(
        "apps.assistant.views.chat_with_assistant",
        side_effect=AssistantError("El asistente no está disponible"),
    )
    def test_chat_returns_503_on_service_unavailable(
        self, mock_service, authenticated_client: APIClient
    ):
        """Si el servicio lanza AssistantError, el endpoint devuelve 503."""
        payload = {"messages": [{"role": "user", "content": "Hola"}]}
        response = authenticated_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.django_db
class TestAssistantChatConversation:
    """Verifica flujos de conversación multi-turno."""

    @patch("apps.assistant.views.chat_with_assistant", return_value="Leche cuesta 1.29€")
    def test_chat_with_multi_turn_history(self, mock_service, authenticated_client: APIClient):
        """El historial multi-turno se acepta y se pasa al servicio."""
        payload = {
            "messages": [
                {"role": "user", "content": "¿Cuánto cuesta la leche?"},
                {"role": "assistant", "content": "No tengo esa info aún."},
                {"role": "user", "content": "¿Y en Mercadona?"},
            ]
        }
        response = authenticated_client.post(CHAT_URL, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        mock_service.assert_called_once()
        # Verifica que se pasaron los 3 mensajes al servicio
        called_messages = mock_service.call_args[0][0]
        assert len(called_messages) == 3
