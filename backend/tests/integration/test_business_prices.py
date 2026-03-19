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

    def test_cannot_post_price_for_other_business_store(
        self, api_client, verified_business_user, product
    ):
        """Un negocio verificado no puede crear precios para tiendas de otro negocio."""
        from django.contrib.gis.geos import Point

        from apps.business.models import BusinessProfile
        from apps.stores.models import Store
        from apps.users.models import User

        other_user = User.objects.create_user(
            username="other_biz",
            email="other@test.com",
            password="pass1234",
            role=User.Role.BUSINESS,
        )
        other_profile = BusinessProfile.objects.create(
            user=other_user,
            business_name="Otro Negocio",
            tax_id="Z99887766",
            address="Otra Calle",
            is_verified=True,
        )
        other_store = Store.objects.create(
            name="Tienda Ajena",
            address="Calle Ajena 1",
            location=Point(-5.98, 37.39, srid=4326),
            business_profile=other_profile,
        )
        api_client.force_authenticate(user=verified_business_user)
        response = api_client.post(
            "/api/v1/business/prices/",
            data={"product": product.id, "store": other_store.id, "price": "1.00"},
            format="json",
        )
        assert response.status_code == 400

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

        price = Price.objects.filter(
            product=product, store=business_store, source="business"
        ).first()
        assert price is not None
        assert price.is_stale is False

    def test_verified_business_can_list_owned_stores(
        self, api_client, verified_business_user, business_store
    ):
        """Un negocio verificado puede listar únicamente sus tiendas activas."""
        api_client.force_authenticate(user=verified_business_user)

        response = api_client.get("/api/v1/business/prices/stores/")

        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) == 1
        assert response.data[0]["id"] == business_store.id
        assert response.data[0]["name"] == business_store.name

    def test_verified_business_can_patch_price_offer_fields(
        self, api_client, verified_business_user, business_store, product
    ):
        """Un negocio verificado puede actualizar offer_price y offer_end_date vía PATCH."""
        from apps.prices.models import Price

        api_client.force_authenticate(user=verified_business_user)
        created = api_client.post(
            "/api/v1/business/prices/",
            data={
                "product": product.id,
                "store": business_store.id,
                "price": "2.50",
            },
            format="json",
        )
        assert created.status_code == 201

        price_id = created.data["id"]
        response = api_client.patch(
            f"/api/v1/business/prices/{price_id}/",
            data={
                "offer_price": "2.10",
                "offer_end_date": "2026-04-30",
            },
            format="json",
        )

        assert response.status_code == 200
        price_obj = Price.objects.get(id=price_id)
        assert str(price_obj.offer_price) == "2.10"
        assert str(price_obj.offer_end_date) == "2026-04-30"


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
