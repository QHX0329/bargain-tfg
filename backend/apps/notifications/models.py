"""Modelos del sistema de notificaciones de BargAIn."""

from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    """Tipos de notificación soportados por el sistema."""

    PRICE_ALERT = "price_alert", "Alerta de precio"
    NEW_PROMO = "new_promo", "Nueva promoción"
    SHARED_LIST_CHANGED = "shared_list_changed", "Lista compartida modificada"
    BUSINESS_APPROVED = "business_approved", "Negocio aprobado"
    BUSINESS_REJECTED = "business_rejected", "Negocio rechazado"


class UserPushToken(models.Model):
    """Token de push notification de Expo para un dispositivo de usuario."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_tokens",
        verbose_name="Usuario",
    )
    token = models.CharField(
        max_length=200,
        verbose_name="Token Expo Push",
    )
    device_id = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="ID de dispositivo",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Token push de usuario"
        verbose_name_plural = "Tokens push de usuario"
        unique_together = [("user", "device_id")]

    def __str__(self) -> str:
        return f"{self.user} — {self.device_id or 'sin device'}"


class Notification(models.Model):
    """Notificación en el buzón del usuario (inbox)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Usuario",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        verbose_name="Tipo de notificación",
    )
    title = models.CharField(max_length=200, verbose_name="Título")
    body = models.TextField(verbose_name="Cuerpo")
    is_read = models.BooleanField(default=False, verbose_name="Leída")
    data = models.JSONField(default=dict, verbose_name="Datos adicionales")
    action_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="URL de acción",
        help_text="Deep link, p.ej. bargain://lists/42",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Eliminada el",
        help_text="Soft delete — null significa no eliminada",
    )

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.notification_type}] {self.title} → {self.user}"
