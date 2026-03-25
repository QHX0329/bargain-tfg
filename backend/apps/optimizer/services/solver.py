"""
Motor de optimizacion de rutas multicriterio para BargAIn.

Usa OR-Tools para resolver el problema TSP (Traveling Salesman Problem)
con restricciones de numero de paradas y funcion de coste multicriterio
que pondera precio, distancia y tiempo segun las preferencias del usuario.

Formula de scoring (CLAUDE.md D-08):
    Score = w_precio * ahorro_normalizado
          - w_distancia * distancia_extra_normalizada
          - w_tiempo * tiempo_extra_normalizado
"""

import structlog
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

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

    Args:
        distance_matrix: Matriz n x n de distancias en km (nodo 0 = usuario).
        time_matrix: Matriz n x n de tiempos en minutos.
        price_savings: Lista de ahorro normalizado [0, 1] por nodo (index 0 = usuario = 0).
        weights: Diccionario con claves "precio", "distancia", "tiempo".
        max_stops: Numero maximo de tiendas a visitar (sin contar el deposito).

    Returns:
        Lista ordenada de indices de nodos a visitar (incluye 0 como inicio/fin).
        Lista vacia si no se encuentra solucion.
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
        # Multiplicamos por 1000 para pasar a enteros (OR-Tools requiere enteros)
        return int((dist_score + time_score - price_bonus) * 1000)

    transit_callback_index = routing.RegisterTransitCallback(arc_cost)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Dimension de conteo de paradas para respetar max_stops
    def count_callback(from_idx: int, to_idx: int) -> int:
        from_node = manager.IndexToNode(from_idx)
        # Contar transiciones desde nodos que no son el deposito
        return 1 if from_node != 0 else 0

    count_callback_index = routing.RegisterTransitCallback(count_callback)
    routing.AddDimension(
        count_callback_index,
        0,          # sin slack
        max_stops,  # capacidad maxima = max_stops
        True,       # empieza acumulado en cero
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

    # Extraer la ruta de la solucion
    route: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route.append(node)
        index = solution.Value(routing.NextVar(index))
    route.append(manager.IndexToNode(index))  # nodo final (deposito)

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
    Orquesta el proceso completo de optimizacion de lista de la compra.

    Args:
        shopping_list_id: ID de la ShoppingList a optimizar.
        user_lat: Latitud del usuario.
        user_lng: Longitud del usuario.
        max_distance_km: Radio maximo de busqueda en km.
        max_stops: Numero maximo de tiendas a visitar.
        weights: Diccionario con "precio", "distancia", "tiempo" (suma = 1.0).

    Returns:
        Diccionario con total_price, total_distance_km, estimated_time_minutes y route_data.

    Raises:
        StoreNotFoundError: Si no hay tiendas con precios dentro del radio.
    """
    from decimal import Decimal

    from apps.core.exceptions import StoreNotFoundError
    from apps.prices.models import Price
    from apps.shopping_lists.models import ShoppingListItem
    from apps.stores.models import Store

    from .distance import get_distance_matrix

    # 1. Obtener items no marcados de la lista
    items = list(
        ShoppingListItem.objects.filter(
            shopping_list_id=shopping_list_id,
            is_checked=False,
        ).select_related("product")
    )
    products = [item.product for item in items]

    if not products:
        raise StoreNotFoundError(
            detail="La lista de la compra no tiene productos activos.",
        )

    # 2. Tiendas candidatas dentro del radio
    user_point = Point(user_lng, user_lat, srid=4326)
    candidate_stores = list(
        Store.objects.filter(
            location__distance_lte=(user_point, D(km=max_distance_km)),
            is_active=True,
        ).select_related("chain")
    )

    if not candidate_stores:
        raise StoreNotFoundError(
            detail="OPTIMIZER_NO_STORES_IN_RADIUS",
        )

    # 3. Obtener precios por tienda
    store_prices: dict[int, dict] = {}  # store_id -> {product_id -> Price}
    all_prices = Price.objects.filter(
        product__in=products,
        store__in=candidate_stores,
        is_stale=False,
    ).select_related("product", "store")

    for price_obj in all_prices:
        sid = price_obj.store_id
        pid = price_obj.product_id
        if sid not in store_prices:
            store_prices[sid] = {}
        # Guardar el precio mas reciente si hay duplicados
        if pid not in store_prices[sid] or price_obj.verified_at > store_prices[sid][pid].verified_at:
            store_prices[sid][pid] = price_obj

    # 4. Filtrar tiendas que tienen al menos 1 producto de la lista
    valid_stores = [s for s in candidate_stores if s.id in store_prices and store_prices[s.id]]

    if not valid_stores:
        raise StoreNotFoundError(
            detail="OPTIMIZER_NO_STORES_IN_RADIUS",
        )

    # 5. Calcular ahorro por tienda (para cada producto, ahorro = precio_max - precio_tienda)
    product_ids = [p.id for p in products]

    # Precio maximo disponible por producto entre todas las tiendas validas
    max_price_per_product: dict[int, Decimal] = {}
    for sid, prices_dict in store_prices.items():
        if sid not in [s.id for s in valid_stores]:
            continue
        for pid, price_obj in prices_dict.items():
            effective_price = price_obj.offer_price if price_obj.offer_price else price_obj.price
            if pid not in max_price_per_product or effective_price > max_price_per_product[pid]:
                max_price_per_product[pid] = effective_price

    raw_savings: list[float] = []
    store_product_data: list[list[dict]] = []  # por tienda, lista de productos con precio

    for store in valid_stores:
        prices_dict = store_prices.get(store.id, {})
        savings = 0.0
        products_in_store: list[dict] = []
        for product in products:
            pid = product.id
            if pid in prices_dict:
                price_obj = prices_dict[pid]
                effective_price = price_obj.offer_price if price_obj.offer_price else price_obj.price
                max_p = max_price_per_product.get(pid, effective_price)
                saving = float(max_p - effective_price)
                savings += max(saving, 0.0)
                products_in_store.append({
                    "product_id": product.id,
                    "name": product.name,
                    "price": float(effective_price),
                })
        raw_savings.append(savings)
        store_product_data.append(products_in_store)

    # Normalizar ahorros a [0, 1]
    max_saving = max(raw_savings) if raw_savings else 0.0
    if max_saving > 0:
        normalized_savings = [s / max_saving for s in raw_savings]
    else:
        normalized_savings = [0.0] * len(raw_savings)

    # 6. Construir lista de puntos: [usuario] + [tiendas validas]
    points: list[tuple[float, float]] = [(user_lat, user_lng)]
    for store in valid_stores:
        points.append((store.location.y, store.location.x))

    # Ahorro del nodo 0 (usuario/deposito) = 0
    price_savings_with_depot = [0.0] + normalized_savings

    # 7. Obtener matrices de distancia y tiempo
    distance_matrix, time_matrix = get_distance_matrix(points)

    # Normalizar matrices a [0, 1]
    flat_dist = [d for row in distance_matrix for d in row if d > 0]
    max_dist = max(flat_dist) if flat_dist else 1.0
    norm_dist = [[d / max_dist for d in row] for row in distance_matrix]

    flat_time = [t for row in time_matrix for t in row if t > 0]
    max_time = max(flat_time) if flat_time else 1.0
    norm_time = [[t / max_time for t in row] for row in time_matrix]

    # 8. Resolver con OR-Tools
    effective_max_stops = min(max_stops, len(valid_stores))
    route_indices = solve_route(
        norm_dist,
        norm_time,
        price_savings_with_depot,
        weights,
        effective_max_stops,
    )

    if not route_indices:
        # Sin solucion OR-Tools, devolvemos las primeras effective_max_stops tiendas
        route_indices = [0] + list(range(1, effective_max_stops + 1)) + [0]

    # 9. Construir route_data con las tiendas visitadas (excluir deposito 0)
    visited_store_indices = [i for i in route_indices if i != 0]
    # Eliminar duplicados manteniendo orden
    seen: set[int] = set()
    unique_store_indices: list[int] = []
    for idx in visited_store_indices:
        if idx not in seen:
            seen.add(idx)
            unique_store_indices.append(idx)

    route_data: list[dict] = []
    total_price = Decimal("0.00")
    total_distance_km = 0.0
    estimated_time_minutes = 0.0

    prev_node = 0  # empieza en usuario
    for store_idx in unique_store_indices:
        real_store_idx = store_idx - 1  # ajuste porque el nodo 0 es el usuario
        if real_store_idx < 0 or real_store_idx >= len(valid_stores):
            continue
        store = valid_stores[real_store_idx]
        products_in_store = store_product_data[real_store_idx]
        dist_from_prev = distance_matrix[prev_node][store_idx]
        time_from_prev = time_matrix[prev_node][store_idx]

        chain_name = store.chain.name if store.chain else "Local"
        stop_data = {
            "store_id": store.id,
            "store_name": store.name,
            "chain": chain_name,
            "lat": store.location.y,
            "lng": store.location.x,
            "distance_km": round(dist_from_prev, 3),
            "time_minutes": round(time_from_prev, 1),
            "products": products_in_store,
        }
        route_data.append(stop_data)

        for p_data in products_in_store:
            total_price += Decimal(str(p_data["price"]))
        total_distance_km += dist_from_prev
        estimated_time_minutes += time_from_prev
        prev_node = store_idx

    return {
        "total_price": total_price,
        "total_distance_km": round(total_distance_km, 3),
        "estimated_time_minutes": round(estimated_time_minutes, 1),
        "route_data": route_data,
    }
