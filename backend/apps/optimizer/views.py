"""
Vistas del modulo optimizer.

Expone el endpoint POST /api/v1/optimize/ para calcular la ruta
de compra optima multicriterio.
"""

import structlog
from django.contrib.gis.geos import Point
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import OptimizationError, StoreNotFoundError

from .models import OptimizationResult
from .serializers import OptimizeRequestSerializer, OptimizeResponseSerializer
from .services.solver import optimize_shopping_list

logger = structlog.get_logger(__name__)


class OptimizeView(APIView):
    """
    POST /api/v1/optimize/

    Calcula la ruta optima de compra para la lista indicada segun
    la ubicacion y preferencias del usuario.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """
        Ejecuta el algoritmo de optimizacion multicriterio.

        Args:
            request: Peticion con shopping_list_id, lat, lng y parametros opcionales.

        Returns:
            Response con el resultado de la optimizacion o error apropiado.
        """
        serializer = OptimizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        shopping_list_id = data["shopping_list_id"]

        # Verificar que la lista pertenece al usuario autenticado
        from apps.shopping_lists.models import ShoppingList

        shopping_list = get_object_or_404(
            ShoppingList,
            id=shopping_list_id,
            owner=request.user,
        )

        lat = data["lat"]
        lng = data["lng"]
        max_distance_km = data["max_distance_km"]
        max_stops = data["max_stops"]
        weights = {
            "precio": data["w_precio"],
            "distancia": data["w_distancia"],
            "tiempo": data["w_tiempo"],
        }

        try:
            result = optimize_shopping_list(
                shopping_list_id=shopping_list_id,
                user_lat=lat,
                user_lng=lng,
                max_distance_km=max_distance_km,
                max_stops=max_stops,
                weights=weights,
            )
        except StoreNotFoundError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "OPTIMIZER_NO_STORES_IN_RADIUS",
                        "message": (
                            "No hay tiendas en tu radio de busqueda. "
                            "Prueba ampliando el radio."
                        ),
                        "details": {},
                    },
                },
                status=404,
            )
        except OptimizationError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "OPTIMIZATION_FAILED",
                        "message": str(exc.detail),
                        "details": {},
                    },
                },
                status=422,
            )
        except Exception as exc:
            logger.error("optimize_unexpected_error", error=str(exc), exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "OPTIMIZATION_FAILED",
                        "message": "Error inesperado al calcular la ruta optimizada.",
                        "details": {},
                    },
                },
                status=500,
            )

        # Persistir el resultado
        optimization_result = OptimizationResult.objects.create(
            shopping_list=shopping_list,
            user_location=Point(lng, lat, srid=4326),
            max_distance_km=max_distance_km,
            max_stops=max_stops,
            optimization_mode="balanced",
            w_precio=weights["precio"],
            w_distancia=weights["distancia"],
            w_tiempo=weights["tiempo"],
            total_price=result["total_price"],
            total_distance_km=result["total_distance_km"],
            estimated_time_minutes=result["estimated_time_minutes"],
            route_data=result["route_data"],
        )

        response_serializer = OptimizeResponseSerializer(optimization_result)
        return Response({"success": True, "data": response_serializer.data}, status=200)
