"""
Servicio de matriz de distancias y tiempos para el optimizador.

Usa Graphhopper para distancias reales por carretera con fallback haversine
mediante PostGIS cuando Graphhopper no esta disponible.
"""

import math
from typing import Optional

import requests
import structlog

logger = structlog.get_logger(__name__)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calcula la distancia haversine en km entre dos puntos geograficos.

    Args:
        lat1: Latitud del primer punto.
        lng1: Longitud del primer punto.
        lat2: Latitud del segundo punto.
        lng2: Longitud del segundo punto.

    Returns:
        Distancia en kilometros.
    """
    R = 6371.0  # Radio de la Tierra en km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _fallback_matrices(
    points: list[tuple[float, float]],
) -> tuple[list[list[float]], list[list[float]]]:
    """
    Calcula matrices de distancia y tiempo usando haversine (ST_Distance aproximado).

    Tiempo estimado asumiendo velocidad urbana media de 40 km/h.

    Args:
        points: Lista de tuplas (lat, lng).

    Returns:
        Tupla (distance_matrix_km, time_matrix_minutes).
    """
    n = len(points)
    distance_matrix: list[list[float]] = []
    time_matrix: list[list[float]] = []

    for i in range(n):
        dist_row: list[float] = []
        time_row: list[float] = []
        for j in range(n):
            if i == j:
                dist_row.append(0.0)
                time_row.append(0.0)
            else:
                lat1, lng1 = points[i]
                lat2, lng2 = points[j]
                dist_km = _haversine_km(lat1, lng1, lat2, lng2)
                time_min = dist_km / 40.0 * 60.0  # 40 km/h velocidad urbana media
                dist_row.append(dist_km)
                time_row.append(time_min)
        distance_matrix.append(dist_row)
        time_matrix.append(time_row)

    return distance_matrix, time_matrix


def get_distance_matrix(
    points: list[tuple[float, float]],
    graphhopper_url: Optional[str] = None,
) -> tuple[list[list[float]], list[list[float]]]:
    """
    Obtiene la matriz de distancias y tiempos entre todos los puntos dados.

    Intenta usar Graphhopper para distancias reales por carretera. Si falla,
    usa calculo haversine como fallback.

    Args:
        points: Lista de tuplas (lat, lng) representando los puntos a conectar.
                El primer punto se asume como la ubicacion del usuario.
        graphhopper_url: URL base del servicio Graphhopper.
                         Por defecto lee GRAPHHOPPER_URL de settings.

    Returns:
        Tupla (distance_matrix_km, time_matrix_minutes) donde cada elemento
        [i][j] representa la distancia/tiempo de i a j.
    """
    if graphhopper_url is None:
        from django.conf import settings

        graphhopper_url = getattr(settings, "GRAPHHOPPER_URL", "http://graphhopper:8989")

    # Graphhopper espera [lng, lat], no [lat, lng]
    gh_points = [[lng, lat] for lat, lng in points]

    payload = {
        "from_points": gh_points,
        "to_points": gh_points,
        "out_arrays": ["distances", "times"],
        "vehicle": "car",
    }

    try:
        response = requests.post(
            f"{graphhopper_url}/matrix",
            json=payload,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        # Convertir distancias de metros a km y tiempos de segundos a minutos
        raw_distances = data.get("distances", [])
        raw_times = data.get("times", [])

        distance_matrix = [[d / 1000.0 for d in row] for row in raw_distances]
        time_matrix = [[t / 60.0 for t in row] for row in raw_times]

        logger.info("graphhopper_matrix_success", n_points=len(points))
        return distance_matrix, time_matrix

    except (requests.ConnectionError, requests.Timeout) as exc:
        logger.warning(
            "graphhopper_unavailable_fallback_haversine",
            error=str(exc),
            n_points=len(points),
        )
        return _fallback_matrices(points)
    except requests.HTTPError as exc:
        logger.warning(
            "graphhopper_http_error_fallback_haversine",
            status_code=exc.response.status_code if exc.response else None,
            error=str(exc),
            n_points=len(points),
        )
        return _fallback_matrices(points)
    except Exception as exc:
        logger.warning(
            "graphhopper_unexpected_error_fallback_haversine",
            error=str(exc),
            n_points=len(points),
        )
        return _fallback_matrices(points)
