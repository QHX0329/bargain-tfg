"""Tests unitarios para los modelos de notificaciones."""

import pytest
from django.utils import timezone

from apps.notifications.models import Notification, NotificationType, UserPushToken


@pytest.mark.django_db
class TestNotificationModel:
    """Tests para el modelo Notification."""

    def test_notification_creation_all_fields(self, consumer_user):
        """Notification se crea con todos los campos correctamente."""
        notif = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.PRICE_ALERT,
            title="Test título",
            body="Test cuerpo",
            data={"product_id": 42},
            action_url="bargain://products/42/prices",
        )
        assert notif.id is not None
        assert notif.user == consumer_user
        assert notif.notification_type == NotificationType.PRICE_ALERT
        assert notif.title == "Test título"
        assert notif.body == "Test cuerpo"
        assert notif.data == {"product_id": 42}
        assert notif.action_url == "bargain://products/42/prices"
        assert notif.created_at is not None

    def test_notification_is_read_defaults_false(self, consumer_user):
        """is_read por defecto es False."""
        notif = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.NEW_PROMO,
            title="Promo",
            body="Nueva promo",
        )
        assert notif.is_read is False

    def test_notification_deleted_at_none_by_default(self, consumer_user):
        """deleted_at es None por defecto (no borrada)."""
        notif = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.SHARED_LIST_CHANGED,
            title="Lista",
            body="Lista cambiada",
        )
        assert notif.deleted_at is None

    def test_notification_data_defaults_to_empty_dict(self, consumer_user):
        """data es dict vacío por defecto."""
        notif = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.BUSINESS_APPROVED,
            title="Aprobado",
            body="Tu negocio ha sido aprobado",
        )
        assert notif.data == {}

    def test_notification_ordering_newest_first(self, consumer_user):
        """Las notificaciones se ordenan por -created_at."""
        n1 = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.PRICE_ALERT,
            title="Primero",
            body="Primera",
        )
        n2 = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.PRICE_ALERT,
            title="Segundo",
            body="Segunda",
        )
        notifications = list(Notification.objects.filter(user=consumer_user))
        # Most recent first
        assert notifications[0].id == n2.id
        assert notifications[1].id == n1.id

    def test_notification_soft_delete(self, consumer_user):
        """Soft delete: deleted_at se puede establecer, el registro permanece en BD."""
        notif = Notification.objects.create(
            user=consumer_user,
            notification_type=NotificationType.PRICE_ALERT,
            title="A borrar",
            body="Soft delete",
        )
        notif.deleted_at = timezone.now()
        notif.save()
        # Still in DB
        assert Notification.objects.filter(pk=notif.pk).exists()
        assert Notification.objects.get(pk=notif.pk).deleted_at is not None

    def test_notification_type_choices(self):
        """NotificationType tiene todas las opciones esperadas."""
        assert NotificationType.PRICE_ALERT == "price_alert"
        assert NotificationType.NEW_PROMO == "new_promo"
        assert NotificationType.SHARED_LIST_CHANGED == "shared_list_changed"
        assert NotificationType.BUSINESS_APPROVED == "business_approved"
        assert NotificationType.BUSINESS_REJECTED == "business_rejected"


@pytest.mark.django_db
class TestUserPushTokenModel:
    """Tests para el modelo UserPushToken."""

    def test_push_token_creation(self, consumer_user):
        """UserPushToken se crea correctamente."""
        token = UserPushToken.objects.create(
            user=consumer_user,
            token="ExponentPushToken[xxx]",
            device_id="device-001",
        )
        assert token.id is not None
        assert token.user == consumer_user
        assert token.token == "ExponentPushToken[xxx]"
        assert token.device_id == "device-001"
        assert token.created_at is not None
        assert token.updated_at is not None

    def test_push_token_upsert_keeps_one_per_user_device(self, consumer_user):
        """update_or_create mantiene un solo token por usuario + device_id."""
        UserPushToken.objects.update_or_create(
            user=consumer_user,
            device_id="device-001",
            defaults={"token": "ExponentPushToken[aaa]"},
        )
        UserPushToken.objects.update_or_create(
            user=consumer_user,
            device_id="device-001",
            defaults={"token": "ExponentPushToken[bbb]"},
        )
        tokens = UserPushToken.objects.filter(user=consumer_user, device_id="device-001")
        assert tokens.count() == 1
        assert tokens.first().token == "ExponentPushToken[bbb]"

    def test_push_token_different_devices_create_separate_records(self, consumer_user):
        """Dispositivos distintos del mismo usuario crean registros separados."""
        UserPushToken.objects.create(
            user=consumer_user,
            token="ExponentPushToken[aaa]",
            device_id="device-001",
        )
        UserPushToken.objects.create(
            user=consumer_user,
            token="ExponentPushToken[bbb]",
            device_id="device-002",
        )
        assert UserPushToken.objects.filter(user=consumer_user).count() == 2

    def test_push_token_unique_together_user_device_id(self, consumer_user):
        """unique_together (user, device_id) se aplica a nivel de BD."""
        from django.db import IntegrityError

        UserPushToken.objects.create(
            user=consumer_user,
            token="ExponentPushToken[aaa]",
            device_id="device-001",
        )
        with pytest.raises(IntegrityError):
            UserPushToken.objects.create(
                user=consumer_user,
                token="ExponentPushToken[bbb]",
                device_id="device-001",
            )
