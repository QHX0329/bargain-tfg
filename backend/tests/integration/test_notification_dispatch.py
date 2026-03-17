"""Tests de integración para dispatch de notificaciones push."""

from unittest.mock import MagicMock, patch

import pytest

from apps.notifications.models import Notification, NotificationType, UserPushToken


@pytest.mark.django_db
class TestDispatchPushNotification:
    """Tests para la tarea Celery dispatch_push_notification."""

    def _create_token(self, user, token_str="ExponentPushToken[abc]", device_id="dev-1"):
        return UserPushToken.objects.create(
            user=user, token=token_str, device_id=device_id
        )

    def test_dispatch_respects_push_rate_limit(self, consumer_user):
        """El 11.° dispatch del día se omite (límite 10 por usuario/día)."""
        self._create_token(consumer_user)

        with patch("apps.notifications.tasks.PushClient") as mock_client_cls, patch(
            "apps.notifications.tasks.redis_lib"
        ) as mock_redis_lib:
            mock_redis = MagicMock()
            mock_redis_lib.from_url.return_value = mock_redis
            # Simulate count = 11 (already at limit)
            mock_redis.incr.return_value = 11
            mock_client_cls.return_value = MagicMock()

            from apps.notifications.tasks import dispatch_push_notification

            dispatch_push_notification(
                user_id=consumer_user.id,
                title="Test",
                body="Test body",
                data={},
                action_url="",
                notification_type=NotificationType.PRICE_ALERT,
            )

            # PushClient.publish should NOT have been called
            mock_client_cls.return_value.publish.assert_not_called()

    def test_dispatch_device_not_registered_deletes_token(self, consumer_user):
        """DeviceNotRegisteredError elimina el token y no falla el task."""
        token = self._create_token(consumer_user)

        with patch("apps.notifications.tasks.PushClient") as mock_client_cls, patch(
            "apps.notifications.tasks.redis_lib"
        ) as mock_redis_lib:
            mock_redis = MagicMock()
            mock_redis_lib.from_url.return_value = mock_redis
            mock_redis.incr.return_value = 1

            from exponent_server_sdk import DeviceNotRegisteredError

            mock_push_response = MagicMock()
            mock_client = MagicMock()
            mock_client.publish.side_effect = DeviceNotRegisteredError(mock_push_response)
            mock_client_cls.return_value = mock_client

            from apps.notifications.tasks import dispatch_push_notification

            dispatch_push_notification(
                user_id=consumer_user.id,
                title="Test",
                body="Test body",
                data={},
                action_url="",
                notification_type=NotificationType.PRICE_ALERT,
            )

            # Token should be deleted
            assert not UserPushToken.objects.filter(pk=token.pk).exists()

    def test_dispatch_push_client_called_with_correct_message(self, consumer_user):
        """PushClient.publish se llama con el PushMessage correcto."""
        self._create_token(consumer_user, "ExponentPushToken[xyz]")

        with patch("apps.notifications.tasks.PushClient") as mock_client_cls, patch(
            "apps.notifications.tasks.redis_lib"
        ) as mock_redis_lib:
            mock_redis = MagicMock()
            mock_redis_lib.from_url.return_value = mock_redis
            mock_redis.incr.return_value = 1
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client

            from apps.notifications.tasks import dispatch_push_notification

            dispatch_push_notification(
                user_id=consumer_user.id,
                title="Alerta",
                body="Precio bajó",
                data={"product_id": 5},
                action_url="bargain://products/5",
                notification_type=NotificationType.PRICE_ALERT,
            )

            mock_client.publish.assert_called_once()
            call_args = mock_client.publish.call_args[0][0]
            assert call_args.to == "ExponentPushToken[xyz]"
            assert call_args.title == "Alerta"
            assert call_args.body == "Precio bajó"

    def test_dispatch_creates_notification_db_record(self, consumer_user):
        """Siempre crea un registro Notification en BD, con o sin tokens."""
        # No tokens for this user — dispatch still creates the DB record
        with patch("apps.notifications.tasks.redis_lib") as mock_redis_lib:
            mock_redis = MagicMock()
            mock_redis_lib.from_url.return_value = mock_redis
            mock_redis.incr.return_value = 1

            from apps.notifications.tasks import dispatch_push_notification

            dispatch_push_notification(
                user_id=consumer_user.id,
                title="Inbox notif",
                body="Body",
                data={},
                action_url="",
                notification_type=NotificationType.NEW_PROMO,
            )

        assert Notification.objects.filter(
            user=consumer_user, notification_type=NotificationType.NEW_PROMO
        ).exists()

    def test_dispatch_rate_limit_first_call_sets_expire(self, consumer_user):
        """Cuando count==1 (primer dispatch del día), se llama r.expire para 24h."""
        self._create_token(consumer_user)

        with patch("apps.notifications.tasks.PushClient") as mock_client_cls, patch(
            "apps.notifications.tasks.redis_lib"
        ) as mock_redis_lib:
            mock_redis = MagicMock()
            mock_redis_lib.from_url.return_value = mock_redis
            mock_redis.incr.return_value = 1
            mock_client_cls.return_value = MagicMock()

            from apps.notifications.tasks import dispatch_push_notification

            dispatch_push_notification(
                user_id=consumer_user.id,
                title="X",
                body="Y",
                data={},
                action_url="",
                notification_type=NotificationType.PRICE_ALERT,
            )

            # expire should be called with 86400 seconds
            mock_redis.expire.assert_called_once()
            call_args = mock_redis.expire.call_args
            assert call_args[0][1] == 86400
