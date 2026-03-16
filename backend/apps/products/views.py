"""
Vistas del dominio products.

ViewSets:
- CategoryViewSet: solo lectura, retorna árbol de 2 niveles
- ProductViewSet: solo lectura + búsqueda trigram + barcode exact match
  - @action autocomplete: búsqueda rápida con límite de 10 resultados
- ProductProposalView: solo creación, requiere autenticación
"""

from django.contrib.postgres.search import TrigramSimilarity
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.exceptions import ProductNotFoundError
from apps.core.responses import created_response, success_response
from apps.products.filters import ProductFilter
from apps.products.models import Category, Product, ProductProposal
from apps.products.serializers import (
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductProposalSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para categorías (árbol de 2 niveles)."""

    serializer_class = CategorySerializer
    permission_classes = []  # Acceso público
    pagination_class = None  # Sin paginación — se devuelve el árbol completo

    def get_queryset(self):
        """Solo categorías raíz con sus hijos precargados."""
        return Category.objects.filter(parent=None).prefetch_related("children")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para productos con búsqueda trigram y barcode."""

    permission_classes = []  # Acceso público
    filterset_class = ProductFilter

    def get_queryset(self):
        """Queryset base: productos activos con categoría."""
        return Product.objects.select_related("category").filter(is_active=True)

    def get_serializer_class(self):
        """Detalle usa ProductDetailSerializer; listado usa ProductListSerializer."""
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def list(self, request: Request, *args, **kwargs) -> Response:
        """
        Listado de productos con soporte para:
        - ?q=<query> → búsqueda trigram (min 2 chars; vacío/corto → lista vacía)
        - ?barcode=<code> → match exacto (404 si no encontrado)
        - ?category=<id> → filtro por categoría (sin q requerida)
        - ?brand=<marca> → filtro por marca
        """
        barcode = request.query_params.get("barcode")
        if barcode:
            return self._handle_barcode_lookup(barcode)

        q = request.query_params.get("q", "")
        has_q = bool(q)

        # Si hay q pero es muy corta, devolver vacío
        if has_q and len(q) < 2:
            return Response({"count": 0, "next": None, "previous": None, "results": []})

        # Si no hay q pero tampoco hay ningún otro filtro activo, devolver vacío
        has_other_filters = any(
            request.query_params.get(f)
            for f in ["category", "brand", "is_active"]
        )
        if not has_q and not has_other_filters:
            return Response({"count": 0, "next": None, "previous": None, "results": []})

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def _handle_barcode_lookup(self, barcode: str) -> Response:
        """Búsqueda exacta por código de barras. Lanza ProductNotFoundError si no existe."""
        try:
            product = Product.objects.get(barcode=barcode, is_active=True)
        except Product.DoesNotExist:
            raise ProductNotFoundError()

        serializer = ProductListSerializer(product)
        return Response({"count": 1, "next": None, "previous": None, "results": [serializer.data]})

    @action(detail=False, methods=["get"], url_path="autocomplete", permission_classes=[])
    def autocomplete(self, request: Request) -> Response:
        """
        Autocompletado con trigrama: retorna hasta 10 resultados ordenados por similitud.

        GET /api/v1/products/autocomplete/?q=<query>
        Responde: {"success": true, "data": [...]}
        """
        q = request.query_params.get("q", "")
        if not q or len(q) < 2:
            return success_response([])

        results = (
            Product.objects.filter(is_active=True)
            .annotate(similarity=TrigramSimilarity("normalized_name", q))
            .filter(similarity__gte=0.1)
            .order_by("-similarity")[:10]
        )

        serializer = ProductListSerializer(results, many=True)
        return success_response(serializer.data)


class ProductProposalView(generics.CreateAPIView):
    """Vista para crear propuestas de nuevos productos. Requiere autenticación."""

    serializer_class = ProductProposalSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer: ProductProposalSerializer) -> None:
        """Guarda la propuesta con el usuario autenticado como proponente."""
        serializer.save(proposed_by=self.request.user)

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Crea la propuesta y retorna la respuesta en formato estándar."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)
