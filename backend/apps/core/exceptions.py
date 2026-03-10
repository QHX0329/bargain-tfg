"""
Excepciones personalizadas para la API de BargAIn.

Todas las respuestas de error siguen el formato estándar:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Descripción legible",
            "details": {}
        }
    }
"""

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


def bargain_exception_handler(exc: Exception, context: dict) -> object:
    """
    Handler global de excepciones para DRF.

    Envuelve todas las respuestas de error en el formato estándar de BargAIn.
    Registrar en settings: EXCEPTION_HANDLER = 'apps.core.exceptions.bargain_exception_handler'
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = response.data
        if isinstance(error_data, dict) and "detail" in error_data:
            message = str(error_data["detail"])
            code = getattr(error_data["detail"], "code", "error")
        elif isinstance(error_data, list):
            message = str(error_data[0]) if error_data else "Error desconocido"
            code = "validation_error"
        else:
            message = str(error_data)
            code = "error"

        response.data = {
            "success": False,
            "error": {
                "code": code.upper(),
                "message": message,
                "details": error_data if isinstance(error_data, dict) else {},
            },
        }

    return response


# ── Excepciones de dominio ────────────────────────────


class BargainAPIException(APIException):
    """Excepción base para todos los errores de BargAIn."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "bargain_error"
    default_detail = "Se produjo un error en la solicitud."


class StoreNotFoundError(BargainAPIException):
    """No se encontraron tiendas en el radio especificado."""

    status_code = status.HTTP_404_NOT_FOUND
    default_code = "STORE_NOT_FOUND"
    default_detail = "No se encontraron tiendas en el radio especificado."


class ProductNotFoundError(BargainAPIException):
    """El producto solicitado no existe en el catálogo."""

    status_code = status.HTTP_404_NOT_FOUND
    default_code = "PRODUCT_NOT_FOUND"
    default_detail = "El producto solicitado no se encontró en el catálogo."


class PriceExpiredError(BargainAPIException):
    """El precio consultado ha caducado y no es fiable."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "PRICE_EXPIRED"
    default_detail = "El precio consultado ha caducado. Por favor, actualice la búsqueda."


class OptimizationError(BargainAPIException):
    """El algoritmo de optimización no pudo generar una ruta válida."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "OPTIMIZATION_FAILED"
    default_detail = "No se pudo calcular una ruta optimizada con los parámetros proporcionados."


class InsufficientStoresError(BargainAPIException):
    """No hay suficientes tiendas en el radio para optimizar."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "INSUFFICIENT_STORES"
    default_detail = "No hay suficientes tiendas en el área para realizar la optimización."


class OCRProcessingError(BargainAPIException):
    """Error al procesar la imagen con OCR."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "OCR_PROCESSING_FAILED"
    default_detail = "No se pudo extraer texto de la imagen proporcionada."


class AssistantError(BargainAPIException):
    """Error en la comunicación con el asistente LLM."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_code = "ASSISTANT_UNAVAILABLE"
    default_detail = "El asistente no está disponible en este momento. Intente más tarde."


class SubscriptionRequiredError(BargainAPIException):
    """La funcionalidad requiere una suscripción activa."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_code = "SUBSCRIPTION_REQUIRED"
    default_detail = "Esta funcionalidad requiere una suscripción activa."


class RateLimitExceededError(BargainAPIException):
    """Se ha superado el límite de solicitudes."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_code = "RATE_LIMIT_EXCEEDED"
    default_detail = "Ha superado el límite de solicitudes. Por favor, espere antes de reintentar."
