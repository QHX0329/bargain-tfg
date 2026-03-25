"""Serializers para el módulo OCR de BargAIn."""

from rest_framework import serializers


class OCRScanRequestSerializer(serializers.Serializer):
    """Serializer para la petición multipart del endpoint de escaneo OCR."""

    image = serializers.ImageField(
        required=True,
        help_text="Foto de lista o ticket",
    )


class OCRItemSerializer(serializers.Serializer):
    """Serializer para un ítem reconocido por OCR con su producto emparejado."""

    raw_text = serializers.CharField()
    matched_product_id = serializers.IntegerField(required=False, allow_null=True)
    matched_product_name = serializers.CharField(required=False, allow_null=True)
    confidence = serializers.FloatField()
    quantity = serializers.IntegerField(default=1)


class OCRScanResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta del endpoint de escaneo OCR."""

    items = OCRItemSerializer(many=True)
