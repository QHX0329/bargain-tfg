"""Admin para el módulo de notificaciones de BargAIn."""

from django.contrib import admin

from .models import Notification, UserPushToken


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "notification_type",
        "title",
        "is_read",
        "deleted_at",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read"]
    search_fields = ["user__username", "title", "body"]
    raw_id_fields = ["user"]
    readonly_fields = ["deleted_at", "created_at"]


@admin.register(UserPushToken)
class UserPushTokenAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "device_id", "token", "created_at"]
    search_fields = ["user__username", "device_id", "token"]
    raw_id_fields = ["user"]
