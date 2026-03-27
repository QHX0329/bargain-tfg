"""Vistas del módulo de tiendas con búsqueda geoespacial."""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests as http_requests
from django.conf import settings
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.core.cache import cache
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
from apps.prices.models import Price

from .models import Store, UserFavoriteStore
from .serializers import (
    StoreDetailSerializer,
    StoreListSerializer,
    StoreProductOfferSerializer,
)


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
        if self.action in (
            "retrieve",
            "favorite",
            "places_detail",
            "places_autocomplete",
            "places_resolve",
            "products",
        ):
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
        summary="Detalle de Places de Google",
        description=(
            "Devuelve datos enriquecidos de la tienda desde Google Places API "
            "(horario, valoración, número de reseñas, URL web), con caché Redis de 24h. "
            "Devuelve `{}` si la tienda no tiene `google_place_id`, si falta la API key, "
            "o si Google Places falla (silent fail)."
        ),
        responses={
            200: inline_serializer(
                "PlacesDetailResponse",
                fields={
                    "opening_hours": drf_serializers.JSONField(allow_null=True),
                    "rating": drf_serializers.FloatField(allow_null=True),
                    "user_rating_count": drf_serializers.IntegerField(allow_null=True),
                    "website_url": drf_serializers.CharField(allow_null=True),
                },
            )
        },
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="places-detail",
        permission_classes=[IsAuthenticated],
    )
    def places_detail(self, request: Request, pk: str | None = None) -> Response:
        """
        Devuelve datos enriquecidos de la tienda desde Google Places API con caché 24h.

        GET /api/v1/stores/<id>/places-detail/
        Returns:
            {"opening_hours": ..., "rating": ..., "user_rating_count": ..., "website_url": ...}
            o {} si no hay google_place_id, api key o falla Google.
        """
        cache_key = f"places_detail:{pk}"
        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached)

        try:
            store = Store.objects.get(pk=pk, is_active=True)
        except Store.DoesNotExist as exc:
            raise Http404 from exc

        if not store.google_place_id:
            return success_response({})

        api_key = settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            return success_response({})

        try:
            response = http_requests.get(
                f"https://places.googleapis.com/v1/places/{store.google_place_id}",
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "currentOpeningHours,rating,userRatingCount,websiteUri",
                },
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
        except Exception:
            return success_response({})

        normalized = {
            "opening_hours": data.get("currentOpeningHours"),
            "rating": data.get("rating"),
            "user_rating_count": data.get("userRatingCount"),
            "website_url": data.get("websiteUri"),
        }
        cache.set(cache_key, normalized, timeout=60 * 60 * 24)
        return success_response(normalized)

    @extend_schema(
        summary="Autocompletado de Places",
        description=(
            "Proxy al endpoint Autocomplete de la nueva Google Places API. "
            "Devuelve sugerencias de establecimientos cercanos a las coordenadas del usuario. "
            "La API key permanece en el servidor."
        ),
        parameters=[
            OpenApiParameter("input", str, required=True, description="Texto de búsqueda"),
            OpenApiParameter("lat", float, required=True, description="Latitud del usuario"),
            OpenApiParameter("lng", float, required=True, description="Longitud del usuario"),
        ],
        responses={
            200: inline_serializer(
                "PlacesAutocompleteResponse",
                fields={
                    "predictions": drf_serializers.ListField(child=drf_serializers.DictField()),
                },
            )
        },
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="places-autocomplete",
        permission_classes=[IsAuthenticated],
    )
    def places_autocomplete(self, request: Request) -> Response:
        """
        Proxy de autocompletado Google Places (New API).

        GET /api/v1/stores/places-autocomplete/?input=Mercadona&lat=37.38&lng=-5.98
        """
        input_text = request.query_params.get("input", "").strip()
        if not input_text or len(input_text) < 2:
            return success_response({"predictions": []})

        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        if not lat or not lng:
            return success_response({"predictions": []})

        api_key = settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            return success_response({"predictions": []})

        try:
            lat_f, lng_f = float(lat), float(lng)
        except ValueError:
            return success_response({"predictions": []})

        # Cache por input + ubicación redondeada (3 decimales ≈ 111m)
        cache_key = f"places_ac:{input_text.lower()}:{round(lat_f, 3)}:{round(lng_f, 3)}"
        cached = cache.get(cache_key)
        if cached is not None:
            return success_response({"predictions": cached})

        try:
            response = http_requests.post(
                "https://places.googleapis.com/v1/places:autocomplete",
                headers={
                    "X-Goog-Api-Key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "input": input_text,
                    "locationBias": {
                        "circle": {
                            "center": {"latitude": lat_f, "longitude": lng_f},
                            "radius": 15000.0,
                        }
                    },
                    "includedPrimaryTypes": ["supermarket", "grocery_store", "store"],
                    "languageCode": "es",
                },
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
        except Exception:
            return success_response({"predictions": []})

        suggestions = data.get("suggestions", [])
        predictions = []
        for s in suggestions:
            place = s.get("placePrediction", {})
            if not place:
                continue
            predictions.append(
                {
                    "place_id": place.get("placeId", ""),
                    "description": place.get("text", {}).get("text", ""),
                    "structured": {
                        "main_text": place.get("structuredFormat", {})
                        .get("mainText", {})
                        .get("text", ""),
                        "secondary_text": place.get("structuredFormat", {})
                        .get("secondaryText", {})
                        .get("text", ""),
                    },
                }
            )

        cache.set(cache_key, predictions, timeout=60 * 60)  # 1h TTL
        return success_response({"predictions": predictions})

    @extend_schema(
        summary="Detalle de un Place por ID",
        description=(
            "Proxy que obtiene lat/lng, nombre y dirección de un Place ID "
            "de la nueva Google Places API. Usado tras seleccionar una sugerencia del autocompletado."
        ),
        parameters=[
            OpenApiParameter("place_id", str, required=True, description="Google Place ID"),
        ],
        responses={
            200: inline_serializer(
                "PlaceDetailByIdResponse",
                fields={
                    "place_id": drf_serializers.CharField(),
                    "name": drf_serializers.CharField(),
                    "address": drf_serializers.CharField(),
                    "lat": drf_serializers.FloatField(),
                    "lng": drf_serializers.FloatField(),
                },
            )
        },
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="places-resolve",
        permission_classes=[IsAuthenticated],
    )
    def places_resolve(self, request: Request) -> Response:
        """
        Resuelve un Place ID a coordenadas + nombre + dirección.

        GET /api/v1/stores/places-resolve/?place_id=ChIJ...
        """
        place_id = request.query_params.get("place_id", "").strip()
        if not place_id:
            return success_response({})

        api_key = settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            return success_response({})

        cache_key = f"places_resolve:{place_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached)

        try:
            response = http_requests.get(
                f"https://places.googleapis.com/v1/places/{place_id}",
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "displayName,formattedAddress,location",
                },
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
        except Exception:
            return success_response({})

        result = {
            "place_id": place_id,
            "name": data.get("displayName", {}).get("text", ""),
            "address": data.get("formattedAddress", ""),
            "lat": data.get("location", {}).get("latitude", 0),
            "lng": data.get("location", {}).get("longitude", 0),
        }

        cache.set(cache_key, result, timeout=60 * 60 * 24)  # 24h TTL

        # Check if a DB store matches this google_place_id (not cached — DB may change)
        matched = (
            Store.objects.filter(google_place_id=place_id, is_active=True)
            .values_list("pk", flat=True)
            .first()
        )
        if matched is not None:
            result["matched_store_id"] = str(matched)

        return success_response(result)

    @extend_schema(
        summary="Productos con precio en una tienda",
        description=(
            "Devuelve una oferta por producto para la tienda indicada. "
            "Soporta paginación y filtro por categoría. "
            "Prioriza precios no caducados y, dentro de cada estado, el registro más reciente."
        ),
        parameters=[
            OpenApiParameter(
                "category",
                int,
                required=False,
                description="ID de categoría para filtrar productos de la tienda.",
            ),
            OpenApiParameter(
                "page",
                int,
                required=False,
                description="Número de página (por defecto 1).",
            ),
            OpenApiParameter(
                "page_size",
                int,
                required=False,
                description="Tamaño de página (1-100, por defecto 20).",
            ),
            OpenApiParameter(
                "limit",
                int,
                required=False,
                description="Alias legacy de page_size (1-100).",
            ),
        ],
        responses={
            200: inline_serializer(
                "StoreProductsPaginatedResponse",
                fields={
                    "count": drf_serializers.IntegerField(),
                    "next": drf_serializers.CharField(allow_null=True),
                    "previous": drf_serializers.CharField(allow_null=True),
                    "results": StoreProductOfferSerializer(many=True),
                },
            )
        },
    )
    @action(detail=True, methods=["get"], url_path="products", permission_classes=[])
    def products(self, request: Request, pk: str | None = None) -> Response:
        """Lista productos detectados en la tienda con paginación y filtro por categoría."""
        store = self.get_object()
        query_params = request.query_params

        try:
            page = int(query_params.get("page", 1))
        except ValueError:
            page = 1
        page = max(1, page)

        page_size_raw = query_params.get("page_size") or query_params.get("limit") or 20
        try:
            page_size = int(page_size_raw)
        except (TypeError, ValueError):
            page_size = 20
        page_size = max(1, min(page_size, 100))

        category_param = query_params.get("category")
        category_id: int | None = None
        if category_param is not None:
            try:
                category_id = int(category_param)
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "INVALID_CATEGORY",
                            "message": "El parámetro category debe ser un entero válido.",
                            "details": {},
                        },
                    },
                    status=400,
                )
            if category_id <= 0:
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "INVALID_CATEGORY",
                            "message": "El parámetro category debe ser mayor que 0.",
                            "details": {},
                        },
                    },
                    status=400,
                )

        # Orden estable para escoger un único precio por producto:
        # no-stale primero y, luego, el más reciente.
        prices_qs = Price.objects.filter(store=store, product__is_active=True)
        if category_id is not None:
            prices_qs = prices_qs.filter(product__category_id=category_id)

        prices_qs = prices_qs.select_related("product", "product__category").order_by(
            "product_id", "is_stale", "-verified_at"
        )

        selected_prices = []
        seen_product_ids: set[int] = set()
        for price_obj in prices_qs:
            if price_obj.product_id in seen_product_ids:
                continue
            seen_product_ids.add(price_obj.product_id)
            selected_prices.append(price_obj)

        total_count = len(selected_prices)
        start = (page - 1) * page_size
        end = start + page_size
        paged_prices = selected_prices[start:end]

        current_url = request.build_absolute_uri()

        def _replace_query_param(url: str, key: str, value: int) -> str:
            split = urlsplit(url)
            query_dict = dict(parse_qsl(split.query, keep_blank_values=True))
            query_dict[key] = str(value)
            new_query = urlencode(query_dict)
            return urlunsplit((split.scheme, split.netloc, split.path, new_query, split.fragment))

        has_next = end < total_count
        has_previous = page > 1
        next_url = _replace_query_param(current_url, "page", page + 1) if has_next else None
        previous_url = (
            _replace_query_param(current_url, "page", page - 1) if has_previous else None
        )

        serializer = StoreProductOfferSerializer(paged_prices, many=True)
        return success_response(
            {
                "count": total_count,
                "next": next_url,
                "previous": previous_url,
                "results": serializer.data,
            }
        )

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
