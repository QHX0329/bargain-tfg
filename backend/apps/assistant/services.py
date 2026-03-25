"""
Servicio de asistente LLM para BargAIn.

Proxy hacia la API de Anthropic con guardarraíles de dominio de compras,
truncado de historial y logging estructurado.
"""

import structlog
from django.conf import settings

import anthropic

from apps.core.exceptions import AssistantError

logger = structlog.get_logger(__name__)

# ── Prompt del sistema ────────────────────────────────

SYSTEM_PROMPT = (
    "Eres BargAIn, un asistente de compra inteligente para Espana. "
    "Tu unica funcion es ayudar a los usuarios con: comparacion de precios de productos, "
    "sugerencias para su lista de la compra y recetas economicas con ingredientes disponibles. "
    "Si el usuario pregunta algo fuera de estos temas, responde amablemente: "
    '"Soy un asistente de compras. Puedo ayudarte con precios, listas o recetas. '
    'Tienes alguna pregunta sobre tu compra?" '
    "Responde siempre en espanol. Se conciso y util."
)

# Máximo de mensajes a enviar a la API (10 turnos = 10 user + 10 assistant)
MAX_MESSAGES = 20


def chat_with_assistant(messages: list[dict]) -> str:
    """
    Envía el historial de mensajes al modelo Claude y devuelve la respuesta.

    Trunca el historial a los últimos MAX_MESSAGES mensajes antes de la llamada
    a la API para evitar exceder el límite de contexto.

    Args:
        messages: Lista de dicts con las claves "role" y "content".

    Returns:
        Texto de la respuesta del asistente.

    Raises:
        AssistantError: Si la API de Anthropic no está disponible o devuelve un error.
    """
    truncated = len(messages) > MAX_MESSAGES
    truncated_messages = messages[-20:]

    log = logger.bind(
        message_count=len(messages),
        truncated_to=len(truncated_messages),
        truncated=truncated,
        model="claude-haiku-4-5-20251001",
    )
    log.info("assistant_request")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=truncated_messages,
        )
        reply = response.content[0].text
        log.info("assistant_response_ok", response_length=len(reply))
        return reply
    except anthropic.RateLimitError as exc:
        log.warning("assistant_rate_limit", error=str(exc))
        raise AssistantError(
            "El asistente ha alcanzado el límite de solicitudes. Intente más tarde."
        ) from exc
    except anthropic.APIConnectionError as exc:
        log.error("assistant_connection_error", error=str(exc))
        raise AssistantError(
            "No se pudo conectar con el servicio del asistente. Intente más tarde."
        ) from exc
    except anthropic.APIError as exc:
        log.error("assistant_api_error", error=str(exc))
        raise AssistantError(
            "Error en el servicio del asistente. Intente más tarde."
        ) from exc
