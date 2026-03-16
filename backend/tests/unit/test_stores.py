"""Tests unitarios del módulo de tiendas."""

import pytest
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance

from apps.stores.models import Store, StoreChain
from apps.stores.serializers import StoreDetailSerializer, StoreListSerializer


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
