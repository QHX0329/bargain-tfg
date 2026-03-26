"""
Resolucion fuzzy de items de lista contra precios de productos.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from decimal import Decimal

from django.contrib.postgres.search import TrigramSimilarity
from thefuzz import fuzz

from apps.prices.models import Price
from apps.products.models import Product
from apps.shopping_lists.utils import normalize_list_text


TOP_PRODUCT_CANDIDATES = 20
TOP_SIMILAR_MATCHES = 3


@dataclass(frozen=True)
class CandidateMatch:
    item_id: int
    query_text: str
    quantity: int
    price_obj: Price
    similarity_score: float
    candidate_rank: int

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
            "matched_product_id": product.id,
            "matched_product_name": product.name,
            "matched_store_id": store.id,
            "matched_store_name": store.name,
            "matched_chain": chain_name,
            "price": float(self.effective_price),
            "similarity_score": round(self.similarity_score, 3),
            "candidate_rank": self.candidate_rank,
        }


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
        max(fuzz.token_set_ratio(normalized_query, variant), fuzz.partial_ratio(normalized_query, variant))
        for variant in normalized_variants
    )

    store_context = " ".join(
        part
        for part in [store.name, store.chain.name if store.chain else None]
        if part
    )
    store_score = 0
    if store_context:
        normalized_store_context = normalize_list_text(store_context)
        store_score = max(
            fuzz.token_set_ratio(normalized_query, normalized_store_context),
            fuzz.partial_ratio(normalized_query, normalized_store_context),
        )

    return round((product_score * 0.85 + store_score * 0.15) / 100, 4)


def _get_item_candidates(item, candidate_stores) -> list[CandidateMatch]:
    normalized_query = normalize_list_text(item.name)
    if not normalized_query:
        return []

    candidate_products = list(
        Product.objects.filter(is_active=True)
        .annotate(similarity=TrigramSimilarity("normalized_name", normalized_query))
        .order_by("-similarity")[:TOP_PRODUCT_CANDIDATES]
    )
    if not candidate_products:
        return []

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
                similarity_score=_score_candidate(item.name, price_obj),
                candidate_rank=0,
            )
            for price_obj in price_candidates
        ),
        key=lambda match: (-match.similarity_score, match.effective_price, -match.price_obj.verified_at.timestamp()),
    )[:TOP_SIMILAR_MATCHES]

    return [
        CandidateMatch(
            item_id=match.item_id,
            query_text=match.query_text,
            quantity=match.quantity,
            price_obj=match.price_obj,
            similarity_score=match.similarity_score,
            candidate_rank=index + 1,
        )
        for index, match in enumerate(ranked)
    ]


def _pick_cheapest(candidates: list[CandidateMatch]) -> CandidateMatch:
    return min(candidates, key=lambda match: (match.effective_price, -match.similarity_score))


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


def resolve_list_items(items, candidate_stores, max_stops: int | None = None) -> dict:
    """
    Resuelve cada item textual contra candidatos fuzzy y escoge la opcion mas barata.

    Si `max_stops` se supera, intenta consolidar items en tiendas ya seleccionadas
    cambiando solo al siguiente candidato disponible con menor sobrecoste.
    """

    candidates_by_item: dict[int, list[CandidateMatch]] = {}
    unmatched_items: list[str] = []

    for item in items:
        candidates = _get_item_candidates(item, candidate_stores)
        if not candidates:
            unmatched_items.append(item.name)
            continue
        candidates_by_item[item.id] = candidates

    assignments = {
        item_id: _pick_cheapest(candidates)
        for item_id, candidates in candidates_by_item.items()
    }
    assignments = _reduce_store_count(assignments, candidates_by_item, max_stops=max_stops)

    selected_store_ids = {match.price_obj.store_id for match in assignments.values()}
    savings_by_store: dict[int, Decimal] = {}
    for item_id, selected in assignments.items():
        alternatives = [candidate for candidate in candidates_by_item[item_id] if candidate != selected]
        if not alternatives:
            continue
        next_best = min(alternatives, key=lambda candidate: (candidate.effective_price, -candidate.similarity_score))
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
