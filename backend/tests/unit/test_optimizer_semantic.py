"""Tests de desambiguacion semantica del optimizador (Gemini + fallback heuristico)."""

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.gis.geos import Point
from django.utils import timezone
from google.genai import errors as genai_errors

from apps.optimizer.services.semantic import SemanticIntent, select_semantic_intent


def _candidate(product_id: int, name: str, category: str = "Panaderia") -> SimpleNamespace:
    return SimpleNamespace(
        id=product_id,
        name=name,
        brand="",
        category=SimpleNamespace(name=category),
        unit="units",
        unit_quantity=1.0,
    )


@patch("apps.optimizer.services.semantic.genai.Client")
def test_select_semantic_intent_uses_gemini_json_output(mock_client_class, settings):
    """El servicio parsea JSON de Gemini y conserva IDs validos por orden."""
    settings.GEMINI_API_KEY = "test-key"
    settings.GEMINI_PRODUCT_MATCH_MODEL = "gemini-3-flash-preview"

    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_response = MagicMock()
    mock_response.text = (
        '{"preferred_product_ids":[2],"alternative_product_ids":[3,1],'
        '"needs_user_confirmation":true,"rationale":"consulta generica",'
        '"search_hints":["indica tipo de pan"]}'
    )
    mock_client.models.generate_content.return_value = mock_response

    candidates = [
        _candidate(1, "Pan rallado"),
        _candidate(2, "Barra de pan"),
        _candidate(3, "Pan chapata"),
    ]

    intent = select_semantic_intent("pan", candidates)

    assert intent.preferred_product_ids == (2,)
    assert intent.alternative_product_ids[:2] == (3, 1)
    assert intent.needs_user_confirmation is True
    assert "generica" in intent.rationale

    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == settings.GEMINI_PRODUCT_MATCH_MODEL


@patch("apps.optimizer.services.semantic.genai.Client")
def test_select_semantic_intent_falls_back_to_heuristics_on_api_error(mock_client_class, settings):
    """Si Gemini falla, se usa fallback y se evita una variante transformada no solicitada."""
    settings.GEMINI_API_KEY = "test-key"

    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.models.generate_content.side_effect = genai_errors.APIError(
        "api-error",
        response_json={"error": {}},
    )

    candidates = [
        _candidate(1, "Pan rallado"),
        _candidate(2, "Barra de pan"),
    ]

    intent = select_semantic_intent("pan", candidates)

    assert 2 in intent.preferred_product_ids
    assert 1 not in intent.preferred_product_ids


@patch("apps.optimizer.services.semantic.genai.Client")
def test_select_semantic_intent_falls_back_on_unexpected_error(mock_client_class, settings):
    """Un fallo no-Gemini (timeout/red) NO debe propagarse: degrada a la heuristica.

    Regresion: antes, cualquier excepcion fuera de genai_errors (p. ej. un timeout
    de httpx) escapaba de select_semantic_intent, subia por resolve_list_items y
    optimize_shopping_list y abortaba toda la optimizacion con un HTTP 500.
    """
    settings.GEMINI_API_KEY = "test-key"

    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    # Excepcion que NO es subclase de google.genai.errors.APIError.
    mock_client.models.generate_content.side_effect = TimeoutError("network timeout")

    candidates = [
        _candidate(1, "Pan rallado"),
        _candidate(2, "Barra de pan"),
    ]

    # No debe lanzar: cae al fallback heuristico.
    intent = select_semantic_intent("pan", candidates)

    assert 2 in intent.preferred_product_ids
    assert 1 not in intent.preferred_product_ids


@pytest.mark.django_db
def test_resolve_list_items_prioritizes_semantic_preferred_product(consumer_user):
    """La resolucion selecciona el producto preferido semanticamente aunque sea mas caro."""
    from apps.optimizer.services.matching import resolve_list_items
    from apps.prices.models import Price
    from apps.products.models import Category, Product
    from apps.shopping_lists.models import ShoppingList, ShoppingListItem
    from apps.stores.models import Store, StoreChain

    category = Category.objects.create(name="Panaderia")
    pan_rallado = Product.objects.create(
        name="Pan rallado",
        normalized_name="pan rallado",
        category=category,
        is_active=True,
    )
    pan_barra = Product.objects.create(
        name="Barra de pan",
        normalized_name="barra de pan",
        category=category,
        is_active=True,
    )

    chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
    store = Store.objects.create(
        name="Mercadona Centro",
        chain=chain,
        address="Calle Test 1, Sevilla",
        location=Point(-5.9845, 37.3891, srid=4326),
        is_active=True,
    )

    Price.objects.create(product=pan_rallado, store=store, price="0.85", source="scraping")
    Price.objects.create(product=pan_barra, store=store, price="1.20", source="scraping")

    shopping_list = ShoppingList.objects.create(owner=consumer_user, name="Lista test")
    item = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="pan",
        quantity=1,
        added_by=consumer_user,
    )

    with (
        patch(
            "apps.optimizer.services.matching._search_candidate_products",
            return_value=[pan_rallado, pan_barra],
        ),
        patch(
            "apps.optimizer.services.matching.select_semantic_intent",
            return_value=SemanticIntent(
                preferred_product_ids=(pan_barra.id,),
                alternative_product_ids=(pan_rallado.id,),
                needs_user_confirmation=True,
                rationale="'pan' es ambiguo y requiere confirmar tipo.",
                search_hints=("Indica tipo: barra, chapata, viena...",),
            ),
        ),
    ):
        resolution = resolve_list_items([item], [store], max_stops=1)

    assert len(resolution["assignments"]) == 1
    assignment = resolution["assignments"][0]
    assert assignment.price_obj.product_id == pan_barra.id

    route_product = assignment.as_route_product()
    assert route_product["semantic_needs_confirmation"] is True
    assert any(
        option["product_id"] == pan_rallado.id for option in route_product["semantic_options"]
    )


@pytest.mark.django_db
def test_resolve_list_items_uses_saved_preference_for_same_list_query(consumer_user):
    """Una preferencia guardada para la lista se aplica al resolver el mismo texto."""
    from apps.optimizer.models import ShoppingListSemanticPreference
    from apps.optimizer.services.matching import resolve_list_items
    from apps.prices.models import Price
    from apps.products.models import Category, Product
    from apps.shopping_lists.models import ShoppingList, ShoppingListItem
    from apps.stores.models import Store, StoreChain

    category = Category.objects.create(name="Panaderia")
    pan_rallado = Product.objects.create(
        name="Pan rallado",
        normalized_name="pan rallado",
        category=category,
        is_active=True,
    )
    pan_barra = Product.objects.create(
        name="Barra de pan",
        normalized_name="barra de pan",
        category=category,
        is_active=True,
    )

    chain = StoreChain.objects.create(name="Carrefour", slug="carrefour")
    store = Store.objects.create(
        name="Carrefour Centro",
        chain=chain,
        address="Calle Test 2, Sevilla",
        location=Point(-5.9830, 37.3885, srid=4326),
        is_active=True,
    )

    # Producto no deseado más barato.
    Price.objects.create(product=pan_rallado, store=store, price="0.70", source="scraping")
    # Producto preferido explícitamente por el usuario.
    Price.objects.create(product=pan_barra, store=store, price="1.30", source="scraping")

    shopping_list = ShoppingList.objects.create(owner=consumer_user, name="Lista pan")
    item = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="pan",
        quantity=1,
        added_by=consumer_user,
    )

    ShoppingListSemanticPreference.objects.create(
        shopping_list=shopping_list,
        query_text="pan",
        normalized_query="pan",
        product=pan_barra,
    )

    with patch(
        "apps.optimizer.services.matching._search_candidate_products",
        return_value=[pan_rallado],
    ):
        resolution = resolve_list_items([item], [store], max_stops=1)

    assert len(resolution["assignments"]) == 1
    assignment = resolution["assignments"][0]
    assert assignment.price_obj.product_id == pan_barra.id
    assert "preferencia guardada" in assignment.semantic_reason.lower()


@pytest.mark.django_db
def test_resolve_list_items_consolidates_equivalent_stores_within_same_chain(consumer_user):
    """Si una cadena tiene cobertura equivalente y mismo coste, usa una sola tienda."""
    from apps.optimizer.services.matching import resolve_list_items
    from apps.prices.models import Price
    from apps.products.models import Category, Product
    from apps.shopping_lists.models import ShoppingList, ShoppingListItem
    from apps.stores.models import Store, StoreChain

    category = Category.objects.create(name="Despensa")
    leche = Product.objects.create(
        name="Leche entera",
        normalized_name="leche entera",
        category=category,
        is_active=True,
    )
    pan = Product.objects.create(
        name="Pan barra",
        normalized_name="pan barra",
        category=category,
        is_active=True,
    )

    chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
    store_a = Store.objects.create(
        name="Mercadona Nervion",
        chain=chain,
        address="Calle A 1, Sevilla",
        location=Point(-5.9810, 37.3860, srid=4326),
        is_active=True,
    )
    store_b = Store.objects.create(
        name="Mercadona Triana",
        chain=chain,
        address="Calle B 2, Sevilla",
        location=Point(-6.0005, 37.3810, srid=4326),
        is_active=True,
    )
    store_c = Store.objects.create(
        name="Mercadona Los Remedios",
        chain=chain,
        address="Calle C 3, Sevilla",
        location=Point(-5.9980, 37.3770, srid=4326),
        is_active=True,
    )
    store_d = Store.objects.create(
        name="Mercadona Macarena",
        chain=chain,
        address="Calle D 4, Sevilla",
        location=Point(-5.9900, 37.4030, srid=4326),
        is_active=True,
    )

    now = timezone.now()
    # Mismo precio en toda la cadena, con verified_at alternado por producto para inducir
    # reparto inicial entre tiendas distintas antes de consolidar.
    Price.objects.create(
        product=leche,
        store=store_a,
        price="1.10",
        source="scraping",
        verified_at=now,
    )
    Price.objects.create(
        product=leche,
        store=store_b,
        price="1.10",
        source="scraping",
        verified_at=now - timedelta(minutes=10),
    )
    Price.objects.create(
        product=leche,
        store=store_c,
        price="1.10",
        source="scraping",
        verified_at=now - timedelta(minutes=20),
    )
    Price.objects.create(
        product=leche,
        store=store_d,
        price="1.10",
        source="scraping",
        verified_at=now - timedelta(minutes=30),
    )
    Price.objects.create(
        product=pan,
        store=store_a,
        price="0.85",
        source="scraping",
        verified_at=now - timedelta(minutes=30),
    )
    Price.objects.create(
        product=pan,
        store=store_b,
        price="0.85",
        source="scraping",
        verified_at=now - timedelta(minutes=20),
    )
    Price.objects.create(
        product=pan,
        store=store_c,
        price="0.85",
        source="scraping",
        verified_at=now - timedelta(minutes=10),
    )
    Price.objects.create(
        product=pan,
        store=store_d,
        price="0.85",
        source="scraping",
        verified_at=now,
    )

    shopping_list = ShoppingList.objects.create(owner=consumer_user, name="Lista cadena")
    item_leche = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="leche",
        quantity=1,
        added_by=consumer_user,
    )
    item_pan = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="pan",
        quantity=1,
        added_by=consumer_user,
    )

    with patch(
        "apps.optimizer.services.matching.select_semantic_intent",
        return_value=SemanticIntent(
            preferred_product_ids=(),
            alternative_product_ids=(),
            needs_user_confirmation=False,
            rationale="",
            search_hints=(),
        ),
    ):
        resolution = resolve_list_items(
            [item_leche, item_pan],
            [store_a, store_b],
            max_stops=4,
        )

    assert len(resolution["assignments"]) == 2
    assigned_store_ids = {
        assignment.price_obj.store_id for assignment in resolution["assignments"]
    }
    assert len(assigned_store_ids) == 1
    assert assigned_store_ids.issubset({store_a.id, store_b.id, store_c.id, store_d.id})
    assert resolution["selected_store_ids"] == assigned_store_ids
