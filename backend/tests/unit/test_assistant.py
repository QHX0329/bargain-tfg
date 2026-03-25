"""
Tests unitarios para el servicio del asistente LLM de BargAIn.

Verifica truncado de historial, modelo, system prompt y manejo de errores
sin llamar a la API real (Anthropic SDK siempre mockeado).
"""

from unittest.mock import MagicMock, patch

import anthropic
import pytest

from apps.core.exceptions import AssistantError


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_messages(n: int) -> list[dict]:
    """Genera una lista de n mensajes alternando user/assistant."""
    msgs = []
    for i in range(n):
        role = "user" if i % 2 == 0 else "assistant"
        msgs.append({"role": role, "content": f"Message {i}"})
    return msgs


def _mock_anthropic_response(text: str = "Respuesta del asistente") -> MagicMock:
    """Crea un mock de respuesta Anthropic con el texto dado."""
    mock_resp = MagicMock()
    mock_resp.content = [MagicMock(text=text)]
    return mock_resp


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestChatWithAssistantTruncation:
    """Verifica que el historial se trunca a los últimos 20 mensajes."""

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_truncates_to_20_messages(self, mock_anthropic_class):
        """Con 30 mensajes en el historial, sólo se envían los últimos 20."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = _mock_anthropic_response()

        messages = _make_messages(30)
        chat_with_assistant(messages)

        call_kwargs = mock_client.messages.create.call_args
        sent_messages = call_kwargs.kwargs.get("messages") or call_kwargs.args[0]
        # El kwarg messages se pasa por nombre en el código
        actual_sent = mock_client.messages.create.call_args[1]["messages"]
        assert len(actual_sent) == 20

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_sends_all_when_under_limit(self, mock_anthropic_class):
        """Con 5 mensajes en el historial, se envían todos sin truncar."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = _mock_anthropic_response()

        messages = _make_messages(5)
        chat_with_assistant(messages)

        actual_sent = mock_client.messages.create.call_args[1]["messages"]
        assert len(actual_sent) == 5


class TestChatWithAssistantModel:
    """Verifica que se usa el modelo correcto."""

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_uses_correct_model(self, mock_anthropic_class):
        """Siempre se llama al modelo claude-haiku-4-5-20251001."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = _mock_anthropic_response()

        chat_with_assistant([{"role": "user", "content": "hola"}])

        assert mock_client.messages.create.call_args[1]["model"] == "claude-haiku-4-5-20251001"


class TestChatWithAssistantSystemPrompt:
    """Verifica que se incluye el system prompt de guardarraíles."""

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_includes_system_prompt(self, mock_anthropic_class):
        """El parámetro system debe ser igual a SYSTEM_PROMPT."""
        from apps.assistant.services import SYSTEM_PROMPT, chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = _mock_anthropic_response()

        chat_with_assistant([{"role": "user", "content": "hola"}])

        assert mock_client.messages.create.call_args[1]["system"] == SYSTEM_PROMPT

    def test_system_prompt_mentions_compras(self):
        """El SYSTEM_PROMPT contiene la guardrail de dominio de compras."""
        from apps.assistant.services import SYSTEM_PROMPT

        assert "compra" in SYSTEM_PROMPT.lower()


class TestChatWithAssistantErrors:
    """Verifica el manejo de errores de la API de Anthropic."""

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_raises_assistant_unavailable_on_api_error(self, mock_anthropic_class):
        """Si la API lanza APIError, se relanza AssistantError (503)."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = anthropic.APIError(
            message="error", request=MagicMock(), body=None
        )

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_raises_assistant_unavailable_on_connection_error(self, mock_anthropic_class):
        """Si la API lanza APIConnectionError, se relanza AssistantError."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = anthropic.APIConnectionError(
            request=MagicMock()
        )

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])

    @patch("apps.assistant.services.anthropic.Anthropic")
    def test_chat_raises_assistant_unavailable_on_rate_limit(self, mock_anthropic_class):
        """Si la API lanza RateLimitError, se relanza AssistantError."""
        from apps.assistant.services import chat_with_assistant

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = anthropic.RateLimitError(
            message="rate limit", response=MagicMock(), body=None
        )

        with pytest.raises(AssistantError):
            chat_with_assistant([{"role": "user", "content": "hola"}])
