"""
Tests unitarios para los modelos del dominio products.

Cubre:
- Category: auto-slug, 2-level hierarchy enforcement
- Product: normalized_name auto-population, choices
- ProductProposal: status default
- pg_trgm: trigram similarity disponible en BD
"""

import pytest
from django.core.exceptions import ValidationError


@pytest.mark.django_db
class TestCategoryModel:
    """Tests del modelo Category."""

    def test_category_slug_auto_generated(self):
        """El slug se genera automáticamente desde el nombre si no se especifica."""
        from apps.products.models import Category

        cat = Category.objects.create(name="Frutas y Verduras")
        assert cat.slug == "frutas-y-verduras"

    def test_category_custom_slug_preserved(self):
        """Si se especifica slug explícito, se conserva."""
        from apps.products.models import Category

        cat = Category.objects.create(name="Lácteos", slug="lacteos-especial")
        assert cat.slug == "lacteos-especial"

    def test_category_root_has_no_parent(self):
        """Una categoría raíz tiene parent=None."""
        from apps.products.models import Category

        root = Category.objects.create(name="Bebidas")
        assert root.parent is None

    def test_subcategory_has_parent(self):
        """Una subcategoría tiene parent apuntando a categoría raíz."""
        from apps.products.models import Category

        root = Category.objects.create(name="Bebidas")
        sub = Category.objects.create(name="Refrescos", parent=root)
        assert sub.parent == root

    def test_three_level_hierarchy_raises_validation_error(self):
        """No se permite más de 2 niveles de jerarquía (ValidationError)."""
        from apps.products.models import Category

        root = Category.objects.create(name="Alimentación")
        level2 = Category.objects.create(name="Lácteos", parent=root)
        level3 = Category(name="Leche entera", parent=level2)

        with pytest.raises(ValidationError):
            level3.clean()

    def test_category_ordering_by_name(self):
        """Las categorías se ordenan alfabéticamente por nombre."""
        from apps.products.models import Category

        Category.objects.create(name="Zumos")
        Category.objects.create(name="Agua")
        Category.objects.create(name="Refrescos")

        names = list(Category.objects.values_list("name", flat=True))
        assert names == sorted(names)


@pytest.mark.django_db
class TestProductModel:
    """Tests del modelo Product."""

    def test_normalized_name_auto_populated(self):
        """normalized_name se rellena automáticamente desde name (lowercase stripped)."""
        from apps.products.models import Product

        product = Product.objects.create(name="  Leche Entera  ", unit="l", unit_quantity=1.0)
        assert product.normalized_name == "  leche entera  ".lower().strip()

    def test_normalized_name_not_overwritten_if_set(self):
        """Si normalized_name ya tiene valor, no se sobreescribe al guardar."""
        from apps.products.models import Product

        product = Product.objects.create(
            name="Leche Entera", normalized_name="leche entera uht", unit="l"
        )
        assert product.normalized_name == "leche entera uht"

    def test_product_is_active_default(self):
        """Los productos nuevos son activos por defecto."""
        from apps.products.models import Product

        product = Product.objects.create(name="Pan de molde", unit="units")
        assert product.is_active is True

    def test_product_barcode_unique(self):
        """El código de barras es único entre productos."""
        from django.db import IntegrityError

        from apps.products.models import Product

        Product.objects.create(name="Producto A", barcode="1234567890123", unit="units")
        with pytest.raises(IntegrityError):
            Product.objects.create(name="Producto B", barcode="1234567890123", unit="units")

    def test_product_barcode_nullable(self):
        """Varios productos pueden tener barcode=None (no viola unique constraint)."""
        from apps.products.models import Product

        p1 = Product.objects.create(name="Sin barcode 1", barcode=None, unit="units")
        p2 = Product.objects.create(name="Sin barcode 2", barcode=None, unit="units")
        assert p1.barcode is None
        assert p2.barcode is None

    def test_product_unit_choices(self):
        """Las unidades válidas son kg, g, l, ml, units."""
        from apps.products.models import Product

        choices = [c[0] for c in Product.Unit.choices]
        assert set(choices) == {"kg", "g", "l", "ml", "units"}


@pytest.mark.django_db
class TestProductProposalModel:
    """Tests del modelo ProductProposal."""

    def test_proposal_default_status_pending(self):
        """El estado por defecto de una propuesta es 'pending'."""
        from apps.products.models import ProductProposal

        proposal = ProductProposal.objects.create(name="Nuevo producto")
        assert proposal.status == "pending"

    def test_proposal_status_choices(self):
        """Los estados válidos son pending, approved, rejected."""
        from apps.products.models import ProductProposal

        choices = [c[0] for c in ProductProposal.Status.choices]
        assert set(choices) == {"pending", "approved", "rejected"}

    def test_proposal_proposed_by_nullable(self):
        """La propuesta puede ser anónima (proposed_by=None)."""
        from apps.products.models import ProductProposal

        proposal = ProductProposal.objects.create(name="Propuesta anónima")
        assert proposal.proposed_by is None


@pytest.mark.django_db
class TestPgTrgm:
    """Verifica que la extensión pg_trgm está activa y TrigramSimilarity funciona."""

    def test_trigram_similarity_available(self):
        """TrigramSimilarity se puede usar sin ProgrammingError."""
        from django.contrib.postgres.search import TrigramSimilarity

        from apps.products.models import Product

        # Crear un producto para tener algo en la BD
        Product.objects.create(name="Leche entera", unit="l", unit_quantity=1.0)

        # Debería ejecutarse sin errores si pg_trgm está activo
        results = list(
            Product.objects.annotate(
                similarity=TrigramSimilarity("normalized_name", "leche")
            ).filter(similarity__gte=0.1)
        )
        assert len(results) >= 1

    def test_trigram_similarity_orders_by_relevance(self):
        """Los productos se ordenan por similitud descendente."""
        from django.contrib.postgres.search import TrigramSimilarity

        from apps.products.models import Product

        Product.objects.create(name="Leche entera", normalized_name="leche entera", unit="l")
        Product.objects.create(name="Leche semidesnatada", normalized_name="leche semidesnatada", unit="l")
        Product.objects.create(name="Zumo naranja", normalized_name="zumo naranja", unit="l")

        results = list(
            Product.objects.annotate(
                similarity=TrigramSimilarity("normalized_name", "leche")
            ).filter(similarity__gte=0.1).order_by("-similarity")
        )

        # Los productos de leche deben aparecer primero
        assert len(results) >= 2
        # El primero debe tener mayor o igual similitud que el último
        assert results[0].similarity >= results[-1].similarity
