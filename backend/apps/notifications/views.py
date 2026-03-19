"""Vistas del módulo de notificaciones de BargAIn."""

import structlog
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.responses import created_response, success_response

from .models import Notification, UserPushToken
from .serializers import NotificationSerializer, PushTokenSerializer

logger = structlog.get_logger(__name__)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el inbox de notificaciones del usuario.

    - list:         GET  /api/v1/notifications/
    - read:         PATCH /api/v1/notifications/{id}/read/
    - read_all:     POST /api/v1/notifications/read-all/
    - unread_count: GET  /api/v1/notifications/unread-count/
    - destroy:      DELETE /api/v1/notifications/{id}/  (soft delete)
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        """Devuelve notificaciones no eliminadas del usuario actual."""
        return Notification.objects.filter(
            user=self.request.user,
            deleted_at__isnull=True,
        )

    @extend_schema(
        request=None,
        responses={200: NotificationSerializer},
        description="Marca una notificación concreta como leída.",
    )
    @action(detail=True, methods=["patch"], url_path="read")
    def read(self, request, pk=None):
        """PATCH /api/v1/notifications/{id}/read/ — marca la notificación como leída."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        serializer = self.get_serializer(notification)
        return success_response(serializer.data)

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                "ReadAllResponse", fields={"marked_read": drf_serializers.IntegerField()}
            )
        },
        description="Marca todas las notificaciones no leídas del usuario como leídas. Devuelve el número de notificaciones actualizadas.",
    )
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        """POST /api/v1/notifications/read-all/ — marca todas las notificaciones como leídas."""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return success_response({"marked_read": updated})

    @extend_schema(
        responses={
            200: inline_serializer(
                "UnreadCountResponse", fields={"count": drf_serializers.IntegerField()}
            )
        },
        description="Devuelve el número de notificaciones no leídas. Usar para el badge de la app.",
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """GET /api/v1/notifications/unread-count/ — contador de notificaciones no leídas."""
        count = self.get_queryset().filter(is_read=False).count()
        return success_response({"count": count})

    def destroy(self, request, *args, **kwargs):
        """DELETE soft: establece deleted_at en lugar de borrar el registro."""
        notification = self.get_object()
        notification.deleted_at = timezone.now()
        notification.save(update_fields=["deleted_at"])
        logger.info(
            "notification_soft_deleted",
            notification_id=notification.id,
            user_id=request.user.id,
        )
        return Response(status=204)


class PushTokenView(CreateAPIView):
    """
    POST /api/v1/notifications/push-token/ — registra o actualiza un token push Expo.

    Realiza upsert por (user, device_id): si el dispositivo ya tiene token,
    lo actualiza; si no, crea uno nuevo.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = PushTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        device_id = serializer.validated_data.get("device_id", "")

        _, created = UserPushToken.objects.update_or_create(
            user=request.user,
            device_id=device_id,
            defaults={"token": token},
        )

        logger.info(
            "push_token_upserted",
            user_id=request.user.id,
            device_id=device_id,
            created=created,
        )

        push_token_obj = UserPushToken.objects.get(user=request.user, device_id=device_id)
        data = {
            "id": push_token_obj.id,
            "token": push_token_obj.token,
            "device_id": push_token_obj.device_id,
        }

        if created:
            return created_response(data)
        return success_response(data)
