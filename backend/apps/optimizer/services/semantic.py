"""Resolucion semantica de items de lista con Gemini para el optimizador.

Incluye timeout corto y circuit-breaker por peticion para que un fallo de
Gemini nunca ralentice ni tumbe la optimizacion (degrada a heuristica).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

import structlog
from django.conf import settings
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from apps.shopping_lists.utils import normalize_list_text

logger = structlog.get_logger(__name__)

MAX_SEMANTIC_CANDIDATES = 8
MAX_SEMANTIC_CHOICES = 4

# El paso semantico (Gemini) es una mejora OPCIONAL del matching: nunca debe
# ralentizar ni tumbar la optimizacion. Por eso:
#   1. Timeout HTTP corto por llamada -> si Gemini esta lento/saturado, falla
#      rapido y se degrada a la heuristica (evita bloquear los workers de
#      Gunicorn durante decenas de segundos, causa del 503 en el free tier).
#   2. "Circuit breaker" por peticion (SemanticBudget): si Gemini falla con un
#      item, se omite para el resto de items de la MISMA optimizacion, de modo
#      que una lista de N items no haga N llamadas lentas que acaban en fallback.
SEMANTIC_HTTP_TIMEOUT_MS = 4000


@dataclass
class SemanticBudget:
    """Estado compartido entre los items de una misma optimizacion.

    Cuando una llamada a Gemini falla (timeout, 503, etc.) se marca como agotado
    para que los items restantes salten directamente a la heuristica en lugar de
    reintentar un servicio que probablemente sigue caido.
    """

    disabled: bool = False

# Descriptores que suelen cambiar por completo la intencion del producto.
TRANSFORMED_QUALIFIERS = (
    "rallado",
    "molido",
    "triturado",
    "en polvo",
    "instantaneo",
    "preparado",
    "mezcla",
    "mix",
    "rebozado",
    "sazonado",
)

SEMANTIC_SYSTEM_PROMPT = (
    "Eres un clasificador semantico de productos de supermercado para Espana. "
    "Tu tarea es interpretar la intencion real de un item de lista de la compra y "
    "elegir los productos mas adecuados entre candidatos del catalogo. "
    "Evita falsos positivos (ejemplo: 'pan' no debe priorizar 'pan rallado' salvo que se pida). "
    "Si el item es generico, marca needs_user_confirmation=true y propone alternativas utiles. "
    "Responde un JSON valido y nada mas."
)


@dataclass(frozen=True)
class SemanticIntent:
    """Resultado semantico para desambiguar un item textual de lista."""

    preferred_product_ids: tuple[int, ...] = ()
    alternative_product_ids: tuple[int, ...] = ()
    needs_user_confirmation: bool = False
    rationale: str = ""
    search_hints: tuple[str, ...] = ()


def _semantic_model() -> str:
    return getattr(
        settings,
        "GEMINI_PRODUCT_MATCH_MODEL",
        getattr(settings, "GEMINI_MODEL", "gemini-3-flash-preview"),
    )


def _dedupe_ordered_ints(values: list[object], allowed_ids: set[int]) -> tuple[int, ...]:
    parsed: list[int] = []
    for value in values:
        try:
            value_int = int(value)
        except (TypeError, ValueError):
            continue
        if value_int in allowed_ids and value_int not in parsed:
            parsed.append(value_int)
    return tuple(parsed[:MAX_SEMANTIC_CHOICES])


def _extract_json_payload(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    if not text:
        return {}

    try:
        payload = json.loads(text)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}
        try:
            payload = json.loads(match.group(0))
            return payload if isinstance(payload, dict) else {}
        except json.JSONDecodeError:
            return {}


def _candidate_payload(candidate_products: list[object]) -> list[dict]:
    payload: list[dict] = []
    for product in candidate_products[:MAX_SEMANTIC_CANDIDATES]:
        category = getattr(product, "category", None)
        payload.append(
            {
                "id": int(getattr(product, "id", 0)),
                "name": str(getattr(product, "name", "")),
                "brand": str(getattr(product, "brand", "") or ""),
                "category": str(getattr(category, "name", "") or ""),
                "unit": str(getattr(product, "unit", "") or ""),
                "unit_quantity": float(getattr(product, "unit_quantity", 0.0) or 0.0),
            }
        )
    return payload


def _has_unrequested_qualifier(query_text: str, product_name: str) -> bool:
    normalized_query = normalize_list_text(query_text)
    normalized_name = normalize_list_text(product_name)
    for token in TRANSFORMED_QUALIFIERS:
        if token in normalized_name and token not in normalized_query:
            return True
    return False


def _heuristic_intent(query_text: str, candidate_products: list[object]) -> SemanticIntent:
    if not candidate_products:
        return SemanticIntent()

    filtered_ids: list[int] = []
    dropped_ids: list[int] = []
    for product in candidate_products[:MAX_SEMANTIC_CANDIDATES]:
        product_id = int(getattr(product, "id", 0))
        if product_id <= 0:
            continue
        if _has_unrequested_qualifier(query_text, str(getattr(product, "name", ""))):
            dropped_ids.append(product_id)
            continue
        filtered_ids.append(product_id)

    if not filtered_ids:
        filtered_ids = [
            int(getattr(product, "id", 0))
            for product in candidate_products[:MAX_SEMANTIC_CANDIDATES]
            if int(getattr(product, "id", 0)) > 0
        ]

    filtered_ids = filtered_ids[:MAX_SEMANTIC_CHOICES]
    alternative_ids = [pid for pid in dropped_ids if pid not in filtered_ids][
        :MAX_SEMANTIC_CHOICES
    ]

    rationale = ""
    hints: tuple[str, ...] = ()
    if dropped_ids:
        rationale = "Se descartaron variantes transformadas no solicitadas en el item."
    if len(filtered_ids) > 1:
        hints = ("Especifica variedad, formato o marca.",)

    return SemanticIntent(
        preferred_product_ids=tuple(filtered_ids),
        alternative_product_ids=tuple(alternative_ids),
        needs_user_confirmation=len(filtered_ids) > 1,
        rationale=rationale,
        search_hints=hints,
    )


def _build_prompt(query_text: str, candidate_products: list[object]) -> str:
    payload = {
        "query": query_text,
        "candidates": _candidate_payload(candidate_products),
        "rules": [
            "No confundas producto base con variantes procesadas o de uso distinto.",
            "Si la consulta es generica, marca needs_user_confirmation=true.",
            "Devuelve entre 1 y 4 IDs en preferred_product_ids.",
            "alternative_product_ids debe incluir opciones plausibles no seleccionadas.",
        ],
        "response_schema": {
            "preferred_product_ids": ["int"],
            "alternative_product_ids": ["int"],
            "needs_user_confirmation": "bool",
            "rationale": "string",
            "search_hints": ["string"],
        },
    }
    return json.dumps(payload, ensure_ascii=True)


def select_semantic_intent(
    query_text: str,
    candidate_products: list[object],
    budget: SemanticBudget | None = None,
) -> SemanticIntent:
    """Selecciona candidatos de producto usando Gemini con fallback heuristico."""
    if not candidate_products:
        return SemanticIntent()

    scoped_candidates = candidate_products[:MAX_SEMANTIC_CANDIDATES]
    heuristic = _heuristic_intent(query_text, scoped_candidates)

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return heuristic

    # Circuit breaker por peticion: si Gemini ya fallo con un item de esta misma
    # optimizacion, no lo reintentamos con los demas; devolvemos la heuristica al
    # instante para no bloquear el worker con llamadas que acabaran en fallback.
    if budget is not None and budget.disabled:
        return heuristic

    allowed_ids = {
        int(getattr(product, "id", 0))
        for product in scoped_candidates
        if int(getattr(product, "id", 0)) > 0
    }
    if not allowed_ids:
        return heuristic

    model_name = _semantic_model()
    try:
        # Cliente con timeout HTTP corto: si Gemini esta saturado/lento, la
        # llamada falla pronto en lugar de bloquear el worker durante decenas de
        # segundos. La construccion del cliente va dentro del try a proposito
        # (cualquier error debe degradar a la heuristica, nunca un 500).
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=SEMANTIC_HTTP_TIMEOUT_MS),
        )
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=_build_prompt(query_text, scoped_candidates))],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=SEMANTIC_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=512,
            ),
        )
        payload = _extract_json_payload(response.text)
    except (genai_errors.ClientError, genai_errors.ServerError, genai_errors.APIError) as exc:
        if budget is not None:
            budget.disabled = True
        logger.warning(
            "optimizer_semantic_fallback",
            reason="gemini_error",
            error=str(exc),
            model=model_name,
        )
        return heuristic
    except Exception as exc:
        # El paso semantico es una mejora opcional: cualquier fallo no contemplado
        # (timeout/conexion de httpx, respuesta sin texto, error al construir el
        # cliente, etc.) debe degradar a la heuristica y NUNCA abortar la
        # optimizacion completa con un 500.
        if budget is not None:
            budget.disabled = True
        logger.warning(
            "optimizer_semantic_fallback",
            reason="unexpected_error",
            error=str(exc),
            model=model_name,
        )
        return heuristic

    preferred_ids = _dedupe_ordered_ints(payload.get("preferred_product_ids", []), allowed_ids)
    alternative_ids = _dedupe_ordered_ints(payload.get("alternative_product_ids", []), allowed_ids)

    # Guardrail: no permitir que el LLM fuerce opciones que la heuristica descarta claramente.
    if heuristic.preferred_product_ids:
        safe_pool = set(heuristic.preferred_product_ids)
        preferred_ids = tuple(pid for pid in preferred_ids if pid in safe_pool)

    if not preferred_ids:
        return heuristic

    merged_alternatives: list[int] = [pid for pid in alternative_ids if pid not in preferred_ids]
    for pid in heuristic.alternative_product_ids:
        if pid not in preferred_ids and pid not in merged_alternatives:
            merged_alternatives.append(pid)

    raw_hints = payload.get("search_hints", [])
    hints = tuple(str(hint).strip() for hint in raw_hints if str(hint).strip())

    return SemanticIntent(
        preferred_product_ids=preferred_ids,
        alternative_product_ids=tuple(merged_alternatives[:MAX_SEMANTIC_CHOICES]),
        needs_user_confirmation=bool(payload.get("needs_user_confirmation", False))
        or len(preferred_ids) > 1,
        rationale=str(payload.get("rationale", "") or heuristic.rationale),
        search_hints=hints or heuristic.search_hints,
    )
