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

    def _mock_image_to_data(self, words: list[str], conf: int = 90) -> dict:
        """Genera un dict simulando la salida de pytesseract.image_to_data."""
        return {
            "text": words + [""],
            "conf": [conf] * len(words) + [-1],
            "page_num": [1] * (len(words) + 1),
            "block_num": [1] * (len(words) + 1),
            "par_num": [1] * (len(words) + 1),
            "line_num": list(range(1, len(words) + 1)) + [0],
        }

    def test_extract_text_returns_lines(self):
        """Debe devolver líneas no vacías al extraer texto de la imagen."""
        from apps.ocr.services import extract_text_from_image

        fake_image_bytes = b"\x89PNG\r\n\x1a\n"
        mock_data = self._mock_image_to_data(["Leche", "Pan", "Aceite"], conf=90)

        with patch(
            "apps.ocr.services.pytesseract.image_to_data",
            return_value=mock_data,
        ), patch("apps.ocr.services.Image") as mock_image:
            mock_img = MagicMock()
            mock_img.height = 2000
            mock_image.open.return_value.convert.return_value = mock_img
            mock_img.filter.return_value = mock_img

            with patch("apps.ocr.services.ImageOps") as mock_imageops:
                mock_imageops.autocontrast.return_value = mock_img

                result = extract_text_from_image(fake_image_bytes)

        assert result == ["Leche", "Pan", "Aceite"]

    def test_extract_text_raises_on_empty_image(self):
        """Debe lanzar OCRProcessingError si todas las palabras son ruido o baja confianza."""
        from apps.core.exceptions import OCRProcessingError
        from apps.ocr.services import extract_text_from_image

        fake_image_bytes = b"\x89PNG\r\n\x1a\n"
        # Palabras con confianza alta pero que no superan filtros de calidad:
        # "|" (0 alpha), "Hi" (2 alpha < 3 mínimo), "=>" (0 alpha)
        mock_data = self._mock_image_to_data(["|", "Hi", "=>"], conf=70)

        with patch(
            "apps.ocr.services.pytesseract.image_to_data",
            return_value=mock_data,
        ), patch("apps.ocr.services.Image") as mock_image:
            mock_img = MagicMock()
            mock_img.height = 2000
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
