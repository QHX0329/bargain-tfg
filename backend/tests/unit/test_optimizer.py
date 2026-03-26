"""
Tests unitarios del modulo optimizer.

Cubre:
- solve_route: orden de nodos, respeto de max_stops, sin solucion
- OptimizeRequestSerializer: normalizacion de pesos
- optimize_shopping_list: excepcion cuando no hay tiendas
"""

from unittest.mock import MagicMock, patch

import pytest

from apps.core.exceptions import StoreNotFoundError
from apps.optimizer.serializers import OptimizeRequestSerializer
from apps.optimizer.services.solver import solve_route


# ── solve_route ────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_solve_route_returns_ordered_nodes():
    """El solver devuelve una lista no vacia que empieza en el deposito (nodo 0)."""
    # 4 nodos: 0 = usuario, 1-3 = tiendas
    n = 4
    dist = [[0.0 if i == j else 1.0 + i * 0.1 + j * 0.1 for j in range(n)] for i in range(n)]
    time = [[0.0 if i == j else 2.0 + i * 0.2 + j * 0.2 for j in range(n)] for i in range(n)]
    savings = [0.0, 0.8, 0.5, 0.3]
    weights = {"precio": 0.5, "distancia": 0.3, "tiempo": 0.2}

    route = solve_route(dist, time, savings, weights, max_stops=3)

    assert isinstance(route, list)
    assert len(route) >= 2
    assert route[0] == 0  # empieza en deposito


@pytest.mark.django_db
def test_solve_route_respects_max_stops():
    """El solver no visita mas tiendas que max_stops."""
    n = 5
    dist = [[0.0 if i == j else 1.0 for j in range(n)] for i in range(n)]
    time = [[0.0 if i == j else 2.0 for j in range(n)] for i in range(n)]
    savings = [0.0, 0.9, 0.7, 0.5, 0.3]
    weights = {"precio": 0.5, "distancia": 0.3, "tiempo": 0.2}

    route = solve_route(dist, time, savings, weights, max_stops=2)

    # Route incluye deposito al inicio y posiblemente al final
    # Los nodos visitados (excluidos los 0) deben ser <= max_stops
    store_visits = [n for n in route if n != 0]
    assert len(store_visits) <= 2


@pytest.mark.django_db
def test_solve_route_empty_when_insufficient_nodes():
    """El solver devuelve lista vacia cuando solo hay 1 nodo."""
    dist = [[0.0]]
    time = [[0.0]]
    savings = [0.0]
    weights = {"precio": 0.5, "distancia": 0.3, "tiempo": 0.2}

    route = solve_route(dist, time, savings, weights, max_stops=2)

    assert route == []


# ── OptimizeRequestSerializer ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_weight_normalization_in_serializer():
    """El serializer normaliza los pesos para que sumen exactamente 1.0."""
    data = {
        "shopping_list_id": 1,
        "lat": 37.389,
        "lng": -5.984,
        "w_precio": 0.5,
        "w_distancia": 0.3,
        "w_tiempo": 0.2,
    }
    serializer = OptimizeRequestSerializer(data=data)
    assert serializer.is_valid(), serializer.errors

    total = (
        serializer.validated_data["w_precio"]
        + serializer.validated_data["w_distancia"]
        + serializer.validated_data["w_tiempo"]
    )
    assert abs(total - 1.0) < 1e-9


@pytest.mark.django_db
def test_weight_normalization_preserves_ratios():
    """La normalizacion preserva la proporcion relativa entre pesos."""
    data = {
        "shopping_list_id": 1,
        "lat": 37.389,
        "lng": -5.984,
        "w_precio": 0.6,
        "w_distancia": 0.3,
        "w_tiempo": 0.1,
    }
    serializer = OptimizeRequestSerializer(data=data)
    assert serializer.is_valid(), serializer.errors

    vd = serializer.validated_data
    # w_precio debe ser el doble que w_distancia
    assert abs(vd["w_precio"] - 2 * vd["w_distancia"]) < 1e-9


@pytest.mark.django_db
def test_max_stops_validation_rejects_out_of_range():
    """El serializer rechaza max_stops fuera del rango [2, 5]."""
    data = {
        "shopping_list_id": 1,
        "lat": 37.389,
        "lng": -5.984,
        "max_stops": 10,
    }
    serializer = OptimizeRequestSerializer(data=data)
    assert not serializer.is_valid()
    assert "max_stops" in serializer.errors


# ── optimize_shopping_list ─────────────────────────────────────────────────────


@pytest.mark.django_db
def test_optimize_raises_no_stores_when_store_queryset_empty(consumer_user):
    """optimize_shopping_list lanza StoreNotFoundError si no hay tiendas en radio."""
    from apps.shopping_lists.models import ShoppingList, ShoppingListItem

    # Crear lista con un item textual
    shopping_list = ShoppingList.objects.create(owner=consumer_user, name="Test List")
    ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="Test Product",
        quantity=1,
        added_by=consumer_user,
    )

    # Ubicacion en el Atlantico (sin tiendas)
    with pytest.raises(StoreNotFoundError):
        from apps.optimizer.services.solver import optimize_shopping_list

        optimize_shopping_list(
            shopping_list_id=shopping_list.id,
            user_lat=0.0,
            user_lng=-30.0,
            max_distance_km=1.0,
            max_stops=2,
            weights={"precio": 0.5, "distancia": 0.3, "tiempo": 0.2},
        )
