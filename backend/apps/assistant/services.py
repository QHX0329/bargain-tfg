"""
Servicio de asistente LLM para BargAIn.

Proxy hacia la API de Google Gemini con guardarraíles de dominio de compras,
truncado de historial y logging estructurado.
"""

import structlog
from django.conf import settings

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

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

GEMINI_MODEL = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")


def _to_gemini_contents(messages: list[dict]) -> list[types.Content]:
    """Convierte mensajes del formato BargAIn al formato Gemini.

    Gemini usa el rol "model" en lugar de "assistant".
    """
    return [
        types.Content(
            role="model" if msg["role"] == "assistant" else "user",
            parts=[types.Part(text=msg["content"])],
        )
        for msg in messages
    ]


def chat_with_assistant(messages: list[dict]) -> str:
    """
    Envía el historial de mensajes al modelo Gemini y devuelve la respuesta.

    Trunca el historial a los últimos MAX_MESSAGES mensajes antes de la llamada
    a la API para evitar exceder el límite de contexto.

    Args:
        messages: Lista de dicts con las claves "role" y "content".

    Returns:
        Texto de la respuesta del asistente.

    Raises:
        AssistantError: Si la API de Gemini no está disponible o devuelve un error.
    """
    truncated = len(messages) > MAX_MESSAGES
    truncated_messages = messages[-MAX_MESSAGES:]

    log = logger.bind(
        message_count=len(messages),
        truncated_to=len(truncated_messages),
        truncated=truncated,
        model=GEMINI_MODEL,
    )
    log.info("assistant_request")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    contents = _to_gemini_contents(truncated_messages)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
            ),
        )
        reply = response.text
        log.info("assistant_response_ok", response_length=len(reply))
        return reply
    except genai_errors.ClientError as exc:
        if hasattr(exc, "status_code") and exc.status_code == 429:
            log.warning("assistant_rate_limit", error=str(exc))
            raise AssistantError(
                "El asistente ha alcanzado el límite de solicitudes. Intente más tarde."
            ) from exc
        log.error("assistant_client_error", error=str(exc))
        raise AssistantError(
            "Error en el servicio del asistente. Intente más tarde."
        ) from exc
    except genai_errors.ServerError as exc:
        log.error("assistant_connection_error", error=str(exc))
        raise AssistantError(
            "No se pudo conectar con el servicio del asistente. Intente más tarde."
        ) from exc
    except genai_errors.APIError as exc:
        log.error("assistant_api_error", error=str(exc))
        raise AssistantError(
            "Error en el servicio del asistente. Intente más tarde."
        ) from exc
