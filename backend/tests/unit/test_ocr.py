"""
Tests unitarios para el módulo OCR de BargAIn.

Cubre:
- extract_text_from_image: extracción de texto con pytesseract (mockeado)
- match_products: emparejamiento con catálogo mediante fuzzy matching
"""

from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.django_db
class TestExtractTextFromImage:
    """Tests de la función extract_text_from_image."""

    def test_extract_text_returns_lines(self):
        """Debe devolver líneas no vacías al extraer texto de la imagen."""
        from apps.ocr.services import extract_text_from_image

        fake_image_bytes = b"\x89PNG\r\n\x1a\n"

        with patch(
            "apps.ocr.services.pytesseract.image_to_string",
            return_value="Leche entera\nPan integral\n\nAceite oliva",
        ), patch("apps.ocr.services.Image") as mock_image:
            mock_img = MagicMock()
            mock_img.height = 2000  # mayor que _MIN_HEIGHT_PX, evita upscale
            mock_image.open.return_value.convert.return_value = mock_img
            mock_img.filter.return_value = mock_img

            with patch("apps.ocr.services.ImageOps") as mock_imageops:
                mock_imageops.autocontrast.return_value = mock_img

                result = extract_text_from_image(fake_image_bytes)

        assert result == ["Leche entera", "Pan integral", "Aceite oliva"]

    def test_extract_text_raises_on_empty_image(self):
        """Debe lanzar OCRProcessingError si no se extrae ningún texto."""
        from apps.core.exceptions import OCRProcessingError
        from apps.ocr.services import extract_text_from_image

        fake_image_bytes = b"\x89PNG\r\n\x1a\n"

        with patch(
            "apps.ocr.services.pytesseract.image_to_string",
            return_value="",
        ), patch("apps.ocr.services.Image") as mock_image:
            mock_img = MagicMock()
            mock_img.height = 2000  # mayor que _MIN_HEIGHT_PX, evita upscale
            mock_image.open.return_value.convert.return_value = mock_img
            mock_img.filter.return_value = mock_img

            with patch("apps.ocr.services.ImageOps") as mock_imageops:
                mock_imageops.autocontrast.return_value = mock_img

                with pytest.raises(OCRProcessingError):
                    extract_text_from_image(fake_image_bytes)


@pytest.mark.django_db
class TestMatchProducts:
    """Tests de la función match_products."""

    def test_match_products_above_threshold(self):
        """Debe devolver matched_product_id cuando la similitud supera el umbral."""
        from apps.ocr.services import match_products
        from apps.products.models import Product

        # Nombres cortos que coincidan bien con la búsqueda (token_sort_ratio ~= 1.0)
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
        """Todos los ítems devueltos deben tener quantity=1."""
        from apps.ocr.services import match_products
        from apps.products.models import Product

        Product.objects.create(name="Yogur Natural Danone", is_active=True)
        Product.objects.create(name="Galletas Maria", is_active=True)

        lines = ["YOGUR", "GALLETAS"]
        results = match_products(lines)

        assert len(results) == 2
        for item in results:
            assert item["quantity"] == 1
