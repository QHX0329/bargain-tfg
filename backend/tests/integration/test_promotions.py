"""
Tests de integración para el sistema de promociones.

TDD Wave 0 RED — estos tests fallan hasta que PromotionViewSet y la tarea Celery estén implementados.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestPromotions:
    """Tests para PromotionViewSet y deactivate_expired_promotions."""

    def test_verified_business_can_create_promotion(
        self, api_client, verified_business_user, business_store, product
    ):
        """Un negocio verificado puede crear una promoción."""
        api_client.force_authenticate(user=verified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "discount_type": "flat",
            "discount_value": "1.50",
            "start_date": "2026-03-01",
        }
        response = api_client.post("/api/v1/business/promotions/", data=payload, format="json")

        assert response.status_code == 201

    def test_deactivate_action_sets_is_active_false(
        self, api_client, verified_business_user, active_promotion
    ):
        """La acción deactivate marca la promoción como is_active=False."""
        api_client.force_authenticate(user=verified_business_user)
        url = f"/api/v1/business/promotions/{active_promotion.id}/deactivate/"
        response = api_client.post(url)

        assert response.status_code == 200
        active_promotion.refresh_from_db()
        assert active_promotion.is_active is False

    def test_second_active_promo_same_product_store_returns_409(
        self, api_client, verified_business_user, business_store, product, active_promotion
    ):
        """Crear una segunda promoción activa para el mismo product+store devuelve 409."""
        api_client.force_authenticate(user=verified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "discount_type": "percentage",
            "discount_value": "10.00",
            "start_date": "2026-03-10",
        }
        response = api_client.post("/api/v1/business/promotions/", data=payload, format="json")

        assert response.status_code == 409

    def test_deactivate_expired_promotions_task(self, db, product, business_store):
        """La tarea deactivate_expired_promotions marca como inactivas las promociones caducadas."""
        from datetime import date, timedelta

        from apps.business.models import Promotion
        from apps.business.tasks import deactivate_expired_promotions

        past_date = date.today() - timedelta(days=1)
        promo = Promotion.objects.create(
            product=product,
            store=business_store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="2.00",
            start_date="2026-01-01",
            end_date=past_date,
            is_active=True,
        )

        deactivate_expired_promotions()

        promo.refresh_from_db()
        assert promo.is_active is False

    def test_unverified_business_cannot_create_promotion(
        self, api_client, unverified_business_user, business_store, product
    ):
        """Un negocio no verificado no puede crear promociones."""
        api_client.force_authenticate(user=unverified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "discount_type": "flat",
            "discount_value": "1.00",
            "start_date": "2026-03-01",
        }
        response = api_client.post("/api/v1/business/promotions/", data=payload, format="json")

        assert response.status_code == 403


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def verified_business_user(db):
    from apps.business.models import BusinessProfile
    from apps.users.models import User

    user = User.objects.create_user(
        username="verified_promo",
        email="verified_promo@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )
    BusinessProfile.objects.create(
        user=user,
        business_name="Negocio Promos",
        tax_id="I22334455",
        address="Calle Promos 15",
        is_verified=True,
    )
    return user


@pytest.fixture
def unverified_business_user(db):
    from apps.business.models import BusinessProfile
    from apps.users.models import User

    user = User.objects.create_user(
        username="unverified_promo",
        email="unverified_promo@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )
    BusinessProfile.objects.create(
        user=user,
        business_name="Negocio No Verificado Promo",
        tax_id="J55443322",
        address="Calle No Verificado 16",
        is_verified=False,
    )
    return user


@pytest.fixture
def product(db):
    from apps.products.models import Category, Product

    cat, _ = Category.objects.get_or_create(name="Cat Promos", slug="cat-promos")
    return Product.objects.create(
        name="Producto Promo Test",
        normalized_name="producto promo test",
        category=cat,
        unit="ud",
    )


@pytest.fixture
def business_store(db, verified_business_user):
    from django.contrib.gis.geos import Point

    from apps.business.models import BusinessProfile
    from apps.stores.models import Store

    profile = BusinessProfile.objects.get(user=verified_business_user)
    return Store.objects.create(
        name="Tienda Promo Test",
        address="Calle Promo 25",
        location=Point(float("-5.9845"), float("37.3891"), srid=4326),
        is_local_business=True,
        business_profile=profile,
    )


@pytest.fixture
def active_promotion(db, product, business_store):
    from apps.business.models import Promotion

    return Promotion.objects.create(
        product=product,
        store=business_store,
        discount_type=Promotion.DiscountType.FLAT,
        discount_value="1.00",
        start_date="2026-03-01",
        is_active=True,
    )
