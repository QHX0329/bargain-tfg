"""Utilidades para asignar categorias automaticamente a productos importados."""

from __future__ import annotations

from dataclasses import dataclass
import unicodedata

from django.utils.text import slugify

from apps.products.models import Category, Product


@dataclass(frozen=True)
class CategoryRule:
    """Regla de clasificacion basada en palabras clave."""

    parent_name: str
    child_name: str
    keywords: tuple[str, ...]


CATEGORY_RULES: tuple[CategoryRule, ...] = (
    CategoryRule(
        parent_name="Bebidas",
        child_name="Refrescos",
        keywords=("refresco", "kas", "pepsi", "bitter", "zero", "cola", "tonica"),
    ),
    CategoryRule(
        parent_name="Bebidas",
        child_name="Aguas",
        keywords=("agua mineral", "agua con gas", "agua"),
    ),
    CategoryRule(
        parent_name="Bebidas",
        child_name="Cervezas",
        keywords=("cerveza", "radler", "shandy", "lager"),
    ),
    CategoryRule(
        parent_name="Despensa",
        child_name="Conservas",
        keywords=(
            "atun",
            "bonito",
            "caballa",
            "melva",
            "chipirones",
            "conserva",
            "escabeche",
        ),
    ),
    CategoryRule(
        parent_name="Despensa",
        child_name="Aceites y Vinagres",
        keywords=("aceite", "virgen", "oliva", "vinagre"),
    ),
    CategoryRule(
        parent_name="Snacks y Aperitivos",
        child_name="Patatas y Snacks",
        keywords=("patatas", "ruffles", "doritos", "cheetos", "sunbites", "snack"),
    ),
    CategoryRule(
        parent_name="Desayuno y Dulces",
        child_name="Chocolate y Golosinas",
        keywords=("chocolate", "bombon", "chicle", "cacao"),
    ),
    CategoryRule(
        parent_name="Lacteos y Alternativas",
        child_name="Bebidas Vegetales y Lacteos",
        keywords=("leche", "soja", "almendra", "arroz", "batido", "lacteo"),
    ),
    CategoryRule(
        parent_name="Platos Preparados",
        child_name="Refrigerados",
        keywords=("gazpacho", "arroz 3 delicias", "plato preparado"),
    ),
    CategoryRule(
        parent_name="Carnes y Embutidos",
        child_name="Charcuteria",
        keywords=("bacon", "chorizo", "embutido", "jamon"),
    ),
)


def _normalize_text(value: str) -> str:
    """Normaliza texto para matching robusto de keywords."""
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return without_accents.lower().strip()


def infer_category_pair(product_name: str) -> tuple[str, str] | None:
    """Infiere categoria (padre, hija) a partir del nombre del producto."""
    normalized_name = _normalize_text(product_name)
    for rule in CATEGORY_RULES:
        if any(keyword in normalized_name for keyword in rule.keywords):
            return rule.parent_name, rule.child_name
    return None


def get_or_create_category_pair(parent_name: str, child_name: str) -> Category:
    """Obtiene/crea categoria hija y garantiza jerarquia de 2 niveles."""
    parent_slug = slugify(parent_name)
    parent, _ = Category.objects.get_or_create(
        slug=parent_slug,
        defaults={
            "name": parent_name,
            "parent": None,
        },
    )

    child_slug = slugify(f"{parent_name}-{child_name}")
    child, _ = Category.objects.get_or_create(
        slug=child_slug,
        defaults={
            "name": child_name,
            "parent": parent,
        },
    )
    if child.parent_id != parent.id:
        child.parent = parent
        child.save(update_fields=["parent"])
    return child


def auto_assign_category_to_product(product: Product, overwrite: bool = False) -> bool:
    """Asigna categoria inferida a un producto.

    Args:
        product: Instancia de producto a clasificar.
        overwrite: Si True, reemplaza categoria existente.

    Returns:
        bool: True si el producto fue actualizado.
    """
    if product.category_id and not overwrite:
        return False

    inferred = infer_category_pair(product.name)
    if inferred is None:
        return False

    category = get_or_create_category_pair(*inferred)
    if product.category_id == category.id:
        return False

    product.category = category
    product.save(update_fields=["category", "updated_at"])
    return True
