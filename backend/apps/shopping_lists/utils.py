"""
Utilidades de normalizacion para listas de la compra.
"""

from __future__ import annotations

import re
import unicodedata


_MULTISPACE_RE = re.compile(r"\s+")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")


def normalize_list_text(value: str) -> str:
    """
    Normaliza texto libre para poder fusionar y comparar items por contenido.

    Se eliminan acentos, puntuacion y espacios repetidos para que
    "Leche  Entera", "leche-entera" y "Leché entera" converjan al mismo valor.
    """

    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower().strip()
    ascii_text = _NON_ALNUM_RE.sub(" ", ascii_text)
    return _MULTISPACE_RE.sub(" ", ascii_text).strip()
