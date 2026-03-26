"""
Servicios OCR para el modulo de reconocimiento de imagenes de BargAIn.

Proporciona:
- extract_text_from_image: extrae lineas de texto de una imagen con Google Vision API
- match_products: empareja lineas de texto contra el catalogo de productos con fuzzy matching
"""

import base64
import io
import re

import requests
import structlog
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from PIL import Image, ImageFilter, ImageOps
from thefuzz import fuzz

from apps.core.exceptions import OCRProcessingError

logger = structlog.get_logger(__name__)


_GOOGLE_VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"
_OCR_TIMEOUT_SECONDS = 15
_MIN_HEIGHT_PX = 1000  # upscale si la imagen es mas pequena
_MIN_ALPHA_CHARS = 3  # minimo de caracteres alfabeticos por linea
_MIN_ALPHA_RATIO = 0.35  # minimo ratio letras/total caracteres por linea
_SPANISH_ALPHA = set("abcdefghijklmnopqrstuvwxyzáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÜÑ")
_LANGUAGE_HINT_MAP = {
    "spa": "es",
    "es": "es",
    "eng": "en",
    "en": "en",
    "cat": "ca",
    "ca": "ca",
    "glg": "gl",
    "gl": "gl",
    "eus": "eu",
    "eu": "eu",
    "por": "pt",
    "pt": "pt",
    "fra": "fr",
    "fr": "fr",
    "deu": "de",
    "de": "de",
    "ita": "it",
    "it": "it",
}


def _get_google_vision_api_key() -> str:
    """Resuelve la key de Vision priorizando la variable dedicada."""
    for candidate in (
        getattr(settings, "GOOGLE_CLOUD_VISION_API_KEY", ""),
        getattr(settings, "GOOGLE_PLACES_API_KEY", ""),
        getattr(settings, "GOOGLE_MAPS_API_KEY", ""),
    ):
        if candidate and candidate.strip():
            return candidate.strip()

    raise ImproperlyConfigured(
        "No hay ninguna API key de Google configurada para el OCR"
    )


def _build_language_hints(lang: str) -> list[str]:
    """Convierte codigos estilo Tesseract a hints BCP-47 para Vision."""
    hints: list[str] = []
    for token in re.split(r"[+,\s]+", lang.strip()):
        if not token:
            continue
        hint = _LANGUAGE_HINT_MAP.get(token.lower())
        if hint and hint not in hints:
            hints.append(hint)
    return hints


def _preprocess_image_for_ocr(image_bytes: bytes) -> bytes:
    """Normaliza contraste y tamano antes de enviar la imagen a Vision."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("L")
    except (OSError, ValueError) as exc:
        raise OCRProcessingError("La imagen no es valida o esta danada") from exc

    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)

    # Vision mejora en tickets y listas cuando la foto pequena gana resolucion.
    if image.height < _MIN_HEIGHT_PX:
        scale = _MIN_HEIGHT_PX / image.height
        new_size = (max(1, int(image.width * scale)), _MIN_HEIGHT_PX)
        image = image.resize(new_size, Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _extract_google_error_message(response: requests.Response | None) -> str | None:
    """Recupera el mensaje de error de Google cuando la peticion falla."""
    if response is None:
        return None

    try:
        data = response.json()
    except ValueError:
        return response.text or None

    error = data.get("error", {})
    if isinstance(error, dict):
        return error.get("message")
    return None


def _request_google_vision(processed_image_bytes: bytes, lang: str) -> dict:
    """Llama al endpoint REST de Vision usando la API key configurada."""
    api_key = _get_google_vision_api_key()

    request_payload: dict = {
        "requests": [
            {
                "image": {
                    "content": base64.b64encode(processed_image_bytes).decode("ascii"),
                },
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }
        ]
    }

    language_hints = _build_language_hints(lang)
    if language_hints:
        request_payload["requests"][0]["imageContext"] = {
            "languageHints": language_hints,
        }

    try:
        response = requests.post(
            _GOOGLE_VISION_API_URL,
            params={"key": api_key},
            json=request_payload,
            timeout=_OCR_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.Timeout as exc:
        logger.warning("ocr.google_vision_timeout", timeout=_OCR_TIMEOUT_SECONDS)
        raise OCRProcessingError("Google Vision tardo demasiado procesando la imagen") from exc
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        error_message = _extract_google_error_message(exc.response)
        logger.warning(
            "ocr.google_vision_http_error",
            status_code=status_code,
            error=error_message or str(exc),
        )
        if status_code in {401, 403}:
            raise ImproperlyConfigured(
                "La API key de Google Vision es invalida o no tiene permisos"
            ) from exc
        raise OCRProcessingError("Google Vision no pudo procesar la imagen") from exc
    except requests.RequestException as exc:
        logger.warning("ocr.google_vision_request_error", error=str(exc))
        raise OCRProcessingError("Google Vision no esta disponible en este momento") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        logger.warning("ocr.google_vision_invalid_json")
        raise OCRProcessingError("Google Vision devolvio una respuesta no valida") from exc

    responses = payload.get("responses", [])
    if not responses:
        logger.warning("ocr.google_vision_empty_response")
        raise OCRProcessingError("Google Vision no devolvio resultados OCR")

    first_response = responses[0]
    error = first_response.get("error")
    if error:
        error_code = error.get("code")
        error_status = error.get("status")
        error_message = error.get("message", "Google Vision no pudo procesar la imagen")
        logger.warning(
            "ocr.google_vision_provider_error",
            code=error_code,
            status=error_status,
            error=error_message,
        )
        if error_code in {401, 403} or error_status in {"PERMISSION_DENIED", "UNAUTHENTICATED"}:
            raise ImproperlyConfigured(
                "La API key de Google Vision es invalida o no tiene permisos"
            )
        raise OCRProcessingError(f"Google Vision no pudo procesar la imagen: {error_message}")

    return first_response


def _extract_candidate_lines(raw_text: str) -> list[str]:
    """Limpia y filtra lineas ruidosas conservando el orden original."""
    lines: list[str] = []
    for raw_line in raw_text.splitlines():
        normalized = " ".join(raw_line.split()).strip()
        if not normalized:
            continue

        alpha_chars = sum(1 for char in normalized if char in _SPANISH_ALPHA)
        if alpha_chars < _MIN_ALPHA_CHARS:
            continue
        if alpha_chars / len(normalized) < _MIN_ALPHA_RATIO:
            continue

        lines.append(normalized)

    return lines


def extract_text_from_image(image_bytes: bytes, lang: str = "spa+eng") -> list[str]:
    """Extrae lineas de texto con Google Vision y filtra ruido evidente.

    Args:
        image_bytes: Contenido binario de la imagen.
        lang: Idioma(s) sugeridos. Se aceptan codigos tipo Tesseract como
            ``spa+eng`` y se convierten a hints BCP-47 cuando aplica.

    Returns:
        Lista de lineas de texto no vacias con contenido util.

    Raises:
        OCRProcessingError: Si Vision no puede extraer texto usable.
        ImproperlyConfigured: Si falta la API key o no tiene permisos.
    """
    _get_google_vision_api_key()

    processed_image_bytes = _preprocess_image_for_ocr(image_bytes)
    response = _request_google_vision(processed_image_bytes, lang)

    raw_text = (
        response.get("fullTextAnnotation", {}).get("text")
        or (response.get("textAnnotations") or [{}])[0].get("description", "")
    )
    lines = _extract_candidate_lines(raw_text)

    if not lines:
        logger.warning("ocr.no_text_extracted", image_size=len(image_bytes))
        raise OCRProcessingError("No se pudo extraer texto util de la imagen")

    logger.info("ocr.text_extracted", lines_count=len(lines))
    return lines


def match_products(raw_lines: list[str], threshold: int = 80) -> list[dict]:
    """Empareja lineas de texto con productos del catalogo usando fuzzy matching.

    Compara cada linea contra todos los productos activos con
    thefuzz.fuzz.token_sort_ratio. Las lineas con puntuacion >= threshold
    incluyen matched_product_id y matched_product_name en el resultado.

    Args:
        raw_lines: Lineas de texto reconocidas por OCR.
        threshold: Umbral minimo de similitud (0-100). Por defecto 80.

    Returns:
        Lista de dicts con raw_text, confidence, quantity y opcionalmente
        matched_product_id y matched_product_name.
    """
    from apps.products.models import Product

    products = list(Product.objects.filter(is_active=True).values("id", "name"))

    results = []
    for line in raw_lines:
        best_score = 0
        best_product = None

        for product in products:
            score = fuzz.token_sort_ratio(line.upper(), product["name"].upper())
            if score > best_score:
                best_score = score
                best_product = product

        item: dict = {
            "raw_text": line,
            "confidence": best_score / 100.0,
            "quantity": 1,
        }

        if best_score >= threshold and best_product is not None:
            item["matched_product_id"] = best_product["id"]
            item["matched_product_name"] = best_product["name"]

        results.append(item)

    logger.info(
        "ocr.products_matched",
        total_lines=len(raw_lines),
        matched=sum(1 for r in results if "matched_product_id" in r),
    )
    return results
