"""Tests de integración para los eventos que disparan notificaciones."""

from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from tests.factories import (
    ProductFactory,
    ShoppingListFactory,
    StoreFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestPriceAlertTriggersNotification:
    """Test: check_price_alerts llama a dispatch_push_notification.delay."""

    def test_check_price_alerts_triggers_dispatch(self, consumer_user):
        """Cuando check_price_alerts activa una alerta, llama a dispatch_push_notification.delay."""
        from apps.prices.models import Price, PriceAlert

        product = ProductFactory()
        store = StoreFactory()

        alert = PriceAlert.objects.create(
            user=consumer_user,
            product=product,
            target_price="5.00",
            is_active=True,
        )
        # Current price below target
        Price.objects.create(
            product=product,
            store=store,
            price="4.00",
            source="scraping",
            is_stale=False,
        )

        with patch(
            "apps.notifications.tasks.dispatch_push_notification.delay"
        ) as mock_delay:
            from apps.prices.tasks import check_price_alerts

            check_price_alerts()

        mock_delay.assert_called_once()
        kwargs = mock_delay.call_args[1]
        assert kwargs["user_id"] == consumer_user.id
        assert kwargs["notification_type"] == "price_alert"
        alert.refresh_from_db()
        assert not alert.is_active

    def test_check_price_alerts_no_dispatch_when_push_disabled(self, consumer_user):
        """No se dispatch si push_notifications_enabled=False."""
        from apps.prices.models import Price, PriceAlert

        consumer_user.push_notifications_enabled = False
        consumer_user.save()

        product = ProductFactory()
        store = StoreFactory()

        PriceAlert.objects.create(
            user=consumer_user,
            product=product,
            target_price="5.00",
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=store,
            price="4.00",
            source="scraping",
            is_stale=False,
        )

        with patch(
            "apps.notifications.tasks.dispatch_push_notification.delay"
        ) as mock_delay:
            from apps.prices.tasks import check_price_alerts

            check_price_alerts()

        mock_delay.assert_not_called()


@pytest.mark.django_db
class TestPromoCreationTriggersNotification:
    """Test: Promotion creation calls notify_new_promo_at_store.delay."""

    def test_promo_creation_triggers_notify_task(self, verified_business_user, db):
        """POST /api/v1/business/promotions/ llama a notify_new_promo_at_store.delay."""
        from apps.business.models import BusinessProfile
        from apps.products.models import Category, Product
        from apps.stores.models import Store

        profile = BusinessProfile.objects.get(user=verified_business_user)
        cat, _ = Category.objects.get_or_create(name="Cat Notif", slug="cat-notif")
        product = Product.objects.create(
            name="Producto Test Notif",
            normalized_name="producto test notif",
            category=cat,
            unit="ud",
        )
        store = Store.objects.create(
            name="Tienda Notif Test",
            address="Calle Notif 10",
            location=Point(-5.9845, 37.3891, srid=4326),
            is_local_business=True,
            business_profile=profile,
        )

        client = APIClient()
        client.force_authenticate(user=verified_business_user)

        with patch(
            "apps.notifications.tasks.notify_new_promo_at_store.delay"
        ) as mock_delay:
            resp = client.post(
                "/api/v1/business/promotions/",
                {
                    "store": store.id,
                    "product": product.id,
                    "discount_type": "percentage",
                    "discount_value": "10.00",
                    "title": "Super oferta",
                    "is_active": True,
                    "start_date": "2026-03-17",
                },
                format="json",
            )

        assert resp.status_code == 201
        promotion_id = resp.data["id"]
        mock_delay.assert_called_once_with(promotion_id)


@pytest.mark.django_db
class TestSharedListNotificationTrigger:
    """Test: _trigger_list_notification schedules send_shared_list_notification."""

    def test_trigger_schedules_send_shared_list_notification(
        self, authenticated_client, consumer_user
    ):
        """Añadir ítem a lista compartida programa send_shared_list_notification con countdown=900."""
        from apps.shopping_lists.models import ListCollaborator, ShoppingList

        product = ProductFactory()
        shopping_list = ShoppingListFactory(owner=consumer_user)
        # Add a collaborator so notification is relevant
        collab_user = UserFactory()
        ListCollaborator.objects.create(
            shopping_list=shopping_list,
            user=collab_user,
            invited_by=consumer_user,
        )

        with patch("apps.shopping_lists.views.redis_lib") as mock_redis_lib, patch(
            "apps.notifications.tasks.send_shared_list_notification.apply_async"
        ) as mock_apply_async:
            mock_redis = mock_redis_lib.from_url.return_value
            # Key not set — first trigger
            mock_redis.exists.return_value = False

            resp = authenticated_client.post(
                f"/api/v1/lists/{shopping_list.id}/items/",
                {"product": product.id, "quantity": 1},
                format="json",
            )

        assert resp.status_code == 201
        mock_apply_async.assert_called_once()
        call_kwargs = mock_apply_async.call_args[1]
        assert call_kwargs["countdown"] == 900

    def test_trigger_skips_if_lock_already_set(self, authenticated_client, consumer_user):
        """Si la clave lock ya existe en Redis, no se reprograma la notificación."""
        from apps.shopping_lists.models import ListCollaborator, ShoppingList

        product = ProductFactory()
        shopping_list = ShoppingListFactory(owner=consumer_user)
        collab_user = UserFactory()
        ListCollaborator.objects.create(
            shopping_list=shopping_list,
            user=collab_user,
            invited_by=consumer_user,
        )

        with patch("apps.shopping_lists.views.redis_lib") as mock_redis_lib, patch(
            "apps.notifications.tasks.send_shared_list_notification.apply_async"
        ) as mock_apply_async:
            mock_redis = mock_redis_lib.from_url.return_value
            # Key already set
            mock_redis.exists.return_value = True

            product2 = ProductFactory()
            resp = authenticated_client.post(
                f"/api/v1/lists/{shopping_list.id}/items/",
                {"product": product2.id, "quantity": 1},
                format="json",
            )

        assert resp.status_code == 201
        mock_apply_async.assert_not_called()


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def verified_business_user(db):
    from apps.business.models import BusinessProfile
    from apps.users.models import User

    user = User.objects.create_user(
        username="verified_notif_biz",
        email="verified_notif_biz@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )
    BusinessProfile.objects.create(
        user=user,
        business_name="Negocio Notificaciones",
        tax_id="N99887766",
        address="Calle Notificaciones 20",
        is_verified=True,
    )
    return user
