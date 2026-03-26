"""Vistas para el modulo OCR de BargAIn."""

import structlog
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import OCRProcessingError

from .serializers import OCRScanRequestSerializer, OCRScanResponseSerializer
from .services import extract_text_from_image, match_products

logger = structlog.get_logger(__name__)


class OCRScanView(APIView):
    """POST /api/v1/ocr/scan/

    Acepta una imagen multipart, extrae texto con Google Vision API y
    empareja el resultado con productos del catalogo usando fuzzy matching.
    Devuelve los items reconocidos con su nivel de confianza y producto
    emparejado si supera el umbral.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    throttle_scope = "ocr"

    def post(self, request) -> Response:
        """Procesa una imagen y devuelve productos reconocidos.

        Args:
            request: Peticion HTTP con imagen adjunta como campo multipart.

        Returns:
            200 con items reconocidos, 400 si la imagen no es valida,
            422 si no se puede extraer texto, 500 en error inesperado.
        """
        serializer = OCRScanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_REQUEST",
                        "message": "La imagen es obligatoria y debe ser un archivo de imagen valido.",
                        "details": serializer.errors,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            image_bytes = request.FILES["image"].read()
            raw_lines = extract_text_from_image(image_bytes)
            results = match_products(raw_lines)

            response_serializer = OCRScanResponseSerializer({"items": results})
            return Response(
                {"success": True, "data": response_serializer.data},
                status=status.HTTP_200_OK,
            )

        except ImproperlyConfigured as exc:
            logger.error("ocr.configuration_error", error=str(exc))
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "OCR_CONFIGURATION_ERROR",
                        "message": "El OCR no esta configurado correctamente en el servidor.",
                        "details": {},
                    },
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except OCRProcessingError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": exc.default_code,
                        "message": str(exc.detail),
                        "details": {},
                    },
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        except Exception as exc:
            logger.exception("ocr.unexpected_error", error=str(exc))
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Error interno al procesar la imagen.",
                        "details": {},
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
