"""
Servicios OCR para el módulo de reconocimiento de imágenes de BargAIn.

Proporciona:
- extract_text_from_image: extrae líneas de texto de una imagen con pytesseract
- match_products: empareja líneas de texto contra el catálogo de productos con fuzzy matching
"""

import io

import pytesseract
import structlog
from PIL import Image, ImageFilter, ImageOps
from thefuzz import fuzz

from apps.core.exceptions import OCRProcessingError

logger = structlog.get_logger(__name__)


_OCR_TIMEOUT_SECONDS = 30
_MIN_HEIGHT_PX = 1000  # upscale si la imagen es más pequeña
_MIN_WORD_CONFIDENCE = 60  # confianza mínima por palabra (escala tesseract 0-100)
_MIN_ALPHA_CHARS = 3  # mínimo de caracteres alfabéticos por palabra
_MIN_ALPHA_RATIO = 0.5  # mínimo ratio letras/total caracteres por palabra
_SPANISH_ALPHA = set("abcdefghijklmnopqrstuvwxyzáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÜÑ")


def extract_text_from_image(image_bytes: bytes, lang: str = "spa+eng") -> list[str]:
    """Extrae líneas de texto de una imagen usando pytesseract.

    Usa image_to_data para obtener confianza por palabra y descartar ruido.
    Solo se devuelven palabras con confianza >= 40 (escala tesseract 0-100),
    agrupadas por línea. Imágenes sin texto real generan OCRProcessingError.

    Args:
        image_bytes: Contenido binario de la imagen.
        lang: Idioma(s) de tesseract, p.ej. "spa+eng".

    Returns:
        Lista de líneas de texto no vacías con confianza suficiente.

    Raises:
        OCRProcessingError: Si no hay palabras con confianza >= 40 o si
            tesseract supera el timeout de 30 segundos.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)

    # Upscale imágenes pequeñas para mejorar la precisión de tesseract
    if image.height < _MIN_HEIGHT_PX:
        scale = _MIN_HEIGHT_PX / image.height
        new_size = (int(image.width * scale), _MIN_HEIGHT_PX)
        image = image.resize(new_size, Image.LANCZOS)

    try:
        # image_to_data devuelve confianza por palabra (0-100); filtramos el ruido
        data = pytesseract.image_to_data(
            image,
            lang=lang,
            config="--psm 4 --oem 3",
            output_type=pytesseract.Output.DICT,
            timeout=_OCR_TIMEOUT_SECONDS,
        )
    except RuntimeError as exc:
        logger.warning("ocr.tesseract_timeout", timeout=_OCR_TIMEOUT_SECONDS)
        raise OCRProcessingError("Tesseract tardó demasiado procesando la imagen") from exc

    # Agrupar palabras de alta confianza y calidad por línea lógica
    lines_dict: dict[tuple, list[str]] = {}
    for i, word in enumerate(data["text"]):
        word = word.strip()
        conf = int(data["conf"][i])
        if not word or conf < _MIN_WORD_CONFIDENCE:
            continue
        # Filtro de calidad: descartar ruido de fondos/patrones decorativos
        alpha_chars = sum(1 for c in word if c in _SPANISH_ALPHA)
        if alpha_chars < _MIN_ALPHA_CHARS:
            continue
        if alpha_chars / len(word) < _MIN_ALPHA_RATIO:
            continue
        line_key = (data["page_num"][i], data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines_dict.setdefault(line_key, []).append(word)

    lines = [" ".join(words) for words in lines_dict.values() if words]

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
