"""Tests del comando seed_data restringido a usuarios y tiendas reales."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core.management import call_command

from apps.business.models import BusinessProfile, Promotion
from apps.core.management.commands.seed_data import CHAIN_SPECS, SEED_PREFIX
from apps.notifications.models import Notification, UserPushToken
from apps.prices.models import Price, PriceAlert
from apps.products.models import Category, Product, ProductProposal
from apps.shopping_lists.models import (
    ListCollaborator,
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)
from apps.stores.models import Store, StoreChain, UserFavoriteStore


@pytest.mark.django_db
def test_seed_data_creates_expected_users() -> None:
    """Crea admin y cantidades solicitadas por rol."""
    user_model = get_user_model()

    call_command("seed_data", consumers=2, businesses=1)

    seed_users = user_model.objects.filter(username__startswith=SEED_PREFIX)
    assert seed_users.count() == 4
    assert user_model.objects.filter(username="seed_admin", is_superuser=True).exists()
    assert user_model.objects.filter(username="seed_consumer_1", role="consumer").exists()
    assert user_model.objects.filter(username="seed_business_1", role="business").exists()


@pytest.mark.django_db
def test_seed_data_is_idempotent() -> None:
    """No duplica usuarios ni tiendas al ejecutar varias veces."""
    user_model = get_user_model()

    call_command("seed_data", consumers=3, businesses=2)
    first_user_count = user_model.objects.filter(username__startswith=SEED_PREFIX).count()
    first_store_count = Store.objects.count()
    first_chain_count = StoreChain.objects.count()

    call_command("seed_data", consumers=3, businesses=2)

    assert user_model.objects.filter(username__startswith=SEED_PREFIX).count() == first_user_count
    assert Store.objects.count() == first_store_count
    assert StoreChain.objects.count() == first_chain_count


@pytest.mark.django_db
def test_seed_data_reset_recreates_only_managed_records() -> None:
    """Con --reset limpia usuarios seed y tiendas gestionadas por el comando."""
    user_model = get_user_model()

    user_model.objects.create_user(
        username="manual_user",
        email="manual@example.com",
        password="manualpass123",
        role="consumer",
    )
    StoreChain.objects.create(name="Cadena Manual", slug="manual-chain")
    Store.objects.create(
        name="Tienda Manual",
        address="Calle Manual 1",
        location=Point(-5.98, 37.38, srid=4326),
        is_active=True,
    )

    call_command("seed_data", consumers=2, businesses=1)
    call_command("seed_data", consumers=1, businesses=0, reset=True)

    assert user_model.objects.filter(username="manual_user").exists()
    assert StoreChain.objects.filter(slug="manual-chain").exists()
    assert Store.objects.filter(name="Tienda Manual").exists()
    assert user_model.objects.filter(username__startswith=SEED_PREFIX).count() == 2
    assert user_model.objects.filter(username="seed_admin").exists()
    assert user_model.objects.filter(username="seed_consumer_1").exists()
    assert not user_model.objects.filter(username="seed_consumer_2").exists()
    assert not user_model.objects.filter(username="seed_business_1").exists()


@pytest.mark.django_db
def test_seed_data_populates_only_users_and_real_scraping_stores() -> None:
    """No genera catálogo ni datos demo inventados."""
    call_command("seed_data", consumers=3, businesses=2, reset=True)

    assert not Category.objects.exists()
    assert not Product.objects.exists()
    assert not ProductProposal.objects.exists()
    assert not Price.objects.exists()
    assert not PriceAlert.objects.exists()
    assert not ShoppingList.objects.exists()
    assert not ShoppingListItem.objects.exists()
    assert not ListCollaborator.objects.exists()
    assert not ListTemplate.objects.exists()
    assert not ListTemplateItem.objects.exists()
    assert not BusinessProfile.objects.exists()
    assert not Promotion.objects.exists()
    assert not Notification.objects.exists()
    assert not UserPushToken.objects.exists()
    assert not UserFavoriteStore.objects.exists()

    expected_slugs = {slug for _, slug in CHAIN_SPECS}
    assert set(StoreChain.objects.values_list("slug", flat=True)) == expected_slugs
    assert Store.objects.filter(chain__slug__in=expected_slugs, is_active=True).exists()
