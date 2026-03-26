"""
Tests unitarios para el modulo OCR de BargAIn.

Cubre:
- extract_text_from_image: extraccion de texto con Google Vision API (mockeada)
- match_products: emparejamiento con catalogo mediante fuzzy matching
"""

from unittest.mock import MagicMock, patch

import pytest
import requests
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings


@pytest.mark.django_db
class TestExtractTextFromImage:
    """Tests de la funcion extract_text_from_image."""

    @override_settings(GOOGLE_CLOUD_VISION_API_KEY="test-vision-key")
    def test_extract_text_returns_lines(self):
        """Debe devolver lineas no vacias al extraer texto de la imagen."""
        from apps.ocr.services import extract_text_from_image

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "responses": [
                {
                    "fullTextAnnotation": {
                        "text": "Leche\nPan\nAceite\n",
                    }
                }
            ]
        }

        with patch(
            "apps.ocr.services._preprocess_image_for_ocr",
            return_value=b"processed-image",
        ), patch("apps.ocr.services.requests.post", return_value=mock_response) as mock_post:
            result = extract_text_from_image(b"fake-image")

        assert result == ["Leche", "Pan", "Aceite"]
        mock_post.assert_called_once()
        assert mock_post.call_args.kwargs["params"] == {"key": "test-vision-key"}
        assert mock_post.call_args.kwargs["json"]["requests"][0]["features"] == [
            {"type": "DOCUMENT_TEXT_DETECTION"}
        ]
        assert mock_post.call_args.kwargs["json"]["requests"][0]["imageContext"] == {
            "languageHints": ["es", "en"]
        }

    @override_settings(GOOGLE_CLOUD_VISION_API_KEY="test-vision-key")
    def test_extract_text_raises_on_empty_image(self):
        """Debe lanzar OCRProcessingError si Vision no devuelve texto util."""
        from apps.core.exceptions import OCRProcessingError
        from apps.ocr.services import extract_text_from_image

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "responses": [
                {
                    "fullTextAnnotation": {
                        "text": "|\n=>\n1,25\n",
                    }
                }
            ]
        }

        with patch(
            "apps.ocr.services._preprocess_image_for_ocr",
            return_value=b"processed-image",
        ), patch("apps.ocr.services.requests.post", return_value=mock_response):
            with pytest.raises(OCRProcessingError):
                extract_text_from_image(b"fake-image")

    @override_settings(GOOGLE_CLOUD_VISION_API_KEY="test-vision-key")
    def test_extract_text_raises_on_provider_error(self):
        """Debe propagar OCRProcessingError si Vision devuelve un error funcional."""
        from apps.core.exceptions import OCRProcessingError
        from apps.ocr.services import extract_text_from_image

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "responses": [
                {
                    "error": {
                        "code": 400,
                        "status": "INVALID_ARGUMENT",
                        "message": "Bad image data",
                    }
                }
            ]
        }

        with patch(
            "apps.ocr.services._preprocess_image_for_ocr",
            return_value=b"processed-image",
        ), patch("apps.ocr.services.requests.post", return_value=mock_response):
            with pytest.raises(OCRProcessingError, match="Google Vision no pudo procesar la imagen"):
                extract_text_from_image(b"fake-image")

    @override_settings(
        GOOGLE_CLOUD_VISION_API_KEY="",
        GOOGLE_PLACES_API_KEY="",
        GOOGLE_MAPS_API_KEY="",
    )
    def test_extract_text_raises_on_missing_api_key(self):
        """Debe fallar como error de configuracion si no hay API key."""
        from apps.ocr.services import extract_text_from_image

        with pytest.raises(ImproperlyConfigured, match="No hay ninguna API key de Google"):
            extract_text_from_image(b"fake-image")

    @override_settings(
        GOOGLE_CLOUD_VISION_API_KEY="",
        GOOGLE_PLACES_API_KEY="places-fallback-key",
        GOOGLE_MAPS_API_KEY="",
    )
    def test_extract_text_falls_back_to_google_places_key(self):
        """Debe reutilizar una key Google existente si la dedicada no esta definida."""
        from apps.ocr.services import extract_text_from_image

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "responses": [
                {
                    "fullTextAnnotation": {
                        "text": "Leche\n",
                    }
                }
            ]
        }

        with patch(
            "apps.ocr.services._preprocess_image_for_ocr",
            return_value=b"processed-image",
        ), patch("apps.ocr.services.requests.post", return_value=mock_response) as mock_post:
            result = extract_text_from_image(b"fake-image")

        assert result == ["Leche"]
        assert mock_post.call_args.kwargs["params"] == {"key": "places-fallback-key"}

    @override_settings(GOOGLE_CLOUD_VISION_API_KEY="test-vision-key")
    def test_extract_text_raises_on_permission_error(self):
        """Debe tratar un 403 de Google como problema de configuracion."""
        from apps.ocr.services import extract_text_from_image

        response = MagicMock()
        response.status_code = 403
        response.json.return_value = {"error": {"message": "Permission denied"}}

        http_error = requests.HTTPError("403 Client Error")
        http_error.response = response

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = http_error

        with patch(
            "apps.ocr.services._preprocess_image_for_ocr",
            return_value=b"processed-image",
        ), patch("apps.ocr.services.requests.post", return_value=mock_response):
            with pytest.raises(ImproperlyConfigured, match="invalida o no tiene permisos"):
                extract_text_from_image(b"fake-image")


@pytest.mark.django_db
class TestMatchProducts:
    """Tests de la funcion match_products."""

    def test_match_products_above_threshold(self):
        """Debe devolver matched_product_id cuando la similitud supera el umbral."""
        from apps.ocr.services import match_products
        from apps.products.models import Product

        # Nombres cortos que coincidan bien con la busqueda (token_sort_ratio ~= 1.0)
        Product.objects.create(name="Leche Entera", is_active=True)
        Product.objects.create(name="Pan Integral", is_active=True)

        results = match_products(["LECHE ENTERA"])

        assert len(results) == 1
        first = results[0]
        assert "matched_product_id" in first
        assert first["confidence"] >= 0.8

    def test_match_products_below_threshold(self):
        """No debe devolver matched_product_id cuando la similitud es baja."""
        from apps.ocr.services import match_products
        from apps.products.models import Product

        Product.objects.create(name="Aceite de Oliva Virgen Extra", is_active=True)

        results = match_products(["XYZZY RANDOM"])

        assert len(results) == 1
        first = results[0]
        assert "matched_product_id" not in first
        assert first["confidence"] < 0.8

    def test_match_products_returns_quantity_1(self):
        """Todos los items devueltos deben tener quantity=1."""
        from apps.ocr.services import match_products
        from apps.products.models import Product

        Product.objects.create(name="Yogur Natural Danone", is_active=True)
        Product.objects.create(name="Galletas Maria", is_active=True)

        lines = ["YOGUR", "GALLETAS"]
        results = match_products(lines)

        assert len(results) == 2
        for item in results:
            assert item["quantity"] == 1
