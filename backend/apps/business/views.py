"""Vistas del portal business de BarGAIN."""

from typing import Any

import structlog
from django.db import IntegrityError, transaction
from django.db.models import QuerySet, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import PromotionConflictError
from apps.core.responses import success_response
from apps.prices.models import Price
from apps.stores.models import Store

from .models import BusinessProfile, Promotion
from .permissions import IsVerifiedBusiness
from .serializers import (
    BulkPriceItemSerializer,
    BusinessPriceSerializer,
    BusinessProfileAdminSerializer,
    BusinessProfileSerializer,
    BusinessStatsSerializer,
    BusinessStoreSerializer,
    PromotionSerializer,
)

logger = structlog.get_logger(__name__)


class BusinessProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet para BusinessProfile.

    - Negocios: pueden crear y ver su propio perfil.
    - Admins: pueden listar todos, aprobar y rechazar perfiles.
    """

    serializer_class = BusinessProfileSerializer
    queryset = BusinessProfile.objects.select_related("user").all()

    def get_queryset(self) -> QuerySet[BusinessProfile]:
        if self.request.user.is_staff:
            return BusinessProfile.objects.select_related("user").all()
        return BusinessProfile.objects.select_related("user").filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self) -> type[BusinessProfileSerializer]:
        if self.request.user.is_staff:
            return BusinessProfileAdminSerializer
        return BusinessProfileSerializer

    def create(self, request, *args, **kwargs):
        """Crea el perfil de un usuario con role='business'.

        El perfil se crea ya verificado (``is_verified=True``), sin requerir la
        aprobación previa de un administrador: el comercio puede gestionar precios
        y promociones de inmediato. Los administradores conservan la capacidad de
        revocar la verificación mediante la acción ``reject``.
        """
        if request.user.role != "business":
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Solo usuarios con rol 'business' pueden registrar un perfil de negocio.",
                        "details": {},
                    },
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, is_verified=True)
        logger.info("business_profile_auto_verified", user_id=request.user.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                "ApproveResponse",
                fields={
                    "id": drf_serializers.IntegerField(),
                    "is_verified": drf_serializers.BooleanField(),
                },
            )
        },
        description="Aprueba un BusinessProfile pendiente. Solo admins. Envía email de notificación al negocio.",
    )
    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Aprueba un BusinessProfile (solo admin)."""
        profile = self.get_object()
        profile.is_verified = True
        profile.rejection_reason = ""
        profile.save(update_fields=["is_verified", "rejection_reason", "updated_at"])

        from .tasks import send_business_approval_email

        send_business_approval_email.delay(profile.id)
        logger.info("business_profile_approved", profile_id=profile.id)
        return success_response({"id": profile.id, "is_verified": True})

    @extend_schema(
        request=inline_serializer(
            "RejectRequest",
            fields={"reason": drf_serializers.CharField(required=False, default="")},
        ),
        responses={
            200: inline_serializer(
                "RejectResponse",
                fields={
                    "id": drf_serializers.IntegerField(),
                    "is_verified": drf_serializers.BooleanField(),
                    "rejection_reason": drf_serializers.CharField(),
                },
            )
        },
        description="Rechaza un BusinessProfile con motivo opcional. Solo admins. Envía email de notificación al negocio.",
    )
    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Rechaza un BusinessProfile con motivo (solo admin)."""
        profile = self.get_object()
        reason = request.data.get("reason", "")
        profile.is_verified = False
        profile.rejection_reason = reason
        profile.save(update_fields=["is_verified", "rejection_reason", "updated_at"])

        from .tasks import send_business_rejection_email

        send_business_rejection_email.delay(profile.id, reason)
        logger.info("business_profile_rejected", profile_id=profile.id, reason=reason)
        return success_response(
            {"id": profile.id, "is_verified": False, "rejection_reason": reason}
        )

    @extend_schema(
        request=None,
        responses={200: BusinessStatsSerializer},
        description="Estadísticas agregadas del negocio autenticado.",
    )
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request) -> Response:
        """Estadísticas de rendimiento del perfil de negocio."""
        profile = BusinessProfile.objects.filter(
            user=request.user,
            is_verified=True,
        ).first()
        if profile is None:
            return Response(
                {
                    "success": False,
                    "error": {"code": "NOT_VERIFIED", "message": "Perfil no verificado."},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        stores_qs = Store.objects.filter(business_profile=profile, is_active=True)
        prices_qs = Price.objects.filter(
            store__business_profile=profile,
        )
        promos_qs = Promotion.objects.filter(
            store__business_profile=profile,
            is_active=True,
        )

        data = {
            "total_active_prices": prices_qs.count(),
            "total_active_promotions": promos_qs.count(),
            "total_stores": stores_qs.count(),
            "total_promotion_views": promos_qs.aggregate(
                total=Sum("views"),
            )["total"]
            or 0,
            "latest_price_update": prices_qs.order_by("-verified_at")
            .values_list(
                "verified_at",
                flat=True,
            )
            .first(),
            "latest_promotion_created": promos_qs.order_by("-created_at")
            .values_list(
                "created_at",
                flat=True,
            )
            .first(),
        }
        serializer = BusinessStatsSerializer(data)
        return success_response(serializer.data)


class PromotionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Promotion.

    Solo negocios verificados pueden gestionar promociones.
    """

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsVerifiedBusiness]
    queryset = Promotion.objects.select_related("product", "store").all()

    def get_queryset(self) -> QuerySet[Promotion]:
        try:
            profile = BusinessProfile.objects.get(user=self.request.user, is_verified=True)
            return Promotion.objects.filter(store__business_profile=profile).select_related(
                "product", "store"
            )
        except BusinessProfile.DoesNotExist:
            return Promotion.objects.none()

    def perform_create(self, serializer):
        serializer.save()
        from apps.notifications.tasks import notify_new_promo_at_store

        notify_new_promo_task: Any = notify_new_promo_at_store
        notify_new_promo_task.delay(serializer.instance.id)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                self.perform_create(serializer)
        except IntegrityError as exc:
            raise PromotionConflictError() from exc
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                "DeactivateResponse",
                fields={
                    "id": drf_serializers.IntegerField(),
                    "is_active": drf_serializers.BooleanField(),
                },
            )
        },
        description="Desactiva una promoción activa. Solo el negocio propietario.",
    )
    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """Desactiva una promoción activa."""
        promotion = self.get_object()
        promotion.is_active = False
        promotion.save(update_fields=["is_active"])
        logger.info("promotion_deactivated", promotion_id=promotion.id)
        return success_response({"id": promotion.id, "is_active": False})


class BusinessPriceViewSet(viewsets.ModelViewSet):
    """
    ViewSet para precios gestionados directamente por negocios PYME.

    Los precios con source='business' nunca caducan (is_stale siempre False).
    """

    serializer_class = BusinessPriceSerializer
    permission_classes = [IsAuthenticated, IsVerifiedBusiness]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    queryset = Price.objects.select_related("product", "store").all()

    def get_queryset(self) -> QuerySet[Price]:
        try:
            profile = BusinessProfile.objects.get(user=self.request.user, is_verified=True)
            return Price.objects.filter(
                store__business_profile=profile,
            ).select_related("product", "store")
        except BusinessProfile.DoesNotExist:
            return Price.objects.none()

    def perform_create(self, serializer):
        serializer.save(source=Price.Source.BUSINESS, is_stale=False)

    def perform_update(self, serializer):
        serializer.save(source=Price.Source.BUSINESS, is_stale=False, verified_at=timezone.now())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses=BusinessStoreSerializer(many=True),
        description="Lista las tiendas activas asociadas al negocio autenticado.",
    )
    @action(detail=False, methods=["get"], url_path="stores")
    def stores(self, request) -> Response:
        """Devuelve tiendas activas del perfil de negocio verificado actual."""
        profile = BusinessProfile.objects.filter(user=request.user, is_verified=True).first()
        if profile is None:
            return Response([], status=status.HTTP_200_OK)

        stores_qs = Store.objects.filter(business_profile=profile, is_active=True).order_by("name")
        serializer = BusinessStoreSerializer(stores_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=BulkPriceItemSerializer(many=True),
        responses={
            200: inline_serializer(
                "BulkUpdateResponse",
                fields={
                    "created": drf_serializers.IntegerField(),
                    "updated": drf_serializers.IntegerField(),
                    "errors": drf_serializers.ListField(child=drf_serializers.DictField()),
                },
            )
        },
        description="Actualización masiva de precios por lote. Cada item crea o actualiza un precio.",
    )
    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request) -> Response:
        """Actualización masiva de precios para negocio."""
        profile = BusinessProfile.objects.filter(
            user=request.user,
            is_verified=True,
        ).first()
        if profile is None:
            return Response(
                {
                    "success": False,
                    "error": {"code": "NOT_VERIFIED", "message": "Perfil no verificado."},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not isinstance(request.data, list):
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_FORMAT",
                        "message": "Se espera una lista de precios.",
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        owned_store_ids = set(
            Store.objects.filter(business_profile=profile, is_active=True).values_list(
                "id", flat=True
            )
        )

        created_count = 0
        updated_count = 0
        errors: list[dict[str, Any]] = []

        with transaction.atomic():
            for idx, item_data in enumerate(request.data):
                serializer = BulkPriceItemSerializer(data=item_data)
                if not serializer.is_valid():
                    errors.append({"index": idx, "errors": serializer.errors})
                    continue

                validated = serializer.validated_data
                store = validated["store"]

                if store.id not in owned_store_ids:
                    errors.append(
                        {"index": idx, "errors": {"store": "Tienda no pertenece a tu negocio."}}
                    )
                    continue

                defaults = {
                    "price": validated["price"],
                    "source": Price.Source.BUSINESS,
                    "is_stale": False,
                    "verified_at": timezone.now(),
                }
                if validated.get("unit_price") is not None:
                    defaults["unit_price"] = validated["unit_price"]
                if validated.get("offer_price") is not None:
                    defaults["offer_price"] = validated["offer_price"]
                if validated.get("offer_end_date") is not None:
                    defaults["offer_end_date"] = validated["offer_end_date"]

                _, was_created = Price.objects.update_or_create(
                    product=validated["product"],
                    store=store,
                    source=Price.Source.BUSINESS,
                    defaults=defaults,
                )
                if was_created:
                    created_count += 1
                else:
                    updated_count += 1

        logger.info(
            "business_bulk_price_update",
            profile_id=profile.id,
            created=created_count,
            updated=updated_count,
            errors_count=len(errors),
        )
        return success_response(
            {
                "created": created_count,
                "updated": updated_count,
                "errors": errors,
            }
        )
