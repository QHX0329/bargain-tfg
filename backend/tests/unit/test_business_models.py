"""
Tests unitarios para los modelos BusinessProfile y Promotion.

TDD Wave 0 RED — estos tests fallan hasta que los modelos existan.
"""

import pytest
from django.db import IntegrityError

pytestmark = pytest.mark.django_db


class TestBusinessProfileModel:
    """Tests para el modelo BusinessProfile."""

    def test_business_profile_fields(self, business_user):
        """BusinessProfile tiene todos los campos requeridos con valores por defecto correctos."""
        from apps.business.models import BusinessProfile

        profile = BusinessProfile.objects.create(
            user=business_user,
            business_name="Supermercado Local SA",
            tax_id="B12345678",
            address="Calle Mayor 1, Sevilla",
            website="https://supermercadolocal.es",
        )

        assert profile.business_name == "Supermercado Local SA"
        assert profile.tax_id == "B12345678"
        assert profile.address == "Calle Mayor 1, Sevilla"
        assert profile.website == "https://supermercadolocal.es"
        assert profile.is_verified is False
        assert profile.rejection_reason == ""
        assert profile.price_alert_threshold_pct == 10
        assert profile.created_at is not None
        assert profile.updated_at is not None

    def test_business_profile_is_verified_default_false(self, business_user):
        """Un nuevo BusinessProfile comienza siempre como no verificado."""
        from apps.business.models import BusinessProfile

        profile = BusinessProfile.objects.create(
            user=business_user,
            business_name="Tienda Test",
            tax_id="A87654321",
            address="Calle Test 2",
        )

        assert profile.is_verified is False

    def test_business_profile_rejection_reason_blank_default(self, business_user):
        """rejection_reason está vacío por defecto."""
        from apps.business.models import BusinessProfile

        profile = BusinessProfile.objects.create(
            user=business_user,
            business_name="Tienda Test 2",
            tax_id="C11223344",
            address="Calle Test 3",
        )

        assert profile.rejection_reason == ""

    def test_business_profile_price_alert_threshold_default_10(self, business_user):
        """price_alert_threshold_pct por defecto es 10."""
        from apps.business.models import BusinessProfile

        profile = BusinessProfile.objects.create(
            user=business_user,
            business_name="Tienda Umbral",
            tax_id="D55667788",
            address="Calle Umbral 4",
        )

        assert profile.price_alert_threshold_pct == 10

    def test_business_profile_str(self, business_user):
        """__str__ devuelve representación legible."""
        from apps.business.models import BusinessProfile

        profile = BusinessProfile.objects.create(
            user=business_user,
            business_name="Mi Tienda",
            tax_id="E99001122",
            address="Calle Test 5",
        )

        assert "Mi Tienda" in str(profile)


class TestPromotionModel:
    """Tests para el modelo Promotion."""

    def test_promotion_discount_type_choices(self, business_user, product, store):
        """Promotion.DiscountType tiene las choices 'flat' y 'percentage'."""
        from apps.business.models import Promotion

        assert Promotion.DiscountType.FLAT == "flat"
        assert Promotion.DiscountType.PERCENTAGE == "percentage"

    def test_promotion_create_flat_discount(self, business_user, product, store):
        """Se puede crear una promoción con descuento fijo."""
        from apps.business.models import Promotion

        promo = Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="2.50",
            start_date="2026-03-01",
            is_active=True,
        )

        assert promo.discount_type == "flat"
        assert str(promo.discount_value) == "2.50"
        assert promo.is_active is True
        assert promo.views == 0

    def test_promotion_create_percentage_discount(self, business_user, product, store):
        """Se puede crear una promoción con descuento porcentual."""
        from apps.business.models import Promotion

        promo = Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value="15.00",
            start_date="2026-03-01",
        )

        assert promo.discount_type == "percentage"

    def test_promotion_unique_constraint_raises_on_duplicate_active(self, product, store):
        """UniqueConstraint impide dos promociones activas para el mismo product+store."""
        from apps.business.models import Promotion

        Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="1.00",
            start_date="2026-03-01",
            is_active=True,
        )

        with pytest.raises(IntegrityError):
            Promotion.objects.create(
                product=product,
                store=store,
                discount_type=Promotion.DiscountType.PERCENTAGE,
                discount_value="5.00",
                start_date="2026-03-02",
                is_active=True,
            )

    def test_promotion_two_inactive_same_product_store_allowed(self, product, store):
        """Dos promociones inactivas para el mismo product+store no violan la constraint."""
        from apps.business.models import Promotion

        p1 = Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="1.00",
            start_date="2026-02-01",
            is_active=False,
        )
        p2 = Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="2.00",
            start_date="2026-03-01",
            is_active=False,
        )

        assert p1.pk != p2.pk

    def test_promotion_str(self, product, store):
        """__str__ devuelve representación legible."""
        from apps.business.models import Promotion

        promo = Promotion.objects.create(
            product=product,
            store=store,
            discount_type=Promotion.DiscountType.FLAT,
            discount_value="3.00",
            start_date="2026-03-01",
        )

        s = str(promo)
        assert "flat" in s or "3.00" in s


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def business_user(db):
    from apps.users.models import User

    return User.objects.create_user(
        username="bizuser",
        email="biz@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )


@pytest.fixture
def product(db):
    from apps.products.models import Category, Product

    cat, _ = Category.objects.get_or_create(name="Test Cat", slug="test-cat")
    return Product.objects.create(
        name="Producto Test",
        normalized_name="producto test",
        category=cat,
        unit="kg",
    )


@pytest.fixture
def store(db):
    from django.contrib.gis.geos import Point

    from apps.stores.models import Store

    return Store.objects.create(
        name="Tienda Test",
        address="Calle Test 1",
        location=Point(float("-5.9845"), float("37.3891"), srid=4326),
        is_local_business=True,
    )
