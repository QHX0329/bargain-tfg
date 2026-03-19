"""
Tests de integración para los endpoints del módulo de precios.

Cubre: compare, list-total, history, alerts, crowdsource.
"""

import pytest
from django.contrib.gis.geos import Point
from rest_framework import status

from apps.prices.models import Price, PriceAlert
from apps.products.models import Product
from apps.stores.models import Store

# Coordenadas de referencia: Plaza Nueva, Sevilla
SEVILLE_LAT = 37.3891
SEVILLE_LNG = -5.9845

# Coordenada a ~1.5 km al norte
NEARBY_LAT = 37.4027
NEARBY_LNG = -5.9845


# ── Fixtures compartidas ──────────────────────────────────────────────────────


@pytest.fixture
def product(db) -> Product:
    return Product.objects.create(name="Leche Entera 1L", normalized_name="leche entera 1l")


@pytest.fixture
def store_nearby(db) -> Store:
    return Store.objects.create(
        name="Mercadona Alameda",
        address="Alameda de Hércules 1, Sevilla",
        location=Point(NEARBY_LNG, NEARBY_LAT, srid=4326),
        is_active=True,
    )


@pytest.fixture
def store_far(db) -> Store:
    """Tienda a ~30 km — fuera del radio por defecto."""
    return Store.objects.create(
        name="Supermercado Lejano",
        address="Huelva",
        location=Point(-6.95, 37.26, srid=4326),
        is_active=True,
    )


@pytest.fixture
def price_nearby(db, product, store_nearby) -> Price:
    return Price.objects.create(
        product=product,
        store=store_nearby,
        price="1.29",
        source=Price.Source.SCRAPING,
        is_stale=False,
    )


@pytest.fixture
def price_stale(db, product, store_nearby) -> Price:
    from datetime import timedelta

    from django.utils import timezone

    old_verified = timezone.now() - timedelta(hours=72)
    p = Price.objects.create(
        product=product,
        store=store_nearby,
        price="1.10",
        source=Price.Source.SCRAPING,
        is_stale=True,
    )
    Price.objects.filter(pk=p.pk).update(verified_at=old_verified)
    p.refresh_from_db()
    return p


# ── TestPriceCompare ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPriceCompare:
    """Tests para GET /api/v1/prices/compare/"""

    def test_compare_returns_prices_for_product(self, api_client, product, price_nearby):
        url = f"/api/v1/prices/compare/?product={product.id}&lat={SEVILLE_LAT}&lng={SEVILLE_LNG}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
        entry = data["data"][0]
        assert entry["store_id"] == price_nearby.store_id
        assert "price" in entry
        assert "is_stale" in entry
        assert "distance_km" in entry

    def test_compare_missing_product_param_400(self, api_client):
        url = f"/api/v1/prices/compare/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "MISSING_PRODUCT"

    def test_compare_includes_is_stale_flag(self, api_client, product, price_stale):
        """Los resultados incluyen el indicador is_stale."""
        url = f"/api/v1/prices/compare/?product={product.id}&lat={SEVILLE_LAT}&lng={SEVILLE_LNG}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        entries = data["data"]
        assert len(entries) >= 1
        # Verificar que el campo is_stale está presente en todos los resultados
        for entry in entries:
            assert "is_stale" in entry

    def test_compare_excludes_stores_outside_radius(
        self, api_client, product, price_nearby, store_far
    ):
        """Tiendas fuera del radio no aparecen en los resultados."""
        Price.objects.create(
            product=product,
            store=store_far,
            price="0.99",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )
        url = f"/api/v1/prices/compare/?product={product.id}&lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius=5"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        store_ids = [e["store_id"] for e in response.json()["data"]]
        assert store_far.id not in store_ids

    def test_compare_without_location_returns_all_prices(self, api_client, product, price_nearby):
        """Sin lat/lng devuelve precios de todas las tiendas."""
        url = f"/api/v1/prices/compare/?product={product.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["data"]) >= 1


# ── TestListTotal ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestListTotal:
    """Tests para GET /api/v1/prices/list-total/"""

    @pytest.fixture
    def shopping_list_with_items(self, db, consumer_user, product, store_nearby):
        from apps.shopping_lists.models import ShoppingList, ShoppingListItem

        sl = ShoppingList.objects.create(owner=consumer_user, name="Lista Test")
        ShoppingListItem.objects.create(shopping_list=sl, product=product, quantity=2)
        return sl

    def test_list_total_calculates_correctly(
        self, authenticated_client, shopping_list_with_items, store_nearby, product, consumer_user
    ):
        Price.objects.create(
            product=product,
            store=store_nearby,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )
        url = f"/api/v1/prices/list-total/?list={shopping_list_with_items.id}&store={store_nearby.id}"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total"] == "3.00"  # 2 * 1.50
        assert data["data"]["store_id"] == store_nearby.id
        assert data["data"]["missing_items"] == []

    def test_list_total_reports_missing_items(
        self, authenticated_client, shopping_list_with_items, store_nearby
    ):
        """Ítems sin precio en la tienda se reportan como missing_items."""
        # No creamos precio para el producto
        url = f"/api/v1/prices/list-total/?list={shopping_list_with_items.id}&store={store_nearby.id}"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "Leche Entera 1L" in data["data"]["missing_items"]
        assert data["data"]["total"] == "0.00"

    def test_list_total_requires_authentication(self, api_client, store_nearby):
        url = f"/api/v1/prices/list-total/?list=1&store={store_nearby.id}"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_total_missing_params_400(self, authenticated_client):
        response = authenticated_client.get("/api/v1/prices/list-total/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_total_uses_offer_price_when_available(
        self, authenticated_client, shopping_list_with_items, store_nearby, product
    ):
        """Si hay offer_price, se usa ese en lugar del precio normal."""
        Price.objects.create(
            product=product,
            store=store_nearby,
            price="2.00",
            offer_price="1.20",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )
        url = f"/api/v1/prices/list-total/?list={shopping_list_with_items.id}&store={store_nearby.id}"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # 2 items * 1.20 offer = 2.40
        assert response.json()["data"]["total"] == "2.40"


# ── TestPriceHistory ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPriceHistory:
    """Tests para GET /api/v1/prices/{product_id}/history/"""

    def test_history_returns_daily_aggregates(self, api_client, product, store_nearby):
        """El endpoint devuelve agregados diarios con min/max/avg."""
        Price.objects.create(
            product=product,
            store=store_nearby,
            price="1.20",
            source=Price.Source.SCRAPING,
        )
        Price.objects.create(
            product=product,
            store=store_nearby,
            price="1.50",
            source=Price.Source.SCRAPING,
        )

        url = f"/api/v1/prices/{product.id}/history/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        results = data["data"]
        assert len(results) >= 1
        entry = results[0]
        assert "day" in entry
        assert "min_price" in entry
        assert "max_price" in entry
        assert "avg_price" in entry
        assert "store_id" in entry

    def test_history_90day_window(self, api_client, product, store_nearby):
        """Solo se devuelven precios de los últimos 90 días."""
        from datetime import timedelta

        from django.utils import timezone

        # Precio dentro del rango
        Price.objects.create(
            product=product,
            store=store_nearby,
            price="1.50",
            source=Price.Source.SCRAPING,
        )
        # Precio fuera del rango (91 días atrás)
        old_price = Price.objects.create(
            product=product,
            store=store_nearby,
            price="0.50",
            source=Price.Source.SCRAPING,
        )
        old_date = timezone.now() - timedelta(days=91)
        Price.objects.filter(pk=old_price.pk).update(verified_at=old_date)

        url = f"/api/v1/prices/{product.id}/history/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        results = response.json()["data"]
        # No debe aparecer el precio muy antiguo en los resultados actuales
        # (min_price en el día de hoy no debería ser 0.50)
        for entry in results:
            assert float(entry["min_price"]) >= 1.0

    def test_history_empty_for_unknown_product(self, api_client):
        """Producto sin precios devuelve lista vacía."""
        url = "/api/v1/prices/99999/history/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"] == []


# ── TestPriceAlerts ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPriceAlerts:
    """Tests para /api/v1/prices/alerts/"""

    def test_create_alert(self, authenticated_client, product):
        """POST crea alerta y devuelve 201."""
        data = {"product": product.id, "target_price": "2.00"}
        response = authenticated_client.post("/api/v1/prices/alerts/", data)

        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["id"] is not None
        assert body["is_active"] is True
        assert body["triggered_at"] is None

    def test_create_alert_requires_auth(self, api_client, product):
        data = {"product": product.id, "target_price": "2.00"}
        response = api_client.post("/api/v1/prices/alerts/", data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_destroy_alert_deactivates_not_deletes(
        self, authenticated_client, consumer_user, product
    ):
        """DELETE desactiva la alerta en lugar de eliminarla de la BD."""
        alert = PriceAlert.objects.create(
            user=consumer_user,
            product=product,
            target_price="1.50",
            is_active=True,
        )

        response = authenticated_client.delete(f"/api/v1/prices/alerts/{alert.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        alert.refresh_from_db()
        # Sigue existiendo pero inactiva
        assert PriceAlert.objects.filter(pk=alert.pk).exists()
        assert alert.is_active is False

    def test_list_alerts_only_own(
        self, authenticated_client, consumer_user, product, db, django_user_model
    ):
        """El usuario solo ve sus propias alertas."""
        other_user = django_user_model.objects.create_user(
            username="other_alert_user",
            email="other_alert@test.com",
            password="pass",
        )
        PriceAlert.objects.create(user=consumer_user, product=product, target_price="1.00")
        PriceAlert.objects.create(user=other_user, product=product, target_price="2.00")

        response = authenticated_client.get("/api/v1/prices/alerts/")

        assert response.status_code == status.HTTP_200_OK
        ids = [a["id"] for a in response.json()["results"]]
        assert len(ids) == 1

    def test_patch_alert_updates_target_price(self, authenticated_client, consumer_user, product):
        """PATCH permite actualizar target_price de una alerta activa."""
        alert = PriceAlert.objects.create(
            user=consumer_user,
            product=product,
            target_price="1.50",
            is_active=True,
        )

        response = authenticated_client.patch(
            f"/api/v1/prices/alerts/{alert.id}/",
            {"target_price": "1.20"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert float(body["target_price"]) == 1.20

        alert.refresh_from_db()
        assert float(alert.target_price) == 1.20


# ── TestCrowdsource ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCrowdsource:
    """Tests para POST /api/v1/prices/crowdsource/"""

    def test_crowdsource_creates_price_with_source_crowdsourcing(
        self, authenticated_client, product, store_nearby
    ):
        """El precio creado tiene source=crowdsourcing y confidence_weight=0.5."""
        data = {"product": product.id, "store": store_nearby.id, "price": "1.85"}
        response = authenticated_client.post("/api/v1/prices/crowdsource/", data)

        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["data"]["source"] == "crowdsourcing"
        assert float(body["data"]["confidence_weight"]) == 0.5
        assert body["data"]["is_stale"] is False

    def test_crowdsource_requires_auth(self, api_client, product, store_nearby):
        data = {"product": product.id, "store": store_nearby.id, "price": "1.85"}
        response = api_client.post("/api/v1/prices/crowdsource/", data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_crowdsource_creates_price_in_db(self, authenticated_client, product, store_nearby):
        """El precio crowdsourced se guarda en la BD."""
        data = {"product": product.id, "store": store_nearby.id, "price": "2.10"}
        authenticated_client.post("/api/v1/prices/crowdsource/", data)

        price = Price.objects.filter(
            product=product,
            store=store_nearby,
            source=Price.Source.CROWDSOURCING,
        ).first()
        assert price is not None
        assert str(price.price) == "2.10"
        assert price.confidence_weight == 0.5
