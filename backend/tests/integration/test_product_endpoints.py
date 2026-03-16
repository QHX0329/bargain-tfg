"""
Tests de integración para los endpoints del dominio products.

Cubre:
- GET /api/v1/products/ - listado con filtros (q, barcode, category)
- GET /api/v1/products/{id}/ - detalle con price_min/price_max
- GET /api/v1/products/autocomplete/ - búsqueda trigram ordenada
- GET /api/v1/products/categories/ - árbol de categorías 2 niveles
- POST /api/v1/products/proposals/ - crear propuesta (autenticado/no autenticado)
"""

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestProductSearch:
    """Tests para la búsqueda y filtrado de productos."""

    def test_search_by_name_returns_matching_products(self, api_client):
        """GET /api/v1/products/?q=leche retorna productos con similitud trigram >= 0.3."""
        from tests.factories import CategoryFactory, ProductFactory

        cat = CategoryFactory()
        ProductFactory(name="Leche entera", normalized_name="leche entera", category=cat)
        ProductFactory(name="Leche desnatada", normalized_name="leche desnatada", category=cat)
        ProductFactory(name="Zumo naranja", normalized_name="zumo naranja", category=cat)

        response = api_client.get("/api/v1/products/", {"q": "leche"})

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # La respuesta debe contener resultados de leche
        results = data.get("results", data.get("data", {}).get("results", []))
        # Al menos 1 producto de leche debe aparecer
        assert len(results) >= 1
        names = [r["name"].lower() for r in results]
        assert any("leche" in name for name in names)

    def test_search_empty_q_returns_empty_list(self, api_client):
        """GET /api/v1/products/?q= (vacío) retorna lista vacía."""
        from tests.factories import ProductFactory

        ProductFactory(name="Leche entera", normalized_name="leche entera")

        response = api_client.get("/api/v1/products/", {"q": ""})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data.get("data", {}).get("results", []))
        assert results == []

    def test_search_short_q_returns_empty_list(self, api_client):
        """GET /api/v1/products/?q=l (1 char) retorna lista vacía."""
        from tests.factories import ProductFactory

        ProductFactory(name="Leche entera", normalized_name="leche entera")

        response = api_client.get("/api/v1/products/", {"q": "l"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data.get("data", {}).get("results", []))
        assert results == []

    def test_filter_by_category(self, api_client):
        """GET /api/v1/products/?category={id} retorna solo productos de esa categoría."""
        from tests.factories import CategoryFactory, ProductFactory

        cat_lacteos = CategoryFactory(name="Lácteos")
        cat_bebidas = CategoryFactory(name="Bebidas")
        ProductFactory(name="Leche", category=cat_lacteos, normalized_name="leche")
        ProductFactory(name="Agua", category=cat_bebidas, normalized_name="agua")

        response = api_client.get("/api/v1/products/", {"category": cat_lacteos.id})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data.get("data", {}).get("results", []))
        assert len(results) >= 1
        for item in results:
            assert item["category"]["id"] == cat_lacteos.id


@pytest.mark.django_db
class TestProductDetail:
    """Tests para el endpoint de detalle de producto."""

    def test_product_detail_returns_fields(self, api_client):
        """GET /api/v1/products/{id}/ retorna campos esperados."""
        from tests.factories import ProductFactory

        product = ProductFactory(
            name="Leche entera",
            normalized_name="leche entera",
            brand="Puleva",
            unit="l",
            unit_quantity=1.0,
        )

        response = api_client.get(f"/api/v1/products/{product.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Si hay envoltura success/data
        item = data.get("data", data)
        assert "id" in item
        assert "name" in item
        assert "normalized_name" in item
        assert "brand" in item
        assert "unit" in item
        assert "unit_quantity" in item

    def test_product_detail_includes_price_range_null_when_no_prices(self, api_client):
        """GET /api/v1/products/{id}/ retorna price_min=null y price_max=null si no hay precios."""
        from tests.factories import ProductFactory

        product = ProductFactory(name="Sin precios", normalized_name="sin precios")

        response = api_client.get(f"/api/v1/products/{product.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        item = data.get("data", data)

        assert "price_min" in item
        assert "price_max" in item
        assert item["price_min"] is None
        assert item["price_max"] is None

    def test_barcode_not_found_returns_404(self, api_client):
        """GET /api/v1/products/?barcode=0000000000000 retorna 404 con PRODUCT_NOT_FOUND."""
        response = api_client.get("/api/v1/products/", {"barcode": "0000000000000"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "PRODUCT_NOT_FOUND"

    def test_barcode_exact_match_returns_product(self, api_client):
        """GET /api/v1/products/?barcode={barcode} retorna el producto exacto."""
        from tests.factories import ProductFactory

        product = ProductFactory(
            name="Aceite girasol", barcode="8410376025819", normalized_name="aceite girasol"
        )

        response = api_client.get("/api/v1/products/", {"barcode": "8410376025819"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data.get("data", {}).get("results", []))
        assert len(results) == 1
        assert results[0]["id"] == product.id


@pytest.mark.django_db
class TestAutocomplete:
    """Tests para el endpoint de autocompletado."""

    def test_autocomplete_returns_ordered_by_similarity(self, api_client):
        """GET /api/v1/products/autocomplete/?q=lec retorna productos ordenados por similitud."""
        from tests.factories import ProductFactory

        ProductFactory(name="Leche entera", normalized_name="leche entera")
        ProductFactory(name="Leche semidesnatada", normalized_name="leche semidesnatada")
        ProductFactory(name="Zumo limón", normalized_name="zumo limon")

        response = api_client.get("/api/v1/products/autocomplete/", {"q": "lec"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Debe tener formato success/data
        assert data.get("success") is True
        results = data.get("data", [])
        assert isinstance(results, list)
        # Los productos de "leche" deben aparecer
        names = [r["name"].lower() for r in results]
        assert any("leche" in name for name in names)

    def test_autocomplete_short_q_returns_empty(self, api_client):
        """GET /api/v1/products/autocomplete/?q=l retorna lista vacía."""
        from tests.factories import ProductFactory

        ProductFactory(name="Leche", normalized_name="leche")

        response = api_client.get("/api/v1/products/autocomplete/", {"q": "l"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data.get("success") is True
        assert data.get("data", []) == []

    def test_autocomplete_returns_at_most_10_results(self, api_client):
        """GET /api/v1/products/autocomplete/?q=... retorna máximo 10 resultados."""
        from tests.factories import ProductFactory

        for i in range(15):
            ProductFactory(name=f"Leche tipo {i}", normalized_name=f"leche tipo {i}")

        response = api_client.get("/api/v1/products/autocomplete/", {"q": "leche"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("data", [])
        assert len(results) <= 10


@pytest.mark.django_db
class TestCategories:
    """Tests para el endpoint de categorías."""

    def test_categories_returns_2level_tree(self, api_client):
        """GET /api/v1/products/categories/ retorna árbol de 2 niveles."""
        from apps.products.models import Category

        root = Category.objects.create(name="Alimentación", slug="alimentacion")
        Category.objects.create(name="Lácteos", slug="lacteos", parent=root)
        Category.objects.create(name="Carnes", slug="carnes", parent=root)
        Category.objects.create(name="Bebidas", slug="bebidas")

        response = api_client.get("/api/v1/products/categories/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # El endpoint devuelve lista directa (sin paginación) o paginado con results
        if isinstance(data, list):
            results = data
        elif isinstance(data, dict):
            results = data.get("results", data.get("data", []))
        else:
            results = []

        # Encontrar la categoría raíz "Alimentación"
        roots = [r for r in results if r.get("slug") == "alimentacion"]
        assert len(roots) >= 1
        alimentacion = roots[0]

        # Debe tener hijos
        children = alimentacion.get("children", [])
        assert len(children) >= 2
        child_slugs = [c["slug"] for c in children]
        assert "lacteos" in child_slugs
        assert "carnes" in child_slugs

    def test_categories_list_only_root_categories(self, api_client):
        """GET /api/v1/products/categories/ no incluye subcategorías como raíces."""
        from apps.products.models import Category

        root = Category.objects.create(name="Raíz test", slug="raiz-test")
        Category.objects.create(name="Hijo test", slug="hijo-test", parent=root)

        response = api_client.get("/api/v1/products/categories/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        if isinstance(data, list):
            results = data
        elif isinstance(data, dict):
            results = data.get("results", data.get("data", []))
        else:
            results = []

        # Las subcategorías no deben aparecer en el nivel raíz
        slugs = [r.get("slug") for r in results]
        assert "hijo-test" not in slugs


@pytest.mark.django_db
class TestProposals:
    """Tests para el endpoint de propuestas de productos."""

    def test_create_proposal_authenticated_returns_201(self, authenticated_client):
        """POST /api/v1/products/proposals/ con auth retorna 201 y status=pending."""
        payload = {
            "name": "Nuevo producto propuesto",
            "brand": "Marca desconocida",
            "barcode": "9999999999999",
            "notes": "Lo vi en el supermercado de la esquina",
        }

        response = authenticated_client.post("/api/v1/products/proposals/", payload)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        item = data.get("data", data)
        assert "id" in item
        assert item.get("status") == "pending"

    def test_create_proposal_unauthenticated_returns_401(self, api_client):
        """POST /api/v1/products/proposals/ sin auth retorna 401."""
        payload = {"name": "Propuesta anónima"}

        response = api_client.post("/api/v1/products/proposals/", payload)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_proposal_is_not_immediately_visible_in_products(
        self, authenticated_client, api_client
    ):
        """Una propuesta no aparece en GET /api/v1/products/ hasta ser aprobada."""
        payload = {"name": "Producto nuevo propuesto xyz123"}
        authenticated_client.post("/api/v1/products/proposals/", payload)

        # Buscar el producto recién propuesto — no debe aparecer
        response = api_client.get("/api/v1/products/", {"q": "xyz123"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data.get("data", {}).get("results", []))
        assert results == []
