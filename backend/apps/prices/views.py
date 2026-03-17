"""Vistas para el módulo de precios de BargAIn."""

from decimal import Decimal

from django.db.models import Avg, Min, Max
from django.db.models.functions import TruncDay
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import created_response, success_response

from .models import Price, PriceAlert
from .serializers import (
    CrowdsourcePriceSerializer,
    PriceAlertSerializer,
    PriceCompareSerializer,
    PriceHistoryPointSerializer,
)

# Radio de búsqueda por defecto en km
DEFAULT_RADIUS_KM = 10.0


class PriceCompareView(APIView):
    """GET /api/v1/prices/compare/?product=<id>&lat=<lat>&lng=<lng>&radius=<km>

    Devuelve precios del producto en tiendas cercanas al punto dado.
    Cada entrada incluye is_stale, distancia y fuente.
    """

    permission_classes = []  # Pública — sin autenticación requerida

    @extend_schema(
        parameters=[
            OpenApiParameter("product", int, required=True, description="ID del producto a comparar"),
            OpenApiParameter("lat", float, required=False, description="Latitud del usuario (WGS-84); si se omite, devuelve precios de todas las tiendas"),
            OpenApiParameter("lng", float, required=False, description="Longitud del usuario (WGS-84)"),
            OpenApiParameter("radius", float, required=False, description=f"Radio de búsqueda en km (defecto: {DEFAULT_RADIUS_KM})"),
        ],
        responses=PriceCompareSerializer(many=True),
    )
    def get(self, request):
        product_id = request.query_params.get("product")
        if not product_id:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "MISSING_PRODUCT",
                        "message": "El parámetro 'product' es obligatorio.",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        radius_km = float(request.query_params.get("radius", DEFAULT_RADIUS_KM))

        # Obtener precios del producto — si no hay lat/lng, devolver todos
        prices_qs = (
            Price.objects.filter(product_id=product_id)
            .select_related("store", "store__chain")
            .order_by("price")
        )

        distance_map: dict[int, float | None] = {}

        if lat and lng:
            from django.contrib.gis.geos import Point
            from django.contrib.gis.measure import D

            user_location = Point(float(lng), float(lat), srid=4326)

            from apps.stores.models import Store

            nearby_store_ids = Store.objects.filter(
                location__distance_lte=(user_location, D(km=radius_km)),
                is_active=True,
            ).values_list("id", flat=True)

            prices_qs = prices_qs.filter(store_id__in=nearby_store_ids)

            # Calcular distancias
            from django.contrib.gis.db.models.functions import Distance

            stores_with_distance = (
                Store.objects.filter(id__in=nearby_store_ids)
                .annotate(distance=Distance("location", user_location))
            )
            for s in stores_with_distance:
                # Distance returns in degrees; convert to km via .m / 1000
                distance_map[s.id] = round(s.distance.m / 1000, 2)

        # Construir respuesta: un precio por tienda (el más reciente no-stale, o el stale si no hay otro)
        seen_stores: set[int] = set()
        results = []
        for price_obj in prices_qs:
            store_id = price_obj.store_id
            if store_id in seen_stores:
                continue
            seen_stores.add(store_id)
            results.append(
                {
                    "store_id": store_id,
                    "store_name": price_obj.store.name,
                    "price": price_obj.price,
                    "offer_price": price_obj.offer_price,
                    "source": price_obj.source,
                    "is_stale": price_obj.is_stale,
                    "distance_km": distance_map.get(store_id),
                    "verified_at": price_obj.verified_at,
                }
            )

        serializer = PriceCompareSerializer(results, many=True)
        return success_response(serializer.data)


class ListTotalView(APIView):
    """GET /api/v1/prices/list-total/?list=<id>&store=<id>

    Calcula el coste total de los ítems de una lista en una tienda específica.
    Informa de los ítems sin precio disponible como missing_items.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("list", int, required=True, description="ID de la lista de la compra"),
            OpenApiParameter("store", int, required=True, description="ID de la tienda donde calcular el total"),
        ],
    )
    def get(self, request):
        list_id = request.query_params.get("list")
        store_id = request.query_params.get("store")

        if not list_id or not store_id:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "MISSING_PARAMS",
                        "message": "Los parámetros 'list' y 'store' son obligatorios.",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.shopping_lists.models import ShoppingList, ShoppingListItem
        from apps.stores.models import Store

        try:
            shopping_list = ShoppingList.objects.get(pk=list_id)
        except ShoppingList.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "LIST_NOT_FOUND",
                        "message": "Lista de la compra no encontrada.",
                        "details": {},
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            store = Store.objects.get(pk=store_id)
        except Store.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "STORE_NOT_FOUND",
                        "message": "Tienda no encontrada.",
                        "details": {},
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        items = ShoppingListItem.objects.filter(shopping_list=shopping_list).select_related("product")

        total = Decimal("0.00")
        missing_items: list[str] = []

        for item in items:
            # Obtener el precio más reciente no-stale del producto en la tienda
            price_obj = (
                Price.objects.filter(product=item.product, store=store, is_stale=False)
                .order_by("-verified_at")
                .first()
            )
            if price_obj is None:
                missing_items.append(item.product.name)
            else:
                effective_price = price_obj.offer_price if price_obj.offer_price else price_obj.price
                total += effective_price * item.quantity

        return success_response(
            {
                "store_id": store.id,
                "store_name": store.name,
                "total": str(total),
                "missing_items": missing_items,
            }
        )


class PriceHistoryView(APIView):
    """GET /api/v1/prices/{product_id}/history/

    Devuelve agregaciones diarias (min/max/avg) de precios para los últimos 90 días.
    """

    permission_classes = []  # Pública

    def get(self, request, product_id):
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(days=90)

        aggregates = (
            Price.objects.filter(product_id=product_id, verified_at__gte=cutoff)
            .annotate(day=TruncDay("verified_at"))
            .values("day", "store__id", "store__name")
            .annotate(
                min_price=Min("price"),
                max_price=Max("price"),
                avg_price=Avg("price"),
            )
            .order_by("day")
        )

        results = [
            {
                "day": entry["day"],
                "store_id": entry["store__id"],
                "store_name": entry["store__name"],
                "min_price": entry["min_price"],
                "max_price": entry["max_price"],
                "avg_price": entry["avg_price"],
            }
            for entry in aggregates
        ]

        serializer = PriceHistoryPointSerializer(results, many=True)
        return success_response(serializer.data)


class PriceAlertViewSet(viewsets.ModelViewSet):
    """ViewSet para alertas de precio del usuario autenticado."""

    serializer_class = PriceAlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """Desactiva la alerta en lugar de eliminarla."""
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CrowdsourcePriceView(generics.CreateAPIView):
    """POST /api/v1/prices/crowdsource/

    Permite a usuarios autenticados reportar precios de productos en tiendas.
    El precio creado tiene source=crowdsourcing y confidence_weight=0.5.
    """

    serializer_class = CrowdsourcePriceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(
            source=Price.Source.CROWDSOURCING,
            confidence_weight=0.5,
            is_stale=False,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)
