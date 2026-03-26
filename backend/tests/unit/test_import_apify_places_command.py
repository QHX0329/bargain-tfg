"""Tests del comando import_apify_places."""

from __future__ import annotations

import json

import pytest
from django.core.management import call_command


def _write_payload(tmp_path, payload: dict, file_name: str = "apify_places.json") -> str:
    file_path = tmp_path / file_name
    file_path.write_text(json.dumps(payload), encoding="utf-8")
    return str(file_path)


@pytest.mark.django_db
def test_import_apify_places_creates_known_chain_store(tmp_path):
    from apps.stores.models import Store

    payload = {
        "items": [
            {
                "title": "Mercadona Triana",
                "state": "Sevilla",
                "countryCode": "ES",
                "categoryName": "Supermercado",
                "categories": ["Supermercado"],
                "address": "Calle Test 1, Sevilla",
                "url": "https://www.google.com/maps/search/?api=1&query_place_id=place-001",
                "location": {"lat": 37.38, "lng": -6.0},
            },
            {
                "title": "Farmacia Centro",
                "state": "Sevilla",
                "countryCode": "ES",
                "categoryName": "Farmacia",
                "categories": ["Farmacia"],
                "address": "Calle Test 2, Sevilla",
                "url": "https://www.google.com/maps/search/?api=1&query_place_id=place-002",
                "location": {"lat": 37.39, "lng": -5.99},
            },
        ]
    }
    input_file = _write_payload(tmp_path, payload)

    call_command("import_apify_places", input_file=input_file, province="Sevilla")

    assert Store.objects.count() == 1
    store = Store.objects.get()
    assert store.name == "Mercadona Triana"
    assert store.chain is not None
    assert store.chain.name == "Mercadona"
    assert store.is_local_business is False
    assert store.google_place_id == "place-001"


@pytest.mark.django_db
def test_import_apify_places_marks_local_food_business(tmp_path):
    from apps.stores.models import Store

    payload = {
        "items": [
            {
                "title": "Fruteria Barrio Norte",
                "state": "Sevilla",
                "countryCode": "ES",
                "categoryName": "Fruteria",
                "categories": ["Fruteria", "Comercio"],
                "address": "Calle Test 3, Sevilla",
                "url": "https://www.google.com/maps/search/?api=1&query_place_id=place-003",
                "location": {"lat": 37.4, "lng": -5.98},
            }
        ]
    }
    input_file = _write_payload(tmp_path, payload)

    call_command("import_apify_places", input_file=input_file, province="Sevilla")

    store = Store.objects.get()
    assert store.chain is None
    assert store.is_local_business is True


@pytest.mark.django_db
def test_import_apify_places_updates_existing_store_by_place_id(tmp_path):
    from apps.stores.models import Store

    payload_initial = {
        "items": [
            {
                "title": "Mercadona Inicial",
                "state": "Sevilla",
                "countryCode": "ES",
                "categoryName": "Supermercado",
                "categories": ["Supermercado"],
                "address": "Calle Inicial 1, Sevilla",
                "url": "https://www.google.com/maps/search/?api=1&query_place_id=place-004",
                "location": {"lat": 37.41, "lng": -5.97},
            }
        ]
    }
    payload_updated = {
        "items": [
            {
                "title": "Mercadona Actualizada",
                "state": "Sevilla",
                "countryCode": "ES",
                "categoryName": "Supermercado",
                "categories": ["Supermercado"],
                "address": "Calle Actualizada 9, Sevilla",
                "url": "https://www.google.com/maps/search/?api=1&query_place_id=place-004",
                "location": {"lat": 37.42, "lng": -5.96},
            }
        ]
    }

    input_initial = _write_payload(tmp_path, payload_initial, file_name="initial.json")
    input_updated = _write_payload(tmp_path, payload_updated, file_name="updated.json")

    call_command("import_apify_places", input_file=input_initial, province="Sevilla")
    call_command("import_apify_places", input_file=input_updated, province="Sevilla")

    assert Store.objects.count() == 1
    store = Store.objects.get()
    assert store.name == "Mercadona Actualizada"
    assert store.address == "Calle Actualizada 9, Sevilla"
