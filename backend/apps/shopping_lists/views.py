"""
Vistas del dominio shopping_lists.

Endpoints:
- ShoppingListViewSet: CRUD + items, collaborators, templates
"""

import redis as redis_lib
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models as django_models
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import BargainAPIException
from .models import (
    ListCollaborator,
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)
from .permissions import IsOwnerOrCollaborator
from .serializers import (
    AddCollaboratorSerializer,
    ListCollaboratorSerializer,
    ListTemplateSerializer,
    ShoppingListCreateSerializer,
    ShoppingListItemEnrichedSerializer,
    ShoppingListItemSerializer,
    ShoppingListSerializer,
)

User = get_user_model()

ACTIVE_LIST_LIMIT = 20
SHARED_LIST_NOTIF_COUNTDOWN = 900  # 15 minutos en segundos


def _trigger_list_notification(list_id: int, actor_id: int) -> None:
    """Programa una notificación de lista compartida con debounce de 15 minutos.

    Usa Redis para evitar duplicados: si ya hay una tarea programada para esta
    lista, no programa otra. La primera vez que se detecta un cambio, programa
    send_shared_list_notification con countdown=900s y establece el lock.

    Args:
        list_id: ID de la ShoppingList modificada.
        actor_id: ID del usuario que realizó el cambio.
    """
    from apps.notifications.tasks import send_shared_list_notification

    r = redis_lib.from_url(settings.CELERY_BROKER_URL)
    lock_key = f"list_notif_pending:{list_id}"

    if not r.exists(lock_key):
        send_shared_list_notification.apply_async(
            args=[list_id, actor_id],
            countdown=SHARED_LIST_NOTIF_COUNTDOWN,
        )
        r.setex(lock_key, SHARED_LIST_NOTIF_COUNTDOWN, 1)


class ActiveListLimitError(BargainAPIException):
    """El usuario ha alcanzado el límite de 20 listas activas."""

    status_code = 409
    default_code = "ACTIVE_LIST_LIMIT_REACHED"
    default_detail = "Archiva una lista para crear una nueva"


class ShoppingListViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listas de la compra.

    El usuario puede ver/editar listas de las que es propietario o colaborador.
    """

    permission_classes = [IsAuthenticated, IsOwnerOrCollaborator]

    def get_queryset(self):
        """Devuelve listas donde el usuario es propietario o colaborador."""
        user = self.request.user
        return (
            ShoppingList.objects.filter(
                django_models.Q(owner=user)
                | django_models.Q(listcollaborator_set__user=user)
            )
            .distinct()
            .prefetch_related("items__product__category")
            .order_by("-updated_at")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ShoppingListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ShoppingListCreateSerializer
        # list action: use detail serializer (with items)
        return ShoppingListSerializer

    def perform_create(self, serializer):
        """Verifica límite de listas activas antes de crear."""
        user = self.request.user
        active_count = ShoppingList.objects.filter(owner=user, is_archived=False).count()
        if active_count >= ACTIVE_LIST_LIMIT:
            raise ActiveListLimitError()
        serializer.save(owner=user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Items ─────────────────────────────────────────────────────────────────

    @extend_schema(
        methods=["GET"],
        responses=ShoppingListItemEnrichedSerializer(many=True),
    )
    @extend_schema(
        methods=["POST"],
        request=ShoppingListItemSerializer,
        responses={201: ShoppingListItemSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        """GET: lista ítems enriquecidos. POST: añade ítem."""
        shopping_list = self.get_object()

        if request.method == "GET":
            items_qs = shopping_list.items.select_related("product__category").order_by("created_at")
            serializer = ShoppingListItemEnrichedSerializer(items_qs, many=True)
            return Response(serializer.data)

        # POST: add item
        serializer = ShoppingListItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check for duplicates (unique_together DB constraint would raise IntegrityError;
        # better to validate first)
        product_id = serializer.validated_data.get("product")
        if product_id and ShoppingListItem.objects.filter(
            shopping_list=shopping_list, product=product_id
        ).exists():
            return Response(
                {"detail": "Este producto ya está en la lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(shopping_list=shopping_list, added_by=request.user)
        _trigger_list_notification(shopping_list.id, request.user.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        methods=["PATCH"],
        request=ShoppingListItemSerializer,
        responses={200: ShoppingListItemSerializer},
    )
    @extend_schema(
        methods=["DELETE"],
        responses={204: None},
    )
    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"items/(?P<item_pk>\d+)",
    )
    def item_detail(self, request, pk=None, item_pk=None):
        """PATCH: actualiza cantidad/checked. DELETE: elimina ítem."""
        shopping_list = self.get_object()

        try:
            item = ShoppingListItem.objects.get(pk=item_pk, shopping_list=shopping_list)
        except ShoppingListItem.DoesNotExist:
            return Response({"detail": "Ítem no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            serializer = ShoppingListItemSerializer(item, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            _trigger_list_notification(shopping_list.id, request.user.id)
            return Response(serializer.data)

        # DELETE
        item.delete()
        _trigger_list_notification(shopping_list.id, request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Collaborators ─────────────────────────────────────────────────────────

    @extend_schema(methods=["GET"], responses=ListCollaboratorSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        request=AddCollaboratorSerializer,
        responses={201: ListCollaboratorSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="collaborators")
    def collaborators(self, request, pk=None):
        """GET: lista colaboradores. POST: invita por username."""
        shopping_list = self.get_object()

        if request.method == "GET":
            collabs = ListCollaborator.objects.filter(
                shopping_list=shopping_list
            ).select_related("user", "invited_by")
            serializer = ListCollaboratorSerializer(collabs, many=True)
            return Response(serializer.data)

        # POST: add collaborator by username
        serializer = AddCollaboratorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        user = User.objects.get(username=username)

        # Check if already a collaborator
        if ListCollaborator.objects.filter(
            shopping_list=shopping_list, user=user
        ).exists():
            return Response(
                {"detail": "Este usuario ya es colaborador de la lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        collab = ListCollaborator.objects.create(
            shopping_list=shopping_list,
            user=user,
            invited_by=request.user,
        )
        out = ListCollaboratorSerializer(collab)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"collaborators/(?P<user_pk>\d+)",
    )
    def remove_collaborator(self, request, pk=None, user_pk=None):
        """DELETE: elimina colaborador; sus ítems permanecen en la lista."""
        shopping_list = self.get_object()

        try:
            collab = ListCollaborator.objects.get(
                shopping_list=shopping_list, user_id=user_pk
            )
        except ListCollaborator.DoesNotExist:
            return Response(
                {"detail": "Colaborador no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        collab.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Templates ─────────────────────────────────────────────────────────────

    @extend_schema(
        request={"application/json": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}},
        responses={201: ListTemplateSerializer},
    )
    @action(detail=True, methods=["post"], url_path="save-template")
    def save_template(self, request, pk=None):
        """POST: crea ListTemplate desde la lista actual (solo products, qty=1, unchecked)."""
        shopping_list = self.get_object()
        name = request.data.get("name")
        if not name:
            return Response({"detail": "Se requiere el campo 'name'."}, status=status.HTTP_400_BAD_REQUEST)

        template = ListTemplate.objects.create(
            owner=request.user,
            name=name,
            source_list=shopping_list,
        )
        items = shopping_list.items.select_related("product").order_by("created_at")
        for i, item in enumerate(items):
            ListTemplateItem.objects.create(
                template=template,
                product=item.product,
                ordering=i,
            )

        serializer = ListTemplateSerializer(template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request={"application/json": {"type": "object", "properties": {"name": {"type": "string"}}}},
        responses={201: ShoppingListSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
        url_path=r"from-template/(?P<template_pk>\d+)",
    )
    def from_template(self, request, template_pk=None):
        """POST: crea nueva lista desde plantilla; sujeto al límite de 20 activas."""
        try:
            template = ListTemplate.objects.prefetch_related("items__product").get(
                pk=template_pk, owner=request.user
            )
        except ListTemplate.DoesNotExist:
            return Response(
                {"detail": "Plantilla no encontrada."}, status=status.HTTP_404_NOT_FOUND
            )

        # Check active list limit
        user = request.user
        active_count = ShoppingList.objects.filter(owner=user, is_archived=False).count()
        if active_count >= ACTIVE_LIST_LIMIT:
            raise ActiveListLimitError()

        name = request.data.get("name") or template.name
        new_list = ShoppingList.objects.create(owner=user, name=name)

        for template_item in template.items.all():
            ShoppingListItem.objects.create(
                shopping_list=new_list,
                product=template_item.product,
                quantity=1,
                is_checked=False,
                added_by=user,
            )

        serializer = ShoppingListSerializer(new_list)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
