"""
Vistas del dominio products.

ViewSets:
- CategoryViewSet: solo lectura, retorna árbol de 2 niveles
- ProductViewSet: solo lectura + búsqueda trigram + barcode exact match
  - @action autocomplete: búsqueda rápida con límite de 10 resultados
- ProductProposalView: solo creación, requiere autenticación
- ProductProposalAdminViewSet: listar/aprobar/rechazar propuestas (solo admins)
"""

import structlog
from django.contrib.postgres.search import TrigramSimilarity
from django.db import IntegrityError
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.business.permissions import IsVerifiedBusiness
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
from apps.products.services import approve_proposal

logger = structlog.get_logger(__name__)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para categorías (árbol de 2 niveles)."""

    serializer_class = CategorySerializer
    permission_classes = []  # Acceso público
    pagination_class = None  # Sin paginación — se devuelve el árbol completo

    def get_queryset(self):
        """Solo categorías raíz con sus hijos precargados."""
        return Category.objects.filter(parent=None).prefetch_related("children")


class ProductViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet para productos con búsqueda trigram, barcode y edición por PYMEs."""

    filterset_class = ProductFilter

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return []  # Acceso público para lectura
        return [IsAuthenticated(), IsVerifiedBusiness()]  # Solo negocios pueden editar

    def get_queryset(self):
        """Queryset base: productos activos con categoría."""
        return Product.objects.select_related("category").filter(is_active=True)

    def get_serializer_class(self):
        """Detalle y update usa ProductDetailSerializer; listado usa ProductListSerializer."""
        if self.action in ["retrieve", "update", "partial_update"]:
            return ProductDetailSerializer
        return ProductListSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="Búsqueda fuzzy por nombre (mín. 2 chars)"),
            OpenApiParameter(
                "barcode",
                str,
                description="Código de barras exacto (EAN-13); devuelve 404 si no existe",
            ),
            OpenApiParameter("category", int, description="Filtrar por ID de categoría"),
            OpenApiParameter("brand", str, description="Filtrar por marca"),
        ]
    )
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
        except Product.DoesNotExist as exc:
            raise ProductNotFoundError() from exc

        serializer = ProductListSerializer(product)
        return Response({"count": 1, "next": None, "previous": None, "results": [serializer.data]})

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="Término de búsqueda parcial (mín. 2 chars)"),
        ]
    )
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
        """Guarda la propuesta con el usuario autenticado como proponente.

        Si el proponente es un comercio (rol ``business``), la propuesta se aprueba
        automáticamente: se materializa el producto —y su precio, si se aportó una
        tienda— sin intervención del administrador. Las propuestas de usuarios
        consumidores (crowdsourcing) permanecen pendientes de revisión.
        """
        proposal = serializer.save(proposed_by=self.request.user)

        if getattr(self.request.user, "role", None) != "business":
            return

        try:
            approve_proposal(proposal)
        except IntegrityError as exc:
            # Si la materialización falla (p. ej. conflicto de datos), la propuesta
            # queda pendiente para revisión manual en lugar de devolver un 500.
            logger.warning(
                "business_proposal_auto_approval_failed",
                proposal_id=proposal.id,
                error=str(exc),
            )
        else:
            logger.info(
                "business_proposal_auto_approved",
                proposal_id=proposal.id,
                user_id=self.request.user.id,
            )

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Crea la propuesta y retorna la respuesta en formato estándar."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)


class ProductProposalAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet de administración para gestionar propuestas de productos.

    Solo accesible por administradores (is_staff=True).
    Permite listar propuestas pendientes y aprobarlas o rechazarlas.
    """

    serializer_class = ProductProposalSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        """Devuelve propuestas filtradas por estado (default: pending)."""
        status = self.request.query_params.get("status", "pending")
        qs = ProductProposal.objects.select_related("proposed_by", "category", "store")
        if status != "all":
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request: Request, pk: int | None = None) -> Response:
        """Aprueba una propuesta, crea el producto y materializa el precio si procede."""
        proposal = self.get_object()
        if proposal.status != ProductProposal.Status.PENDING:
            return Response(
                {"detail": "Solo se pueden aprobar propuestas pendientes."},
                status=400,
            )

        try:
            product = approve_proposal(proposal)
        except IntegrityError as exc:
            return Response(
                {"detail": f"No se pudo aprobar la propuesta: {exc}"},
                status=409,
            )

        return success_response(
            {"proposal_id": proposal.id, "product": ProductDetailSerializer(product).data}
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request: Request, pk: int | None = None) -> Response:
        """Rechaza una propuesta guardando el motivo."""
        proposal = self.get_object()
        if proposal.status != ProductProposal.Status.PENDING:
            return Response(
                {"detail": "Solo se pueden rechazar propuestas pendientes."},
                status=400,
            )
        reason = request.data.get("reason", "")
        proposal.status = ProductProposal.Status.REJECTED
        proposal.notes = f"[RECHAZADO] {reason}" if reason else "[RECHAZADO]"
        proposal.save(update_fields=["status", "notes"])
        return success_response({"proposal_id": proposal.id, "status": "rejected"})
