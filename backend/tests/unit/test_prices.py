"""
Tests unitarios para el módulo de precios.

Cubre las tareas Celery: expire_stale_prices, check_price_alerts, purge_old_price_history.
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.prices.models import Price, PriceAlert
from apps.prices.tasks import check_price_alerts, expire_stale_prices, purge_old_price_history

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def product(db):
    """Producto de prueba."""
    from apps.products.models import Product

    return Product.objects.create(name="Leche Entera 1L", normalized_name="leche entera 1l")


@pytest.fixture
def store(db):
    """Tienda de prueba en Sevilla."""
    from apps.stores.models import Store

    return Store.objects.create(
        name="Mercadona Test",
        address="Calle Test 1, Sevilla",
        location=Point(-5.9845, 37.3891, srid=4326),
        is_active=True,
    )


@pytest.fixture
def user(db, django_user_model):
    """Usuario de prueba."""
    return django_user_model.objects.create_user(
        username="testuser_prices",
        email="prices@test.com",
        password="testpass123",
    )


# ── TestExpireStaleTask ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExpireStaleTask:
    """Tests para expire_stale_prices."""

    def test_marks_old_scraping_prices_stale(self, product, store):
        """Precios de scraping con más de 48h se marcan como is_stale=True."""
        old_verified = timezone.now() - timedelta(hours=49)
        price = Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
            verified_at=old_verified,
        )

        result = expire_stale_prices.apply()

        price.refresh_from_db()
        assert price.is_stale is True
        assert result.result["scraping"] == 1
        assert result.result["crowdsourcing"] == 0

    def test_marks_old_crowdsourcing_prices_stale(self, product, store):
        """Precios de crowdsourcing con más de 24h se marcan como is_stale=True."""
        old_verified = timezone.now() - timedelta(hours=25)
        price = Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.CROWDSOURCING,
            is_stale=False,
            verified_at=old_verified,
        )

        result = expire_stale_prices.apply()

        price.refresh_from_db()
        assert price.is_stale is True
        assert result.result["crowdsourcing"] == 1

    def test_does_not_mark_fresh_scraping_price_stale(self, product, store):
        """Precios de scraping con menos de 48h NO se marcan como stale."""
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
            verified_at=timezone.now() - timedelta(hours=47),
        )

        result = expire_stale_prices.apply()

        assert result.result["scraping"] == 0

    def test_does_not_mark_fresh_crowdsourcing_price_stale(self, product, store):
        """Precios de crowdsourcing con menos de 24h NO se marcan como stale."""
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.CROWDSOURCING,
            is_stale=False,
            verified_at=timezone.now() - timedelta(hours=23),
        )

        result = expire_stale_prices.apply()

        assert result.result["crowdsourcing"] == 0

    def test_already_stale_prices_not_counted_again(self, product, store):
        """Precios ya stale no se cuentan de nuevo."""
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=True,  # Ya stale
            verified_at=timezone.now() - timedelta(hours=72),
        )

        result = expire_stale_prices.apply()

        assert result.result["scraping"] == 0

    def test_uses_mocked_timezone_now(self, product, store):
        """Con timezone.now mockeado se puede simular el paso del tiempo."""
        # Precio creado "hace 1 hora" según el reloj real
        price = Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
            verified_at=timezone.now() - timedelta(hours=1),
        )

        # Mockeamos timezone.now para que parezca que han pasado 50 horas más
        future_now = timezone.now() + timedelta(hours=50)
        with patch("apps.prices.tasks.timezone.now", return_value=future_now):
            result = expire_stale_prices.apply()

        price.refresh_from_db()
        assert price.is_stale is True
        assert result.result["scraping"] == 1


# ── TestCheckAlertsTask ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCheckAlertsTask:
    """Tests para check_price_alerts."""

    def test_triggers_alert_when_price_below_target(self, product, store, user):
        """Alerta se dispara si el precio actual <= target_price."""
        alert = PriceAlert.objects.create(
            user=user,
            product=product,
            target_price="2.00",
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=store,
            price="1.99",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        result = check_price_alerts.apply()

        alert.refresh_from_db()
        assert alert.triggered_at is not None
        assert alert.is_active is False
        assert result.result["triggered"] == 1

    def test_triggers_alert_when_price_equals_target(self, product, store, user):
        """Alerta se dispara si el precio actual == target_price (borde)."""
        alert = PriceAlert.objects.create(
            user=user,
            product=product,
            target_price="1.50",
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        result = check_price_alerts.apply()

        alert.refresh_from_db()
        assert alert.triggered_at is not None
        assert result.result["triggered"] == 1

    def test_does_not_trigger_alert_when_price_above_target(self, product, store, user):
        """Alerta NO se dispara si el precio actual > target_price."""
        alert = PriceAlert.objects.create(
            user=user,
            product=product,
            target_price="1.00",
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        result = check_price_alerts.apply()

        alert.refresh_from_db()
        assert alert.triggered_at is None
        assert alert.is_active is True
        assert result.result["triggered"] == 0

    def test_ignores_stale_prices(self, product, store, user):
        """Precios stale no se consideran para disparar alertas."""
        alert = PriceAlert.objects.create(
            user=user,
            product=product,
            target_price="2.00",
            is_active=True,
        )
        Price.objects.create(
            product=product,
            store=store,
            price="0.99",  # Muy barato, pero stale
            source=Price.Source.SCRAPING,
            is_stale=True,
        )

        result = check_price_alerts.apply()

        alert.refresh_from_db()
        assert alert.triggered_at is None
        assert result.result["triggered"] == 0

    def test_skips_inactive_alerts(self, product, store, user):
        """Alertas inactivas no se procesan."""
        PriceAlert.objects.create(
            user=user,
            product=product,
            target_price="2.00",
            is_active=False,  # Inactiva
        )
        Price.objects.create(
            product=product,
            store=store,
            price="1.00",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        result = check_price_alerts.apply()

        assert result.result["triggered"] == 0

    def test_respects_store_filter(self, product, store, user, db):
        """Alerta con tienda específica solo considera precios de esa tienda."""
        from apps.stores.models import Store

        other_store = Store.objects.create(
            name="Otra Tienda",
            address="Calle Otra 1",
            location=Point(-5.98, 37.39, srid=4326),
            is_active=True,
        )
        alert = PriceAlert.objects.create(
            user=user,
            product=product,
            store=store,  # Alerta solo para 'store'
            target_price="2.00",
            is_active=True,
        )
        # Precio bajo en otra tienda — NO debe disparar la alerta
        Price.objects.create(
            product=product,
            store=other_store,
            price="0.50",
            source=Price.Source.SCRAPING,
            is_stale=False,
        )

        result = check_price_alerts.apply()

        alert.refresh_from_db()
        assert alert.triggered_at is None
        assert result.result["triggered"] == 0


# ── TestPurgeHistory ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPurgeHistory:
    """Tests para purge_old_price_history."""

    def test_deletes_prices_older_than_90_days(self, product, store):
        """Precios con created_at > 90 días se eliminan definitivamente."""
        old_created = timezone.now() - timedelta(days=91)
        price = Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
        )
        # Actualizar created_at directamente en la BD (auto_now_add no permite asignación)
        Price.objects.filter(pk=price.pk).update(created_at=old_created)

        result = purge_old_price_history.apply()

        assert not Price.objects.filter(pk=price.pk).exists()
        assert result.result["deleted"] == 1

    def test_does_not_delete_recent_prices(self, product, store):
        """Precios recientes (< 90 días) NO se eliminan."""
        Price.objects.create(
            product=product,
            store=store,
            price="1.50",
            source=Price.Source.SCRAPING,
        )

        result = purge_old_price_history.apply()

        assert Price.objects.count() == 1
        assert result.result["deleted"] == 0

    def test_returns_deleted_count(self, product, store):
        """La tarea devuelve el conteo correcto de registros eliminados."""
        old_created = timezone.now() - timedelta(days=95)
        for _ in range(3):
            p = Price.objects.create(
                product=product,
                store=store,
                price="1.50",
                source=Price.Source.SCRAPING,
            )
            Price.objects.filter(pk=p.pk).update(created_at=old_created)

        result = purge_old_price_history.apply()

        assert result.result["deleted"] == 3
