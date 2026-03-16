"""Vistas del módulo de tiendas con búsqueda geoespacial."""

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.http import Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.exceptions import BargainAPIException
from apps.core.responses import success_response

from .models import Store, UserFavoriteStore
from .serializers import StoreDetailSerializer, StoreListSerializer


class StoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de tiendas con búsqueda geoespacial por radio.

    Endpoints:
        GET /api/v1/stores/?lat=<lat>&lng=<lng>[&radius_km=<km>]
        GET /api/v1/stores/<id>/
        POST /api/v1/stores/<id>/favorite/
    """

    def get_queryset(self):
        """
        Devuelve tiendas dentro del radio especificado, ordenadas por distancia.

        Requiere parámetros lat y lng en la query string.
        Raises:
            BargainAPIException: Si faltan lat o lng.
        """
        request: Request = self.request
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")

        if not lat or not lng:
            raise BargainAPIException(
                detail="Se requieren los parámetros lat y lng.",
                code="MISSING_LOCATION",
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            raise BargainAPIException(
                detail="Los parámetros lat y lng deben ser números válidos.",
                code="INVALID_LOCATION",
            )

        # Radio: usa el parámetro de la request o el predeterminado del usuario
        try:
            radius_km = float(request.query_params.get("radius_km", request.user.max_search_radius_km))
        except (ValueError, AttributeError):
            radius_km = 10.0

        # NOTA: Point() requiere longitud primero, luego latitud (SRID 4326)
        user_location = Point(lng, lat, srid=4326)

        return (
            Store.objects.filter(
                location__distance_lte=(user_location, D(km=radius_km)),
                is_active=True,
            )
            .annotate(distance=Distance("location", user_location))
            .order_by("distance")
            .select_related("chain")
        )

    def get_serializer_class(self):
        """Usa StoreDetailSerializer en retrieve, StoreListSerializer en list."""
        if self.action == "retrieve":
            return StoreDetailSerializer
        return StoreListSerializer

    @action(
        detail=True,
        methods=["post"],
        url_path="favorite",
        permission_classes=[IsAuthenticated],
    )
    def favorite(self, request: Request, pk: str | None = None) -> Response:
        """
        Alterna el estado de favorito de una tienda para el usuario autenticado.

        POST /api/v1/stores/<id>/favorite/
        Returns:
            {"is_favorite": true} si se añadió, {"is_favorite": false} si se eliminó.
        """
        # Lookup directamente por pk sin requerir lat/lng (el favorito no necesita distancia)
        try:
            store = Store.objects.get(pk=pk)
        except Store.DoesNotExist:
            raise Http404
        self.check_object_permissions(request, store)
        favorite_qs = UserFavoriteStore.objects.filter(user=request.user, store=store)

        if favorite_qs.exists():
            favorite_qs.delete()
            return success_response({"is_favorite": False})
        else:
            UserFavoriteStore.objects.create(user=request.user, store=store)
            return success_response({"is_favorite": True})
