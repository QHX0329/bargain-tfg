"""
Tests de integracion para los endpoints del modulo OCR.

Cubre:
- POST /api/v1/ocr/scan/ - escaneo de imagen con usuario autenticado
- Validacion de autenticacion obligatoria
- Validacion de imagen obligatoria
- Formato de respuesta correcto
- Error explicito cuando el OCR esta mal configurado
"""

import io
from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, ImageDraw
from rest_framework import status


def _create_test_image_bytes(text: str = "Leche entera") -> bytes:
    """Crea una imagen PNG simple con texto para los tests."""
    img = Image.new("RGB", (200, 60), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 20), text, fill=(0, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _make_uploaded_image(text: str = "Leche entera", filename: str = "test.png") -> SimpleUploadedFile:
    """Crea un SimpleUploadedFile con una imagen PNG para tests multipart."""
    return SimpleUploadedFile(
        name=filename,
        content=_create_test_image_bytes(text),
        content_type="image/png",
    )


@pytest.mark.django_db
class TestOCRScanEndpoint:
    """Tests de integracion para POST /api/v1/ocr/scan/."""

    def test_scan_endpoint_returns_200_with_valid_image(self, authenticated_client):
        """POST con imagen valida y usuario autenticado devuelve 200."""
        uploaded_image = _make_uploaded_image("Leche entera")

        with patch("apps.ocr.views.extract_text_from_image") as mock_extract, patch(
            "apps.ocr.views.match_products"
        ) as mock_match:
            mock_extract.return_value = ["Leche entera"]
            mock_match.return_value = [
                {
                    "raw_text": "Leche entera",
                    "confidence": 0.95,
                    "quantity": 1,
                }
            ]

            response = authenticated_client.post(
                "/api/v1/ocr/scan/",
                data={"image": uploaded_image},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "items" in data["data"]
        assert isinstance(data["data"]["items"], list)

    def test_scan_endpoint_requires_auth(self, api_client):
        """POST sin token de autenticacion devuelve 401."""
        uploaded_image = _make_uploaded_image()

        response = api_client.post(
            "/api/v1/ocr/scan/",
            data={"image": uploaded_image},
            format="multipart",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_scan_endpoint_rejects_no_image(self, authenticated_client):
        """POST sin imagen devuelve 400."""
        response = authenticated_client.post(
            "/api/v1/ocr/scan/",
            data={},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_scan_response_format(self, authenticated_client):
        """Cada item de la respuesta debe tener raw_text, confidence y quantity."""
        uploaded_image = _make_uploaded_image("Pan integral")

        with patch("apps.ocr.views.extract_text_from_image") as mock_extract, patch(
            "apps.ocr.views.match_products"
        ) as mock_match:
            mock_extract.return_value = ["Pan integral"]
            mock_match.return_value = [
                {
                    "raw_text": "Pan integral",
                    "confidence": 0.88,
                    "quantity": 1,
                }
            ]

            response = authenticated_client.post(
                "/api/v1/ocr/scan/",
                data={"image": uploaded_image},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        items = response.json()["data"]["items"]
        assert len(items) >= 1
        for item in items:
            assert "raw_text" in item
            assert "confidence" in item
            assert "quantity" in item

    def test_scan_endpoint_returns_503_when_ocr_is_misconfigured(self, authenticated_client):
        """Si el OCR no esta configurado, el endpoint debe devolver 503 explicito."""
        uploaded_image = _make_uploaded_image("Leche entera")

        with patch(
            "apps.ocr.views.extract_text_from_image",
            side_effect=ImproperlyConfigured("Vision key missing"),
        ):
            response = authenticated_client.post(
                "/api/v1/ocr/scan/",
                data={"image": uploaded_image},
                format="multipart",
            )

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "OCR_CONFIGURATION_ERROR"
