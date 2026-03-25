"""
Tests de integracion del endpoint POST /api/v1/optimize/.

Cubre:
- Respuesta 200 con ruta valida (mock de get_distance_matrix)
- Autenticacion requerida (401 sin token)
- 404 con OPTIMIZER_NO_STORES_IN_RADIUS cuando no hay tiendas
- Validacion de max_stops fuera de rango (400)
"""

from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient


OPTIMIZE_URL = "/api/v1/optimize/"


# ── Fixtures ───────────────────────────────────────────────────────────────────


@pytest.fixture
def product_with_category(db):
    """Crea un producto con categoria para tests de optimizacion."""
    from apps.products.models import Category, Product

    category = Category.objects.create(name="Lacteos")
    product = Product.objects.create(
        name="Leche Entera 1L",
        normalized_name="leche entera 1l",
        category=category,
        is_active=True,
    )
    return product


@pytest.fixture
def store_in_seville(db):
    """Crea una tienda activa en Sevilla con cadena."""
    from apps.stores.models import Store, StoreChain

    chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
    store = Store.objects.create(
        name="Mercadona Nervion",
        chain=chain,
        address="Calle Nervion 1, Sevilla",
        location=Point(-5.9730, 37.3891, srid=4326),  # ~1.2km del centro
        is_active=True,
    )
    return store


@pytest.fixture
def shopping_list_with_items(db, consumer_user, product_with_category):
    """Crea una lista de la compra con un item para el usuario consumer."""
    from apps.shopping_lists.models import ShoppingList, ShoppingListItem

    sl = ShoppingList.objects.create(owner=consumer_user, name="Lista Test Optimizacion")
    ShoppingListItem.objects.create(
        shopping_list=sl,
        product=product_with_category,
        quantity=2,
        added_by=consumer_user,
    )
    return sl


@pytest.fixture
def price_in_store(db, product_with_category, store_in_seville):
    """Crea un precio para el producto en la tienda."""
    from apps.prices.models import Price

    return Price.objects.create(
        product=product_with_category,
        store=store_in_seville,
        price=Decimal("1.20"),
        source="scraping",
        is_stale=False,
    )


# Matrices fijas para mock de Graphhopper
FIXED_DIST_MATRIX = [[0.0, 1.2], [1.2, 0.0]]
FIXED_TIME_MATRIX = [[0.0, 3.5], [3.5, 0.0]]


# ── Tests ──────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_optimize_endpoint_returns_200(
    authenticated_client,
    shopping_list_with_items,
    store_in_seville,
    price_in_store,
):
    """POST /api/v1/optimize/ devuelve 200 con ruta cuando hay tiendas y precios."""
    with patch(
        "apps.optimizer.services.distance.get_distance_matrix",
        return_value=(FIXED_DIST_MATRIX, FIXED_TIME_MATRIX),
    ):
        response = authenticated_client.post(
            OPTIMIZE_URL,
            data={
                "shopping_list_id": shopping_list_with_items.id,
                "lat": 37.3891,
                "lng": -5.9845,
                "max_distance_km": 10.0,
                "max_stops": 2,
            },
            format="json",
        )

    assert response.status_code == 200, response.data
    data = response.data
    assert data["success"] is True
    result = data["data"]
    assert "total_price" in result
    assert "route" in result
    assert isinstance(result["route"], list)


@pytest.mark.django_db
def test_optimize_requires_auth(api_client, shopping_list_with_items):
    """POST /api/v1/optimize/ sin token devuelve 401."""
    response = api_client.post(
        OPTIMIZE_URL,
        data={
            "shopping_list_id": shopping_list_with_items.id,
            "lat": 37.3891,
            "lng": -5.9845,
        },
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_optimize_404_no_stores_in_radius(
    authenticated_client,
    shopping_list_with_items,
):
    """POST /api/v1/optimize/ devuelve 404 con OPTIMIZER_NO_STORES_IN_RADIUS si no hay tiendas."""
    # No creamos ninguna tienda => radio sin tiendas
    response = authenticated_client.post(
        OPTIMIZE_URL,
        data={
            "shopping_list_id": shopping_list_with_items.id,
            "lat": 0.0,    # Ubicacion en el Atlantico
            "lng": -30.0,
            "max_distance_km": 1.0,
            "max_stops": 2,
        },
        format="json",
    )

    assert response.status_code == 404
    error = response.data.get("error", {})
    assert error.get("code") == "OPTIMIZER_NO_STORES_IN_RADIUS"


@pytest.mark.django_db
def test_optimize_validates_max_stops_range(authenticated_client, shopping_list_with_items):
    """POST /api/v1/optimize/ con max_stops=10 devuelve 400."""
    response = authenticated_client.post(
        OPTIMIZE_URL,
        data={
            "shopping_list_id": shopping_list_with_items.id,
            "lat": 37.3891,
            "lng": -5.9845,
            "max_stops": 10,
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_optimize_persists_result(
    authenticated_client,
    shopping_list_with_items,
    store_in_seville,
    price_in_store,
):
    """POST /api/v1/optimize/ persiste el OptimizationResult en BD."""
    from apps.optimizer.models import OptimizationResult

    with patch(
        "apps.optimizer.services.distance.get_distance_matrix",
        return_value=(FIXED_DIST_MATRIX, FIXED_TIME_MATRIX),
    ):
        response = authenticated_client.post(
            OPTIMIZE_URL,
            data={
                "shopping_list_id": shopping_list_with_items.id,
                "lat": 37.3891,
                "lng": -5.9845,
                "max_distance_km": 10.0,
                "max_stops": 2,
            },
            format="json",
        )

    assert response.status_code == 200
    result_id = response.data["data"]["id"]
    assert OptimizationResult.objects.filter(id=result_id).exists()


@pytest.mark.django_db
def test_optimize_rejects_other_user_list(
    api_client,
    consumer_user,
    shopping_list_with_items,
    django_user_model,
):
    """POST /api/v1/optimize/ con lista de otro usuario devuelve 404."""
    other_user = django_user_model.objects.create_user(
        username="other_user",
        email="other@test.com",
        password="testpass123",
        role="consumer",
    )
    api_client.force_authenticate(user=other_user)

    response = api_client.post(
        OPTIMIZE_URL,
        data={
            "shopping_list_id": shopping_list_with_items.id,
            "lat": 37.3891,
            "lng": -5.9845,
        },
        format="json",
    )

    assert response.status_code == 404
