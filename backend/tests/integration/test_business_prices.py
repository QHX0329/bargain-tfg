"""
Tests de integración para el portal de precios del negocio.

TDD Wave 0 RED — estos tests fallan hasta que BusinessPriceViewSet esté implementado.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestBusinessPrices:
    """Tests para el endpoint de precios de negocio."""

    def test_verified_business_can_post_price(
        self, api_client, verified_business_user, business_store, product
    ):
        """Un negocio verificado puede crear un precio con source='business'."""
        api_client.force_authenticate(user=verified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "price": "1.99",
        }
        response = api_client.post("/api/v1/business/prices/", data=payload, format="json")

        assert response.status_code == 201
        from apps.prices.models import Price

        price = Price.objects.get(product=product, store=business_store, source="business")
        assert str(price.price) == "1.99"
        assert price.source == "business"
        assert price.is_stale is False

    def test_unverified_business_cannot_post_price(
        self, api_client, unverified_business_user, business_store, product
    ):
        """Un negocio no verificado recibe 403 al intentar crear un precio."""
        api_client.force_authenticate(user=unverified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "price": "2.49",
        }
        response = api_client.post("/api/v1/business/prices/", data=payload, format="json")

        assert response.status_code == 403

    def test_business_price_is_stale_never_true(
        self, api_client, verified_business_user, business_store, product
    ):
        """Un precio con source='business' siempre tiene is_stale=False."""
        api_client.force_authenticate(user=verified_business_user)
        payload = {
            "product": product.id,
            "store": business_store.id,
            "price": "3.00",
        }
        api_client.post("/api/v1/business/prices/", data=payload, format="json")

        from apps.prices.models import Price

        price = Price.objects.filter(product=product, store=business_store, source="business").first()
        assert price is not None
        assert price.is_stale is False


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def verified_business_user(db):
    from apps.business.models import BusinessProfile
    from apps.users.models import User

    user = User.objects.create_user(
        username="verified_biz",
        email="verified_biz@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )
    BusinessProfile.objects.create(
        user=user,
        business_name="Negocio Verificado",
        tax_id="G77889900",
        address="Calle Verificado 10",
        is_verified=True,
    )
    return user


@pytest.fixture
def unverified_business_user(db):
    from apps.business.models import BusinessProfile
    from apps.users.models import User

    user = User.objects.create_user(
        username="unverified_biz",
        email="unverified_biz@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )
    BusinessProfile.objects.create(
        user=user,
        business_name="Negocio No Verificado",
        tax_id="H11001100",
        address="Calle No Verificado 11",
        is_verified=False,
    )
    return user


@pytest.fixture
def product(db):
    from apps.products.models import Category, Product

    cat, _ = Category.objects.get_or_create(name="Cat Prices", slug="cat-prices")
    return Product.objects.create(
        name="Producto Precio Test",
        normalized_name="producto precio test",
        category=cat,
        unit="ud",
    )


@pytest.fixture
def business_store(db, verified_business_user):
    from django.contrib.gis.geos import Point

    from apps.business.models import BusinessProfile
    from apps.stores.models import Store

    profile = BusinessProfile.objects.get(user=verified_business_user)
    store = Store.objects.create(
        name="Tienda Negocio Test",
        address="Calle Negocio 20",
        location=Point(float("-5.9845"), float("37.3891"), srid=4326),
        is_local_business=True,
        business_profile=profile,
    )
    return store
