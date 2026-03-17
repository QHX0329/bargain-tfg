"""Vistas del portal business de BargAIn."""

import structlog
from django.db import IntegrityError, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import BusinessNotVerifiedError, PromotionConflictError
from apps.core.responses import success_response
from apps.prices.models import Price

from .models import BusinessProfile, Promotion
from .permissions import IsVerifiedBusiness
from .serializers import (
    BusinessPriceSerializer,
    BusinessProfileAdminSerializer,
    BusinessProfileSerializer,
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

    def get_queryset(self):
        if self.request.user.is_staff:
            return BusinessProfile.objects.select_related("user").all()
        return BusinessProfile.objects.select_related("user").filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.user.is_staff:
            return BusinessProfileAdminSerializer
        return BusinessProfileSerializer

    def create(self, request, *args, **kwargs):
        """Solo usuarios con role='business' pueden crear un perfil."""
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
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
        return success_response({"id": profile.id, "is_verified": False, "rejection_reason": reason})


class PromotionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Promotion.

    Solo negocios verificados pueden gestionar promociones.
    """

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsVerifiedBusiness]

    def get_queryset(self):
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

        notify_new_promo_at_store.delay(serializer.instance.id)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                self.perform_create(serializer)
        except IntegrityError:
            raise PromotionConflictError()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        try:
            profile = BusinessProfile.objects.get(user=self.request.user, is_verified=True)
            return Price.objects.filter(
                store__business_profile=profile,
                source=Price.Source.BUSINESS,
            ).select_related("product", "store")
        except BusinessProfile.DoesNotExist:
            return Price.objects.none()

    def perform_create(self, serializer):
        serializer.save(source=Price.Source.BUSINESS, is_stale=False)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
