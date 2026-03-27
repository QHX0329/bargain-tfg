"""Tests unitarios del módulo de tiendas."""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.gis.measure import Distance

from apps.prices.models import Price
from apps.products.models import Category, Product
from apps.stores.models import Store, StoreChain
from apps.stores.serializers import StoreListSerializer


@pytest.fixture
def mercadona_chain(db) -> StoreChain:
    return StoreChain.objects.create(name="Mercadona", slug="mercadona")


@pytest.fixture
def store_with_chain(db, seville_point, mercadona_chain) -> Store:
    return Store.objects.create(
        name="Mercadona Triana",
        chain=mercadona_chain,
        address="Calle Betis 1, Sevilla",
        location=seville_point,
        is_local_business=False,
        is_active=True,
    )


@pytest.fixture
def local_store(db, seville_point) -> Store:
    return Store.objects.create(
        name="Frutería Carmen",
        chain=None,
        address="Calle Feria 22, Sevilla",
        location=seville_point,
        is_local_business=True,
        is_active=True,
    )


class TestStoreListSerializer:
    """Tests para StoreListSerializer."""

    def test_includes_geojson_location_field(self, store_with_chain):
        """El serializer debe incluir location como GeoJSON [lng, lat]."""
        store = store_with_chain
        store.distance = Distance(m=500)

        serializer = StoreListSerializer(store)
        data = serializer.data

        assert "location" in data
        assert data["location"]["type"] == "Point"
        assert data["location"]["coordinates"] == [store.location.x, store.location.y]

    def test_includes_is_local_business_field(self, local_store):
        """El serializer debe incluir is_local_business."""
        store = local_store
        # Annotate distance manually
        store.distance = Distance(m=500)
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert "is_local_business" in data
        assert data["is_local_business"] is True

    def test_includes_chain_name_when_chain_exists(self, store_with_chain, mercadona_chain):
        """El serializer debe incluir el nombre de la cadena cuando existe."""
        store = store_with_chain
        store.distance = Distance(m=1000)
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert data["chain"] is not None
        assert data["chain"]["name"] == "Mercadona"
        assert data["chain"]["id"] == mercadona_chain.id

    def test_chain_is_null_for_local_business(self, local_store):
        """El serializer debe devolver chain=null para comercios locales."""
        store = local_store
        store.distance = Distance(m=200)
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert data["chain"] is None

    def test_distance_km_converts_meters_to_km(self, store_with_chain):
        """distance_km debe convertir metros a kilómetros correctamente."""
        store = store_with_chain
        # 2500 metros = 2.5 km
        store.distance = Distance(m=2500)
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert data["distance_km"] == 2.5

    def test_distance_km_rounds_to_2_decimals(self, store_with_chain):
        """distance_km debe redondear a 2 decimales."""
        store = store_with_chain
        # 1234.567 metros = 1.234567 km → 1.23
        store.distance = Distance(m=1234.567)
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert data["distance_km"] == 1.23

    def test_distance_km_is_none_when_no_annotation(self, store_with_chain):
        """distance_km debe devolver None si no hay anotación de distancia."""
        store = store_with_chain
        # Sin atributo distance anotado
        serializer = StoreListSerializer(store)
        data = serializer.data
        assert data["distance_km"] is None


@pytest.fixture
def store_with_google_place_id(db, seville_point) -> Store:
    """Tienda con google_place_id configurado."""
    chain = StoreChain.objects.create(name="Mercadona Cache Test", slug="mercadona-cache-test")
    return Store.objects.create(
        name="Mercadona Cache",
        chain=chain,
        address="Calle Cache 1, Sevilla",
        location=seville_point,
        is_local_business=False,
        is_active=True,
        google_place_id="ChIJcache123",
    )


class TestPlacesDetailCache:
    """Tests para el comportamiento de caché del endpoint places-detail."""

    PLACES_API_RESPONSE = {
        "currentOpeningHours": {"openNow": True},
        "rating": 4.2,
        "userRatingCount": 99,
        "websiteUri": "https://mercadona.es",
    }

    def test_places_detail_cache_hit(
        self, authenticated_client, store_with_google_place_id, settings
    ):
        """Segunda llamada al endpoint usa caché y no llama a Google API dos veces."""
        settings.GOOGLE_PLACES_API_KEY = "test-api-key"

        mock_response = MagicMock()
        mock_response.json.return_value = self.PLACES_API_RESPONSE
        mock_response.raise_for_status.return_value = None

        store_id = store_with_google_place_id.id

        with patch("apps.stores.views.http_requests.get", return_value=mock_response) as mock_get:
            # Primera llamada — llama a Google API
            response1 = authenticated_client.get(f"/api/v1/stores/{store_id}/places-detail/")
            # Segunda llamada — debe usar caché
            response2 = authenticated_client.get(f"/api/v1/stores/{store_id}/places-detail/")

        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.data["data"]["rating"] == 4.2
        assert response2.data["data"]["rating"] == 4.2
        # Google API sólo debe llamarse una vez (la segunda respuesta viene del caché)
        mock_get.assert_called_once()


class TestStoreProductsEndpoint:
    """Tests para GET /api/v1/stores/{id}/products/."""

    def test_returns_one_offer_per_product_prioritizing_non_stale(
        self, api_client, store_with_chain, seville_point
    ):
        """Debe priorizar precios no stale y evitar duplicados por producto."""
        category = Category.objects.create(name="Lácteos", slug="lacteos")
        product = Product.objects.create(
            name="Leche entera",
            normalized_name="leche entera",
            category=category,
            unit="l",
            unit_quantity=1,
            is_active=True,
        )

        # Precio stale más reciente: no debe seleccionarse si hay uno no stale.
        Price.objects.create(
            product=product,
            store=store_with_chain,
            price="1.39",
            source=Price.Source.SCRAPING,
            is_stale=True,
        )
        Price.objects.create(
            product=product,
            store=store_with_chain,
            price="1.09",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        response = api_client.get(f"/api/v1/stores/{store_with_chain.id}/products/")

        assert response.status_code == 200
        payload = response.data["data"]
        assert payload["count"] == 1
        assert len(payload["results"]) == 1
        assert payload["results"][0]["product"]["name"] == "Leche entera"
        assert payload["results"][0]["price"] == "1.09"
        assert payload["results"][0]["is_stale"] is False

        other_chain = StoreChain.objects.create(name="Dia", slug="dia")
        other_store = Store.objects.create(
            name="Dia Centro",
            chain=other_chain,
            address="Calle Sierpes 8, Sevilla",
            location=seville_point,
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=other_store,
            price="0.99",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        response_after_other_store = api_client.get(
            f"/api/v1/stores/{store_with_chain.id}/products/"
        )
        assert response_after_other_store.status_code == 200
        assert response_after_other_store.data["data"]["count"] == 1
        assert len(response_after_other_store.data["data"]["results"]) == 1

    def test_respects_limit_query_param(self, api_client, store_with_chain):
        """Debe truncar el número de ofertas al límite solicitado."""
        category = Category.objects.create(name="Despensa", slug="despensa")
        for index in range(3):
            product = Product.objects.create(
                name=f"Producto {index}",
                normalized_name=f"producto {index}",
                category=category,
                unit="units",
                unit_quantity=1,
                is_active=True,
            )
            Price.objects.create(
                product=product,
                store=store_with_chain,
                price=f"{index + 1}.00",
                source=Price.Source.SCRAPING,
                is_stale=False,
            )

        response = api_client.get(f"/api/v1/stores/{store_with_chain.id}/products/?limit=2")

        assert response.status_code == 200
        assert response.data["data"]["count"] == 3
        assert len(response.data["data"]["results"]) == 2

    def test_supports_category_filter_and_page_number(self, api_client, store_with_chain):
        """Debe filtrar por categoría y paginar por page/page_size."""
        drinks = Category.objects.create(name="Bebidas", slug="bebidas")
        snacks = Category.objects.create(name="Snacks", slug="snacks")

        prod_a = Product.objects.create(
            name="Agua 1L",
            normalized_name="agua 1l",
            category=drinks,
            unit="l",
            unit_quantity=1,
            is_active=True,
        )
        prod_b = Product.objects.create(
            name="Cola 2L",
            normalized_name="cola 2l",
            category=drinks,
            unit="l",
            unit_quantity=2,
            is_active=True,
        )
        prod_c = Product.objects.create(
            name="Patatas",
            normalized_name="patatas",
            category=snacks,
            unit="units",
            unit_quantity=1,
            is_active=True,
        )

        for product in [prod_a, prod_b, prod_c]:
            Price.objects.create(
                product=product,
                store=store_with_chain,
                price="1.50",
                source=Price.Source.SCRAPING,
                is_stale=False,
            )

        page_1 = api_client.get(
            f"/api/v1/stores/{store_with_chain.id}/products/?category={drinks.id}&page=1&page_size=1"
        )
        page_2 = api_client.get(
            f"/api/v1/stores/{store_with_chain.id}/products/?category={drinks.id}&page=2&page_size=1"
        )

        assert page_1.status_code == 200
        assert page_2.status_code == 200

        payload_1 = page_1.data["data"]
        payload_2 = page_2.data["data"]

        assert payload_1["count"] == 2
        assert payload_1["next"] is not None
        assert payload_1["previous"] is None
        assert len(payload_1["results"]) == 1

        assert payload_2["count"] == 2
        assert payload_2["next"] is None
        assert payload_2["previous"] is not None
        assert len(payload_2["results"]) == 1

        names = {
            payload_1["results"][0]["product"]["name"],
            payload_2["results"][0]["product"]["name"],
        }
        assert names == {"Agua 1L", "Cola 2L"}
