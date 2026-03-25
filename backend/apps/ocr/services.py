"""
Servicios OCR para el módulo de reconocimiento de imágenes de BargAIn.

Proporciona:
- extract_text_from_image: extrae líneas de texto de una imagen con pytesseract
- match_products: empareja líneas de texto contra el catálogo de productos con fuzzy matching
"""

import io

import structlog
from PIL import Image, ImageFilter, ImageOps
from thefuzz import fuzz

from apps.core.exceptions import OCRProcessingError

logger = structlog.get_logger(__name__)


def extract_text_from_image(image_bytes: bytes, lang: str = "spa+eng") -> list[str]:
    """Extrae líneas de texto de una imagen usando pytesseract.

    Preprocesa la imagen en escala de grises con autocontraste y nitidez
    antes de ejecutar OCR. Filtra líneas vacías del resultado.

    Args:
        image_bytes: Contenido binario de la imagen.
        lang: Idioma(s) de tesseract, p.ej. "spa+eng".

    Returns:
        Lista de líneas de texto no vacías extraídas de la imagen.

    Raises:
        OCRProcessingError: Si no se pudo extraer ningún texto de la imagen.
    """
    import pytesseract

    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)

    raw_text = pytesseract.image_to_string(image, lang=lang, config="--psm 6 --oem 3")
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]

    if not lines:
        logger.warning("ocr.no_text_extracted", image_size=len(image_bytes))
        raise OCRProcessingError("No se pudo extraer texto de la imagen")

    logger.info("ocr.text_extracted", lines_count=len(lines))
    return lines


def match_products(raw_lines: list[str], threshold: int = 80) -> list[dict]:
    """Empareja líneas de texto con productos del catálogo usando fuzzy matching.

    Compara cada línea contra todos los productos activos con
    thefuzz.fuzz.token_sort_ratio. Las líneas con puntuación >= threshold
    incluyen matched_product_id y matched_product_name en el resultado.

    Args:
        raw_lines: Líneas de texto reconocidas por OCR.
        threshold: Umbral mínimo de similitud (0-100). Por defecto 80.

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
