"""Tests de integración para los endpoints del módulo de tiendas."""

import pytest
from django.contrib.gis.geos import Point
from rest_framework import status

from apps.stores.models import Store, StoreChain, UserFavoriteStore

# Coordenadas de referencia: Plaza Nueva, Sevilla
SEVILLE_LAT = 37.3891
SEVILLE_LNG = -5.9845

# Punto a ~1.5 km al norte de Plaza Nueva
NEARBY_LAT = 37.4027
NEARBY_LNG = -5.9845

# Punto a ~8 km del centro (Parque Alcosa)
FAR_LAT = 37.3622
FAR_LNG = -5.9135


@pytest.fixture
def mercadona_chain(db) -> StoreChain:
    return StoreChain.objects.create(name="Mercadona", slug="mercadona")


@pytest.fixture
def store_nearby(db, mercadona_chain) -> Store:
    """Tienda a ~1.5 km del centro de Sevilla."""
    return Store.objects.create(
        name="Mercadona Alameda",
        chain=mercadona_chain,
        address="Alameda de Hércules 1, Sevilla",
        location=Point(NEARBY_LNG, NEARBY_LAT, srid=4326),
        is_active=True,
    )


@pytest.fixture
def store_far(db) -> Store:
    """Tienda a ~8 km del centro de Sevilla."""
    return Store.objects.create(
        name="Carrefour Alcosa",
        chain=None,
        address="Av. Alcosa 1, Sevilla",
        location=Point(FAR_LNG, FAR_LAT, srid=4326),
        is_local_business=True,
        is_active=True,
    )


@pytest.fixture
def store_seville_center(db, mercadona_chain) -> Store:
    """Tienda en el centro mismo de Sevilla (0 km)."""
    return Store.objects.create(
        name="Mercadona Centro",
        chain=mercadona_chain,
        address="Plaza Nueva 1, Sevilla",
        location=Point(SEVILLE_LNG, SEVILLE_LAT, srid=4326),
        is_active=True,
    )


class TestNearbyStores:
    """Tests para el endpoint de tiendas cercanas."""

    def test_nearby_stores_returns_ordered_by_distance(
        self, authenticated_client, store_seville_center, store_nearby
    ):
        """Las tiendas deben devolverse ordenadas por distancia ascendente."""
        response = authenticated_client.get(f"/api/v1/stores/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}")
        assert response.status_code == status.HTTP_200_OK
        data = response.data["results"]
        assert len(data) >= 2
        # La tienda más cercana al origen (centro) debe ir primera
        distances = [s["distance_km"] for s in data]
        assert distances == sorted(distances), "Las tiendas no están ordenadas por distancia"
        # La tienda del centro debe ir antes que la de Alameda
        names = [s["name"] for s in data]
        assert names.index("Mercadona Centro") < names.index("Mercadona Alameda")

    def test_missing_location_params_returns_400(self, authenticated_client):
        """Sin lat/lng, la API debe devolver 400 con código MISSING_LOCATION."""
        response = authenticated_client.get("/api/v1/stores/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False
        assert response.data["error"]["code"] == "MISSING_LOCATION"

    def test_missing_lat_only_returns_400(self, authenticated_client):
        """Sin lat (solo lng), la API debe devolver 400."""
        response = authenticated_client.get(f"/api/v1/stores/?lng={SEVILLE_LNG}")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_lng_only_returns_400(self, authenticated_client):
        """Sin lng (solo lat), la API debe devolver 400."""
        response = authenticated_client.get(f"/api/v1/stores/?lat={SEVILLE_LAT}")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_radius_param_filters_correctly(
        self, authenticated_client, store_seville_center, store_nearby, store_far
    ):
        """radius_km=2 debe excluir la tienda lejana (8 km) y la tienda a 1.5 km."""
        # Sólo la del centro (~0 km) queda dentro de 1 km
        response = authenticated_client.get(
            f"/api/v1/stores/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=1"
        )
        assert response.status_code == status.HTTP_200_OK
        names = [s["name"] for s in response.data["results"]]
        assert "Mercadona Centro" in names
        assert "Mercadona Alameda" not in names
        assert "Carrefour Alcosa" not in names

    def test_response_includes_distance_km_field(self, authenticated_client, store_seville_center):
        """Cada tienda en el listado debe incluir distance_km."""
        response = authenticated_client.get(f"/api/v1/stores/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}")
        assert response.status_code == status.HTTP_200_OK
        store = response.data["results"][0]
        assert "distance_km" in store
        assert store["distance_km"] is not None

    def test_response_includes_is_local_business_field(self, authenticated_client, store_far):
        """Cada tienda debe incluir is_local_business."""
        response = authenticated_client.get(
            f"/api/v1/stores/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=15"
        )
        assert response.status_code == status.HTTP_200_OK
        carrefour = next(
            (s for s in response.data["results"] if s["name"] == "Carrefour Alcosa"),
            None,
        )
        assert carrefour is not None
        assert carrefour["is_local_business"] is True

    def test_response_includes_location_geojson(self, authenticated_client, store_seville_center):
        """Cada tienda debe incluir location GeoJSON para renderizar markers."""
        response = authenticated_client.get(f"/api/v1/stores/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}")
        assert response.status_code == status.HTTP_200_OK

        store = response.data["results"][0]
        assert "location" in store
        assert store["location"] is not None
        assert store["location"]["type"] == "Point"
        assert len(store["location"]["coordinates"]) == 2


class TestStoreDetail:
    """Tests para el endpoint de detalle de tienda."""

    def test_store_detail_includes_chain_and_hours(
        self, authenticated_client, store_nearby, mercadona_chain
    ):
        """El detalle debe incluir chain con id/name y opening_hours."""
        response = authenticated_client.get(
            f"/api/v1/stores/{store_nearby.id}/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=10"
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["chain"]["name"] == "Mercadona"
        assert "opening_hours" in data

    def test_is_favorite_false_when_not_favorited(self, authenticated_client, store_nearby):
        """is_favorite debe ser False cuando el usuario no la ha favoriteado."""
        response = authenticated_client.get(
            f"/api/v1/stores/{store_nearby.id}/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=10"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_favorite"] is False

    def test_detail_works_without_location_params(self, authenticated_client, store_nearby):
        """El endpoint de detalle debe funcionar sin lat/lng — lookup por PK directo."""
        response = authenticated_client.get(f"/api/v1/stores/{store_nearby.id}/")
        # retrieve no aplica filtro geoespacial, sólo busca por PK → 200
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Mercadona Alameda"

    def test_detail_with_location_params_returns_200(self, authenticated_client, store_nearby):
        """El detalle con lat/lng debe devolver 200."""
        response = authenticated_client.get(
            f"/api/v1/stores/{store_nearby.id}/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=10"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Mercadona Alameda"


class TestFavorites:
    """Tests para el endpoint de favoritos."""

    def test_toggle_favorite_adds_favorite(
        self, authenticated_client, consumer_user, store_nearby
    ):
        """POST /favorite/ debe crear el favorito y devolver is_favorite=true."""
        response = authenticated_client.post(
            f"/api/v1/stores/{store_nearby.id}/favorite/",
            data={},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["is_favorite"] is True
        assert UserFavoriteStore.objects.filter(user=consumer_user, store=store_nearby).exists()

    def test_toggle_favorite_again_removes_favorite(
        self, authenticated_client, consumer_user, store_nearby
    ):
        """POST /favorite/ dos veces debe eliminar el favorito y devolver is_favorite=false."""
        # Añadir primero
        UserFavoriteStore.objects.create(user=consumer_user, store=store_nearby)

        response = authenticated_client.post(
            f"/api/v1/stores/{store_nearby.id}/favorite/",
            data={},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["is_favorite"] is False
        assert not UserFavoriteStore.objects.filter(
            user=consumer_user, store=store_nearby
        ).exists()

    def test_favorite_unauthenticated_returns_401(self, api_client, store_nearby):
        """Un usuario no autenticado debe recibir 401 al intentar favoritar."""
        response = api_client.post(
            f"/api/v1/stores/{store_nearby.id}/favorite/",
            data={},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_detail_shows_is_favorite_true_after_favoriting(
        self, authenticated_client, consumer_user, store_nearby
    ):
        """is_favorite en el detalle debe ser True tras favoritar la tienda."""
        UserFavoriteStore.objects.create(user=consumer_user, store=store_nearby)

        response = authenticated_client.get(
            f"/api/v1/stores/{store_nearby.id}/?lat={SEVILLE_LAT}&lng={SEVILLE_LNG}&radius_km=10"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_favorite"] is True
