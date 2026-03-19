"""Vistas del módulo de tiendas con búsqueda geoespacial."""

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import viewsets
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
    ViewSet de tiendas.

    Endpoints:
        GET /api/v1/stores/?lat=<lat>&lng=<lng>[&radius_km=<km>]  — búsqueda geoespacial
        GET /api/v1/stores/?favorites=true                         — favoritos del usuario (auth)
        GET /api/v1/stores/<id>/                                   — detalle por PK
        POST /api/v1/stores/<id>/favorite/                         — alternar favorito
    """

    permission_classes = []  # list/retrieve son públicos; favorite define el suyo propio

    @extend_schema(
        summary="Listar tiendas",
        description=(
            "Devuelve tiendas según el modo de consulta:\n\n"
            "**Modo favoritos** (`?favorites=true`, requiere autenticación):\n"
            "Devuelve todas las tiendas marcadas como favoritas por el usuario "
            "autenticado, ordenadas por nombre. No requiere `lat`/`lng`.\n\n"
            "**Modo geoespacial** (por defecto):\n"
            "Devuelve las tiendas dentro del radio especificado, ordenadas por "
            "distancia al usuario. Requiere `lat` y `lng`."
        ),
        parameters=[
            OpenApiParameter(
                "favorites",
                bool,
                required=False,
                description=(
                    "Si `true`, devuelve las tiendas favoritas del usuario autenticado "
                    "sin necesitar coordenadas. Incompatible con `lat`/`lng`."
                ),
            ),
            OpenApiParameter(
                "lat",
                float,
                required=False,
                description="Latitud del usuario (WGS-84). Requerido en modo geoespacial.",
            ),
            OpenApiParameter(
                "lng",
                float,
                required=False,
                description="Longitud del usuario (WGS-84). Requerido en modo geoespacial.",
            ),
            OpenApiParameter(
                "radius_km",
                float,
                required=False,
                description="Radio de búsqueda en km (defecto: radio del perfil del usuario o 10 km). Solo aplica en modo geoespacial.",
            ),
        ],
    )
    def list(self, request: Request, *args, **kwargs) -> Response:
        """Lista tiendas en modo favoritos o geoespacial según los parámetros recibidos."""
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        """
        Devuelve el queryset adecuado según la acción:

        - retrieve / favorite: lookup directo por PK, sin filtro geoespacial.
        - list?favorites=true: tiendas favoritas del usuario autenticado, sin geo.
        - list: tiendas dentro del radio especificado, ordenadas por distancia.
          Requiere parámetros lat y lng en la query string.

        Raises:
            BargainAPIException: Si faltan lat o lng en la acción list.
        """
        # Para detail/retrieve no aplicamos filtro geoespacial — sólo buscamos por PK.
        if self.action in ("retrieve", "favorite"):
            return Store.objects.filter(is_active=True).select_related("chain")

        request: Request = self.request

        # Favoritos: no requieren coordenadas
        if request.query_params.get("favorites") == "true" and request.user.is_authenticated:
            return (
                Store.objects.filter(
                    is_active=True,
                    favorited_by__user=request.user,
                )
                .select_related("chain")
                .order_by("name")
            )

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
        except ValueError as exc:
            raise BargainAPIException(
                detail="Los parámetros lat y lng deben ser números válidos.",
                code="INVALID_LOCATION",
            ) from exc

        # Radio: usa el parámetro de la request o el predeterminado del usuario
        try:
            radius_km = float(
                request.query_params.get("radius_km", request.user.max_search_radius_km)
            )
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

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                "FavoriteResponse", fields={"is_favorite": drf_serializers.BooleanField()}
            )
        },
        description="Alterna el estado de favorito de una tienda. Devuelve `is_favorite: true` si se añadió, `false` si se eliminó.",
    )
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
        except Store.DoesNotExist as exc:
            raise Http404 from exc
        self.check_object_permissions(request, store)
        favorite_qs = UserFavoriteStore.objects.filter(user=request.user, store=store)

        if favorite_qs.exists():
            favorite_qs.delete()
            return success_response({"is_favorite": False})
        else:
            UserFavoriteStore.objects.create(user=request.user, store=store)
            return success_response({"is_favorite": True})
