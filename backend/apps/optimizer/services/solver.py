"""
Motor de optimizacion de rutas multicriterio para BargAIn.

La seleccion de productos se hace sobre texto libre de la lista:
1. Para cada string se buscan candidatos fuzzy por similitud.
2. Se toman los 3 mejores candidatos.
3. Se elige el mas barato de esos candidatos.
4. La ruta se ordena sobre las tiendas resultantes.
"""

from __future__ import annotations

from decimal import Decimal

import structlog
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

from .matching import resolve_list_items

logger = structlog.get_logger(__name__)


def solve_route(
    distance_matrix: list[list[float]],
    time_matrix: list[list[float]],
    price_savings: list[float],
    weights: dict[str, float],
    max_stops: int,
) -> list[int]:
    """
    Resuelve el TSP multicriterio usando OR-Tools.

    El nodo 0 es siempre el deposito (ubicacion del usuario). Los nodos 1..n
    son las tiendas candidatas. El solver minimiza el coste ponderado de la ruta.
    """

    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        logger.error("ortools_not_installed")
        return []

    n = len(distance_matrix)
    if n < 2:
        logger.warning("solve_route_insufficient_nodes", n=n)
        return []

    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    w_dist = weights.get("distancia", 0.3)
    w_time = weights.get("tiempo", 0.2)
    w_price = weights.get("precio", 0.5)

    def arc_cost(from_idx: int, to_idx: int) -> int:
        from_node = manager.IndexToNode(from_idx)
        to_node = manager.IndexToNode(to_idx)
        dist_score = w_dist * distance_matrix[from_node][to_node]
        time_score = w_time * time_matrix[from_node][to_node]
        price_bonus = w_price * price_savings[to_node]
        return int((dist_score + time_score - price_bonus) * 1000)

    transit_callback_index = routing.RegisterTransitCallback(arc_cost)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def count_callback(from_idx: int, to_idx: int) -> int:
        from_node = manager.IndexToNode(from_idx)
        return 1 if from_node != 0 else 0

    count_callback_index = routing.RegisterTransitCallback(count_callback)
    routing.AddDimension(
        count_callback_index,
        0,
        max_stops,
        True,
        "stop_count",
    )

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_params)
    if not solution:
        logger.warning("solve_route_no_solution_found", n_nodes=n, max_stops=max_stops)
        return []

    route: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    route.append(manager.IndexToNode(index))

    logger.info("solve_route_success", route=route, n_stops=len(route) - 2)
    return route


def optimize_shopping_list(
    shopping_list_id: int,
    user_lat: float,
    user_lng: float,
    max_distance_km: float,
    max_stops: int,
    weights: dict[str, float],
) -> dict:
    """
    Optimiza una lista textual buscando coincidencias fuzzy en productos reales.
    """

    from apps.core.exceptions import StoreNotFoundError
    from apps.shopping_lists.models import ShoppingListItem
    from apps.stores.models import Store

    from .distance import get_distance_matrix

    items = list(
        ShoppingListItem.objects.filter(
            shopping_list_id=shopping_list_id,
            is_checked=False,
        ).order_by("created_at")
    )
    if not items:
        raise StoreNotFoundError(detail="La lista de la compra no tiene items activos.")

    user_point = Point(user_lng, user_lat, srid=4326)
    candidate_stores = list(
        Store.objects.filter(
            location__distance_lte=(user_point, D(km=max_distance_km)),
            is_active=True,
        ).select_related("chain")
    )
    if not candidate_stores:
        raise StoreNotFoundError(detail="OPTIMIZER_NO_STORES_IN_RADIUS")

    resolution = resolve_list_items(items, candidate_stores, max_stops=max_stops)
    assignments = resolution["assignments"]
    if not assignments:
        raise StoreNotFoundError(
            detail="No se encontraron coincidencias de precio para los items de la lista."
        )
    if resolution["unmatched_items"]:
        raise StoreNotFoundError(
            detail=(
                "No se encontraron coincidencias para: "
                + ", ".join(resolution["unmatched_items"])
            )
        )

    selected_stores = [
        store for store in candidate_stores if store.id in resolution["selected_store_ids"]
    ]
    store_index_map = {store.id: index + 1 for index, store in enumerate(selected_stores)}
    assignments_by_store: dict[int, list] = {}
    for assignment in assignments:
        assignments_by_store.setdefault(assignment.price_obj.store_id, []).append(assignment)

    raw_savings = [float(resolution["savings_by_store"].get(store.id, Decimal("0.00"))) for store in selected_stores]
    max_saving = max(raw_savings) if raw_savings else 0.0
    normalized_savings = [saving / max_saving if max_saving > 0 else 0.0 for saving in raw_savings]

    points: list[tuple[float, float]] = [(user_lat, user_lng)]
    for store in selected_stores:
        points.append((store.location.y, store.location.x))

    distance_matrix, time_matrix = get_distance_matrix(points)
    flat_dist = [value for row in distance_matrix for value in row if value > 0]
    max_dist = max(flat_dist) if flat_dist else 1.0
    norm_dist = [[value / max_dist for value in row] for row in distance_matrix]

    flat_time = [value for row in time_matrix for value in row if value > 0]
    max_time = max(flat_time) if flat_time else 1.0
    norm_time = [[value / max_time for value in row] for row in time_matrix]

    route_indices = solve_route(
        norm_dist,
        norm_time,
        [0.0] + normalized_savings,
        weights,
        max(len(selected_stores), 1),
    )
    if not route_indices:
        route_indices = [0] + list(range(1, len(selected_stores) + 1)) + [0]

    visited_store_indices = []
    seen_indices: set[int] = set()
    for index in route_indices:
        if index == 0 or index in seen_indices:
            continue
        seen_indices.add(index)
        visited_store_indices.append(index)

    route_data: list[dict] = []
    total_price = Decimal("0.00")
    total_distance_km = 0.0
    estimated_time_minutes = 0.0
    prev_node = 0

    for route_index in visited_store_indices:
        store = selected_stores[route_index - 1]
        store_assignments = assignments_by_store.get(store.id, [])
        dist_from_prev = distance_matrix[prev_node][route_index]
        time_from_prev = time_matrix[prev_node][route_index]

        products = [assignment.as_route_product() for assignment in store_assignments]
        subtotal = sum((assignment.extended_price for assignment in store_assignments), Decimal("0.00"))
        total_price += subtotal
        total_distance_km += dist_from_prev
        estimated_time_minutes += time_from_prev

        route_data.append(
            {
                "store_id": store.id,
                "store_name": store.name,
                "chain": store.chain.name if store.chain else "Local",
                "lat": store.location.y,
                "lng": store.location.x,
                "distance_km": round(dist_from_prev, 3),
                "time_minutes": round(time_from_prev, 1),
                "products": products,
            }
        )
        prev_node = store_index_map[store.id]

    return {
        "total_price": total_price,
        "total_distance_km": round(total_distance_km, 3),
        "estimated_time_minutes": round(estimated_time_minutes, 1),
        "route_data": route_data,
    }
