"""
Tests unitarios para el servicio del asistente LLM de BargAIn.

Verifica truncado de historial, modelo, system prompt y manejo de errores
sin llamar a la API real (google.genai siempre mockeado).
"""

from unittest.mock import MagicMock, patch

import pytest
from google.genai import errors as genai_errors

from apps.core.exceptions import AssistantError


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_messages(n: int) -> list[dict]:
    """Genera una lista de n mensajes alternando user/assistant."""
    msgs = []
    for i in range(n):
        role = "user" if i % 2 == 0 else "assistant"
        msgs.append({"role": role, "content": f"Message {i}"})
    return msgs


def _setup_mock_client(mock_client_class, reply: str = "Respuesta") -> tuple:
    """Configura los mocks de genai.Client y models.generate_content."""
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_response = MagicMock()
    mock_response.text = reply
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestChatWithAssistantTruncation:
    """Verifica que el historial se trunca a los últimos 20 mensajes."""

    @patch("apps.assistant.services.genai.Client")
    def test_chat_truncates_to_20_messages(self, mock_client_class):
        """Con 30 mensajes en el historial, sólo se envían los últimos 20."""
        from apps.assistant.services import chat_with_assistant

        mock_client = _setup_mock_client(mock_client_class)

        chat_with_assistant(_make_messages(30))

        contents_sent = mock_client.models.generate_content.call_args[1]["contents"]
        assert len(contents_sent) == 20

    @patch("apps.assistant.services.genai.Client")
    def test_chat_sends_all_when_under_limit(self, mock_client_class):
        """Con 5 mensajes en el historial, se envían todos sin truncar."""
        from apps.assistant.services import chat_with_assistant

        mock_client = _setup_mock_client(mock_client_class)

        chat_with_assistant(_make_messages(5))

        contents_sent = mock_client.models.generate_content.call_args[1]["contents"]
        assert len(contents_sent) == 5


class TestChatWithAssistantModel:
    """Verifica que se usa el modelo correcto."""

    @patch("apps.assistant.services.genai.Client")
    def test_chat_uses_correct_model(self, mock_client_class):
        """Siempre se llama al modelo configurado en GEMINI_MODEL."""
        from apps.assistant.services import GEMINI_MODEL, chat_with_assistant

        mock_client = _setup_mock_client(mock_client_class)

        chat_with_assistant([{"role": "user", "content": "hola"}])

        assert mock_client.models.generate_content.call_args[1]["model"] == GEMINI_MODEL


class TestChatWithAssistantSystemPrompt:
    """Verifica que se incluye el system prompt de guardarraíles."""

    @patch("apps.assistant.services.genai.Client")
    def test_chat_includes_system_prompt(self, mock_client_class):
        """El GenerateContentConfig debe incluir el SYSTEM_PROMPT como system_instruction."""
        from apps.assistant.services import SYSTEM_PROMPT, chat_with_assistant

        mock_client = _setup_mock_client(mock_client_class)

        chat_with_assistant([{"role": "user", "content": "hola"}])

        config_arg = mock_client.models.generate_content.call_args[1]["config"]
        assert config_arg.system_instruction == SYSTEM_PROMPT

    def test_system_prompt_mentions_compras(self):
        """El SYSTEM_PROMPT contiene la guardrail de dominio de compras."""
        from apps.assistant.services import SYSTEM_PROMPT

        assert "compra" in SYSTEM_PROMPT.lower()


class TestChatWithAssistantErrors:
    """Verifica el manejo de errores de la API de Gemini."""

    @patch("apps.assistant.services.genai.Client")
    def test_chat_raises_assistant_unavailable_on_api_error(self, mock_client_class):
        """Si la API lanza APIError, se relanza AssistantError (503)."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.models.generate_content.side_effect = genai_errors.APIError(
            "error", response_json={"error": {}}
        )

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])

    @patch("apps.assistant.services.genai.Client")
    def test_chat_raises_assistant_unavailable_on_server_error(self, mock_client_class):
        """Si la API lanza ServerError, se relanza AssistantError."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.models.generate_content.side_effect = genai_errors.ServerError(
            503, response_json={"error": {}}
        )

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])

    @patch("apps.assistant.services.genai.Client")
    def test_chat_raises_assistant_unavailable_on_rate_limit(self, mock_client_class):
        """Si la API lanza ClientError 429, se relanza AssistantError."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        exc = genai_errors.ClientError(429, response_json={"error": {}})
        mock_client.models.generate_content.side_effect = exc

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])
