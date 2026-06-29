"""Resolucion semantica + fuzzy de items de lista contra precios de productos."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from decimal import Decimal

from django.contrib.postgres.search import TrigramSimilarity
from thefuzz import fuzz

from apps.prices.models import Price
from apps.products.models import Product
from apps.shopping_lists.utils import normalize_list_text

from .semantic import SemanticBudget, SemanticIntent, select_semantic_intent

TOP_PRODUCT_CANDIDATES = 20
TOP_SIMILAR_MATCHES = 3
TOP_ASSIGNMENT_CANDIDATES = 12
SIMILARITY_PRICE_TOLERANCE = 0.08
SEMANTIC_PREFERRED_BONUS = 0.15
SEMANTIC_ALTERNATIVE_BONUS = 0.05
UNREQUESTED_QUALIFIER_PENALTY = 18
MAX_CHAIN_CONSOLIDATION_EXTRA_COST = Decimal("0.00")
UNREQUESTED_QUALIFIERS = (
    "rallado",
    "molido",
    "triturado",
    "en polvo",
    "instantaneo",
    "preparado",
    "mezcla",
    "mix",
    "rebozado",
    "sazonado",
)


@dataclass(frozen=True)
class CandidateMatch:
    item_id: int
    query_text: str
    quantity: int
    price_obj: Price
    similarity_score: float
    candidate_rank: int
    semantic_needs_confirmation: bool = False
    semantic_reason: str = ""
    semantic_options: tuple[dict, ...] = ()
    semantic_hints: tuple[str, ...] = ()

    @property
    def effective_price(self) -> Decimal:
        return self.price_obj.offer_price or self.price_obj.price

    @property
    def extended_price(self) -> Decimal:
        return self.effective_price * self.quantity

    def as_route_product(self) -> dict:
        product = self.price_obj.product
        store = self.price_obj.store
        chain_name = store.chain.name if store.chain else "Local"
        return {
            "query_text": self.query_text,
            "quantity": self.quantity,
            "matched_price_id": self.price_obj.id,
            "matched_product_id": product.id,
            "matched_product_name": product.name,
            "matched_store_id": store.id,
            "matched_store_name": store.name,
            "matched_chain": chain_name,
            "price": float(self.effective_price),
            "similarity_score": round(self.similarity_score, 3),
            "candidate_rank": self.candidate_rank,
            "semantic_needs_confirmation": self.semantic_needs_confirmation,
            "semantic_reason": self.semantic_reason,
            "semantic_options": list(self.semantic_options),
            "semantic_hints": list(self.semantic_hints),
        }


def _search_candidate_products(normalized_query: str) -> list[Product]:
    return list(
        Product.objects.filter(is_active=True)
        .annotate(similarity=TrigramSimilarity("normalized_name", normalized_query))
        .order_by("-similarity")[:TOP_PRODUCT_CANDIDATES]
    )


def _semantic_options(
    intent: SemanticIntent, candidate_products: list[Product]
) -> tuple[dict, ...]:
    products_by_id = {product.id: product for product in candidate_products}
    option_ids: list[int] = []

    for product_id in intent.preferred_product_ids + intent.alternative_product_ids:
        if product_id in products_by_id and product_id not in option_ids:
            option_ids.append(product_id)
        if len(option_ids) >= TOP_SIMILAR_MATCHES:
            break

    options: list[dict] = []
    for product_id in option_ids:
        product = products_by_id[product_id]
        options.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "brand": product.brand,
                "category": product.category.name if product.category else "",
            }
        )
    return tuple(options)


def _latest_prices_for_products(candidate_products, candidate_stores) -> list[Price]:
    price_rows = (
        Price.objects.filter(
            product__in=candidate_products,
            store__in=candidate_stores,
            is_stale=False,
        )
        .select_related("product", "store", "store__chain")
        .order_by("product_id", "store_id", "-verified_at")
    )

    latest_by_pair: dict[tuple[int, int], Price] = {}
    for price_obj in price_rows:
        latest_by_pair.setdefault((price_obj.product_id, price_obj.store_id), price_obj)
    return list(latest_by_pair.values())


def _has_unrequested_qualifier(normalized_query: str, normalized_text: str) -> bool:
    for token in UNREQUESTED_QUALIFIERS:
        if token in normalized_text and token not in normalized_query:
            return True
    return False


def _score_candidate(query_text: str, price_obj: Price) -> float:
    normalized_query = normalize_list_text(query_text)
    product = price_obj.product
    store = price_obj.store

    product_variants = [
        product.name,
        product.normalized_name,
        f"{product.brand} {product.name}".strip() if product.brand else product.name,
    ]
    normalized_variants = [normalize_list_text(value) for value in product_variants if value]
    product_score = max(
        max(
            fuzz.token_set_ratio(normalized_query, variant),
            fuzz.partial_ratio(normalized_query, variant),
        )
        for variant in normalized_variants
    )

    if any(
        _has_unrequested_qualifier(normalized_query, variant) for variant in normalized_variants
    ):
        product_score = max(0, product_score - UNREQUESTED_QUALIFIER_PENALTY)

    store_context = " ".join(
        part for part in [store.name, store.chain.name if store.chain else None] if part
    )
    store_score = 0
    if store_context:
        normalized_store_context = normalize_list_text(store_context)
        store_score = max(
            fuzz.token_set_ratio(normalized_query, normalized_store_context),
            fuzz.partial_ratio(normalized_query, normalized_store_context),
        )

    return round((product_score * 0.85 + store_score * 0.15) / 100, 4)


def _semantic_boost(product_id: int, preferred_ids: set[int], alternative_ids: set[int]) -> float:
    if product_id in preferred_ids:
        return SEMANTIC_PREFERRED_BONUS
    if product_id in alternative_ids:
        return SEMANTIC_ALTERNATIVE_BONUS
    return 0.0


def _get_item_candidates(
    item,
    candidate_stores,
    saved_product_id: int | None = None,
    semantic_budget: SemanticBudget | None = None,
) -> list[CandidateMatch]:
    normalized_query = normalize_list_text(item.name)
    if not normalized_query:
        return []

    candidate_products = _search_candidate_products(normalized_query)
    if saved_product_id and all(product.id != saved_product_id for product in candidate_products):
        saved_product = Product.objects.filter(id=saved_product_id, is_active=True).first()
        if saved_product:
            candidate_products = [saved_product, *candidate_products]

    if not candidate_products:
        return []

    semantic_intent = select_semantic_intent(
        item.name, candidate_products, budget=semantic_budget
    )

    if saved_product_id and any(product.id == saved_product_id for product in candidate_products):
        alternative_ids = [
            product_id
            for product_id in (
                semantic_intent.preferred_product_ids + semantic_intent.alternative_product_ids
            )
            if product_id != saved_product_id
        ]
        semantic_intent = SemanticIntent(
            preferred_product_ids=(saved_product_id,),
            alternative_product_ids=tuple(alternative_ids[:TOP_SIMILAR_MATCHES]),
            needs_user_confirmation=False,
            rationale=(
                "Aplicada preferencia guardada para este item en optimizaciones anteriores."
            ),
            search_hints=semantic_intent.search_hints,
        )

    preferred_ids = set(semantic_intent.preferred_product_ids)
    alternative_ids = set(semantic_intent.alternative_product_ids)
    semantic_options = _semantic_options(semantic_intent, candidate_products)

    product_scope = (
        [product for product in candidate_products if product.id in preferred_ids]
        if preferred_ids
        else candidate_products
    )
    price_candidates = _latest_prices_for_products(product_scope, candidate_stores)
    if not price_candidates and product_scope != candidate_products:
        price_candidates = _latest_prices_for_products(candidate_products, candidate_stores)
    if not price_candidates:
        return []

    ranked = sorted(
        (
            CandidateMatch(
                item_id=item.id,
                query_text=item.name,
                quantity=item.quantity,
                price_obj=price_obj,
                similarity_score=min(
                    1.0,
                    _score_candidate(item.name, price_obj)
                    + _semantic_boost(price_obj.product_id, preferred_ids, alternative_ids),
                ),
                candidate_rank=0,
                semantic_needs_confirmation=semantic_intent.needs_user_confirmation,
                semantic_reason=semantic_intent.rationale,
                semantic_options=semantic_options,
                semantic_hints=semantic_intent.search_hints,
            )
            for price_obj in price_candidates
        ),
        key=lambda match: (
            -match.similarity_score,
            match.effective_price,
            -match.price_obj.verified_at.timestamp(),
        ),
    )[:TOP_ASSIGNMENT_CANDIDATES]

    return [
        CandidateMatch(
            item_id=match.item_id,
            query_text=match.query_text,
            quantity=match.quantity,
            price_obj=match.price_obj,
            similarity_score=match.similarity_score,
            candidate_rank=index + 1,
            semantic_needs_confirmation=match.semantic_needs_confirmation,
            semantic_reason=match.semantic_reason,
            semantic_options=match.semantic_options,
            semantic_hints=match.semantic_hints,
        )
        for index, match in enumerate(ranked)
    ]


def _pick_cheapest(candidates: list[CandidateMatch]) -> CandidateMatch:
    top_similarity = max(candidate.similarity_score for candidate in candidates)
    viable = [
        candidate
        for candidate in candidates
        if candidate.similarity_score >= top_similarity - SIMILARITY_PRICE_TOLERANCE
    ]
    return min(
        viable,
        key=lambda match: (
            match.effective_price,
            -match.similarity_score,
            match.price_obj.store_id,
        ),
    )


def _reduce_store_count(
    assignments: dict[int, CandidateMatch],
    candidates_by_item: dict[int, list[CandidateMatch]],
    max_stops: int | None,
) -> dict[int, CandidateMatch]:
    if max_stops is None:
        return assignments

    current = dict(assignments)
    while len({match.price_obj.store_id for match in current.values()}) > max_stops:
        store_usage = Counter(match.price_obj.store_id for match in current.values())
        best_switch: tuple[int, CandidateMatch, Decimal] | None = None
        used_store_ids = {match.price_obj.store_id for match in current.values()}

        for item_id, current_match in current.items():
            if store_usage[current_match.price_obj.store_id] != 1:
                continue

            for alternative in candidates_by_item.get(item_id, []):
                if alternative.price_obj.store_id == current_match.price_obj.store_id:
                    continue
                if alternative.price_obj.store_id not in used_store_ids:
                    continue

                delta = alternative.extended_price - current_match.extended_price
                if best_switch is None or delta < best_switch[2]:
                    best_switch = (item_id, alternative, delta)

        if best_switch is None:
            break

        current[best_switch[0]] = best_switch[1]

    return current


def _reduce_redundant_chain_stores(
    assignments: dict[int, CandidateMatch],
    candidates_by_item: dict[int, list[CandidateMatch]],
) -> dict[int, CandidateMatch]:
    """Consolida paradas de una cadena si existe una tienda comun sin sobrecoste."""

    current = dict(assignments)
    chain_store_ids: dict[int, set[int]] = {}

    for match in current.values():
        chain_id = match.price_obj.store.chain_id
        if not chain_id:
            continue
        chain_store_ids.setdefault(chain_id, set()).add(match.price_obj.store_id)

    for chain_id, used_store_ids in chain_store_ids.items():
        if len(used_store_ids) <= 1:
            continue

        chain_item_ids = [
            item_id
            for item_id, match in current.items()
            if match.price_obj.store.chain_id == chain_id
        ]

        candidate_chain_store_ids = {
            candidate.price_obj.store_id
            for item_id in chain_item_ids
            for candidate in candidates_by_item.get(item_id, [])
            if candidate.price_obj.store.chain_id == chain_id
        }
        target_store_ids = sorted(candidate_chain_store_ids or used_store_ids)

        best_target_store_id: int | None = None
        best_total_delta: Decimal | None = None
        best_replacements: dict[int, CandidateMatch] = {}

        for target_store_id in target_store_ids:
            replacements: dict[int, CandidateMatch] = {}
            total_delta = Decimal("0.00")
            feasible = True

            for item_id in chain_item_ids:
                current_match = current[item_id]
                if current_match.price_obj.store_id == target_store_id:
                    replacements[item_id] = current_match
                    continue

                alternative = next(
                    (
                        candidate
                        for candidate in candidates_by_item.get(item_id, [])
                        if candidate.price_obj.store_id == target_store_id
                    ),
                    None,
                )

                if alternative is None:
                    feasible = False
                    break

                replacements[item_id] = alternative
                total_delta += alternative.extended_price - current_match.extended_price

            if not feasible:
                continue

            if (
                best_total_delta is None
                or total_delta < best_total_delta
                or (
                    total_delta == best_total_delta
                    and best_target_store_id is not None
                    and target_store_id < best_target_store_id
                )
            ):
                best_total_delta = total_delta
                best_target_store_id = target_store_id
                best_replacements = replacements

        if best_total_delta is None or best_total_delta > MAX_CHAIN_CONSOLIDATION_EXTRA_COST:
            continue

        for item_id, replacement in best_replacements.items():
            current[item_id] = replacement

    return current


def resolve_list_items(items, candidate_stores, max_stops: int | None = None) -> dict:
    """
    Resuelve cada item textual contra candidatos semanticos/fuzzy y escoge la opcion mas barata.

    Si `max_stops` se supera, intenta consolidar items en tiendas ya seleccionadas
    cambiando solo al siguiente candidato disponible con menor sobrecoste.
    """

    from apps.optimizer.models import ShoppingListSemanticPreference

    candidates_by_item: dict[int, list[CandidateMatch]] = {}
    unmatched_items: list[str] = []

    normalized_queries = {
        normalize_list_text(item.name) for item in items if normalize_list_text(item.name)
    }
    shopping_list_id = getattr(items[0], "shopping_list_id", None) if items else None
    preferences: dict[str, int] = {}
    if shopping_list_id and normalized_queries:
        stored_preferences = ShoppingListSemanticPreference.objects.filter(
            shopping_list_id=shopping_list_id,
            normalized_query__in=normalized_queries,
            product__is_active=True,
        )
        preferences = {
            pref.normalized_query: pref.product_id
            for pref in stored_preferences
            if pref.product_id
        }

    semantic_budget = SemanticBudget()
    for item in items:
        normalized_query = normalize_list_text(item.name)
        candidates = _get_item_candidates(
            item,
            candidate_stores,
            saved_product_id=preferences.get(normalized_query),
            semantic_budget=semantic_budget,
        )
        if not candidates:
            unmatched_items.append(item.name)
            continue
        candidates_by_item[item.id] = candidates

    assignments = {
        item_id: _pick_cheapest(candidates) for item_id, candidates in candidates_by_item.items()
    }
    assignments = _reduce_store_count(assignments, candidates_by_item, max_stops=max_stops)
    assignments = _reduce_redundant_chain_stores(assignments, candidates_by_item)

    selected_store_ids = {match.price_obj.store_id for match in assignments.values()}
    savings_by_store: dict[int, Decimal] = {}
    for item_id, selected in assignments.items():
        alternatives = [
            candidate for candidate in candidates_by_item[item_id] if candidate != selected
        ]
        if not alternatives:
            continue
        next_best = min(
            alternatives,
            key=lambda candidate: (candidate.effective_price, -candidate.similarity_score),
        )
        savings_by_store[selected.price_obj.store_id] = savings_by_store.get(
            selected.price_obj.store_id,
            Decimal("0.00"),
        ) + max(next_best.extended_price - selected.extended_price, Decimal("0.00"))

    return {
        "assignments": list(assignments.values()),
        "candidates_by_item": candidates_by_item,
        "selected_store_ids": selected_store_ids,
        "savings_by_store": savings_by_store,
        "unmatched_items": unmatched_items,
    }
