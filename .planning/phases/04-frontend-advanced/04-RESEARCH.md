# Phase 4: Frontend Advanced Polish - Research

**Researched:** 2026-03-21
**Domain:** Google Places API integration — React Native (Expo 54) + Django backend proxy
**Confidence:** HIGH (core stack verified against official docs and existing codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Autocomplete is native-only:** `MapScreen.tsx` gets a Google Places Autocomplete bar at the top; `MapScreen.web.tsx` is untouched (DB-only).
- **Type filtering:** `supermarket` + `grocery_or_supermarket` place types only.
- **DB-match flow:** Selecting a Places result that matches a DB store pans the map and highlights the existing DB marker.
- **Non-DB flow:** Selecting a Places result not in our DB shows a lightweight info card (name, address, "Ver en Google Maps" link).
- **Escape hatch:** Last item in autocomplete list = "Buscar en Google Maps" that opens the native Maps app.
- **Frontend key:** `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` in frontend `.env`.
- **Enrichment endpoint:** `GET /stores/{id}/places-detail/` — fetches opening hours, rating, review count, website URL.
- **Enrichment displayed in:** `StoreProfileScreen.tsx` (both platforms via backend proxy).
- **No enrichment placeholders:** If no Places data returned, those sections simply do not render.
- **Redis 24h TTL:** Backend caches Places API responses per store ID.
- **Backend key:** `GOOGLE_PLACES_API_KEY` in backend `.env` (server-side only).
- **Discovery markers:** Grey/smaller markers on native `MapScreen`, visually distinct from chain-colored DB markers.
- **Discovery marker tap:** Lightweight bottom card (name, address, "Ver en Google Maps") — does NOT push StoreProfile.
- **No favorite button on Places-only markers** (no DB store ID).
- **No auto-DB record creation** from Places results — that is F5+ crowdsource scope.
- **Fallback (key missing/unavailable):** Autocomplete bar renders but is grayed out with label "Búsqueda avanzada no disponible". App works normally with DB stores.
- **Fallback (enrichment error):** Silent — enrichment sections simply do not appear. No toast.
- **Phase closes immediately** once F4-21 is implemented and tested.

### Claude's Discretion

- Exact `react-native-google-places-autocomplete` component props and styling within the MapScreen top bar.
- Redis cache key format for `/stores/{id}/places-detail/`.
- Exact placement and sizing of the grey Places discovery markers.
- Whether the lightweight Places info card uses the existing `AppModal` or a custom bottom sheet.

### Deferred Ideas (OUT OF SCOPE)

- Crowdsource store suggestion flow (user suggests a Places result as a new BarGAIN store → admin moderation queue).
- "Buscar en Google Maps" for the web version of MapScreen.
- Favorites for Places-only stores with auto-creation of Store DB records.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STORE-04 | Google Places full integration | Covered by: react-native-google-places-autocomplete for native autocomplete; Places API (New) Place Details endpoint for enrichment; Django low-level cache API with Redis for 24h TTL proxy; platform split via MapScreen.tsx vs MapScreen.web.tsx file convention already in place. |
</phase_requirements>

---

## Summary

Phase 4 is a single focused task (F4-21): integrate Google Places API into the existing native map flow. The codebase is already well-structured for this addition — `MapScreen.tsx` (native) and `MapScreen.web.tsx` exist as separate files, `StoreProfileScreen.tsx` is ready for enrichment sections, `storeService.ts` needs one new method, and the backend `StoreViewSet` needs one new `@action`.

The primary frontend library is `react-native-google-places-autocomplete` (FaridSafi, npm package), which provides a drop-in `GooglePlacesAutocomplete` component. It uses the Google Places Web Service Autocomplete (Legacy) API under the hood — the `types` query param accepts `supermarket|grocery_or_supermarket` pipe-separated values. The autocomplete component renders its own `TextInput`; it must be placed **outside any ScrollView** (or the ScrollView ancestor must have `keyboardShouldPersistTaps="handled"`) to avoid the well-documented tap-on-suggestions bug.

The backend enrichment proxy calls the Google Places API (New) — specifically `GET https://places.googleapis.com/v1/places/{PLACE_ID}` with field mask `currentOpeningHours,rating,userRatingCount,websiteUri`. The backend needs a `google_place_id` field on the `Store` model (nullable varchar) so the proxy knows which Place ID to look up. Responses are cached in Redis using Django's low-level `cache.set/get` API with a 24h TTL and a key of `places_detail:{store_id}`. No new Python package is required — `requests` is already in `base.txt` for the HTTP call, and `redis>=5.0` is already present.

**Primary recommendation:** Install `react-native-google-places-autocomplete` (~2.5.6) on the frontend; add a nullable `google_place_id` CharField to the `Store` model; implement `StoreDetailPlacesView` as a new DRF `@action` using Django `cache` + `requests`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-google-places-autocomplete | ~2.5.6 | Drop-in GooglePlacesAutocomplete component for native autocomplete | Official community library for RN Places autocomplete; Expo-compatible; ~2.5k GitHub stars; uses Places Web Service (JS-accessible, no native module) |
| Google Places API (New) | v1 (2025) | `place-details` endpoint for enrichment on backend | Current non-legacy version; Place Details (New) at `places.googleapis.com/v1/places/{id}` |
| Django low-level cache API | Django 5.1 (built-in) | `cache.get/set` for Redis TTL proxy caching | Already configured (Celery uses Redis); no new dependency |
| requests | 2.32 (in base.txt) | HTTP client for backend → Google Places API calls | Already in requirements; avoids adding a Google Maps SDK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linking | ~7.x (bundled with Expo 54) | `Linking.openURL("comgooglemaps://...")` for "Buscar en Google Maps" escape hatch | When user taps last autocomplete item to open native Maps app |
| AppModal (existing) | project component | Lightweight info card for Places-only store tap | Reuse existing design-system modal; avoids new bottom-sheet library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-google-places-autocomplete | expo-google-places-autocomplete (alanjhughes) | Expo SDK fork, fewer stars, less maintained; FaridSafi is the standard |
| AppModal for Places info card | Custom bottom sheet | No new dependency needed; AppModal with `type="info"` works for name+address+link |
| requests for backend Google call | googlemaps Python SDK | SDK adds a dependency; `requests` is simpler for a single endpoint |

**Installation (frontend only — no new backend deps needed):**
```bash
cd frontend && npm install react-native-google-places-autocomplete
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
frontend/src/
├── screens/map/
│   ├── MapScreen.tsx           # ADD: autocomplete bar + Places discovery markers
│   ├── MapScreen.web.tsx       # NO CHANGE
│   └── StoreProfileScreen.tsx  # ADD: enrichment sections (hours, rating, website)
├── api/
│   └── storeService.ts         # ADD: getPlacesDetail(storeId)
└── types/
    └── domain.ts               # ADD: PlacesDetail interface

backend/apps/stores/
├── models.py           # ADD: google_place_id nullable CharField on Store
├── views.py            # ADD: places_detail @action on StoreViewSet
├── serializers.py      # ADD: PlacesDetailSerializer (simple dict, no model serializer needed)
└── migrations/
    └── 000X_store_add_google_place_id.py  # auto-generated
```

### Pattern 1: GooglePlacesAutocomplete in MapScreen

**What:** Renders an autocomplete text input at the top of the native MapView. Results are filtered to supermarkets. On selection, the component calls `onPress(data, details)`.

**When to use:** Native `MapScreen.tsx` only. The component must be a sibling of `<MapView>` (both inside the root `<View>`), not inside a ScrollView ancestor.

**Example:**
```typescript
// Source: react-native-google-places-autocomplete README (FaridSafi/react-native-google-places-autocomplete)
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Inside MapScreen render, ABOVE the MapView in the component tree
// but positioned absolutely over the map:
<GooglePlacesAutocomplete
  placeholder="Buscar supermercado..."
  onPress={(data, details = null) => {
    // data.place_id — use to match against DB stores
    // details?.geometry.location — lat/lng to pan map
  }}
  query={{
    key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
    language: 'es',
    types: 'supermarket|grocery_or_supermarket',
  }}
  fetchDetails={true}
  styles={{
    container: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, zIndex: 10 },
    textInput: { height: 44, borderRadius: borderRadius.pill, paddingHorizontal: spacing.md },
  }}
  // Disable the internal current-location button (requires extra native setup)
  enablePoweredByContainer={false}
  keyboardShouldPersistTaps="handled"
/>
```

**DB match strategy:** On `onPress`, fetch nearby stores from local state and compare `data.description` (address string) or `data.place_id` against `store.address`. The most reliable approach is a PostGIS proximity check: get `details.geometry.location` coords and find the nearest DB store within 50m. If distance < 50m → treat as DB match and pan + highlight. Otherwise → show Places info card.

### Pattern 2: Disabled Autocomplete Fallback (key missing)

**What:** When `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is absent/empty, show a grayed-out, non-interactive search bar.

**Example:**
```typescript
// Detect missing key at module top
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const placesEnabled = PLACES_KEY.length > 0;

// In render:
{placesEnabled ? (
  <GooglePlacesAutocomplete ... />
) : (
  <View style={[styles.searchBar, styles.searchBarDisabled]}>
    <Ionicons name="search" size={16} color={colors.textDisabled} />
    <Text style={styles.searchBarDisabledText}>Búsqueda avanzada no disponible</Text>
  </View>
)}
```

### Pattern 3: Backend Places-Detail Proxy (Django)

**What:** A new `@action` on `StoreViewSet` that fetches Place Details from Google, caches in Redis, and returns normalized fields.

**Example:**
```python
# Source: Django docs (cache.get/cache.set), Google Places API (New) docs
from django.core.cache import cache
import requests

PLACES_DETAIL_TTL = 60 * 60 * 24  # 24 hours

@action(detail=True, methods=['get'], url_path='places-detail', permission_classes=[IsAuthenticated])
def places_detail(self, request, pk=None):
    """GET /api/v1/stores/{id}/places-detail/ — enrichment from Google Places."""
    cache_key = f"places_detail:{pk}"
    cached = cache.get(cache_key)
    if cached is not None:
        return success_response(cached)

    try:
        store = Store.objects.get(pk=pk, is_active=True)
    except Store.DoesNotExist:
        raise Http404

    place_id = store.google_place_id
    if not place_id:
        return success_response({})

    api_key = settings.GOOGLE_PLACES_API_KEY
    if not api_key:
        return success_response({})

    try:
        resp = requests.get(
            f"https://places.googleapis.com/v1/places/{place_id}",
            headers={
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": "currentOpeningHours,rating,userRatingCount,websiteUri",
            },
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return success_response({})  # Silent fail — no toast on client

    normalized = {
        "opening_hours": data.get("currentOpeningHours"),
        "rating": data.get("rating"),
        "user_rating_count": data.get("userRatingCount"),
        "website_url": data.get("websiteUri"),
    }
    cache.set(cache_key, normalized, timeout=PLACES_DETAIL_TTL)
    return success_response(normalized)
```

### Pattern 4: StoreProfile Enrichment Sections

**What:** `StoreProfileScreen.tsx` calls `storeService.getPlacesDetail(storeId)` on mount. If response has data, conditionally render enrichment sections. Uses `SkeletonBox` during load.

**Example:**
```typescript
// In StoreProfileScreen — additional state
const [placesDetail, setPlacesDetail] = useState<PlacesDetail | null>(null);
const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

useEffect(() => {
  setIsLoadingPlaces(true);
  storeService.getPlacesDetail(storeId)
    .then(setPlacesDetail)
    .catch(() => {}) // Silent fail
    .finally(() => setIsLoadingPlaces(false));
}, [storeId]);

// In JSX (inside headerCard):
{isLoadingPlaces ? (
  <SkeletonBox width="100%" height={60} style={{ marginTop: spacing.sm }} />
) : placesDetail?.rating ? (
  <View style={styles.ratingRow}>
    <Ionicons name="star" size={14} color={colors.warning} />
    <Text>{placesDetail.rating.toFixed(1)} ({placesDetail.user_rating_count} valoraciones)</Text>
  </View>
) : null}
{placesDetail?.website_url ? (
  <TouchableOpacity onPress={() => Linking.openURL(placesDetail.website_url!)}>
    <Text>Sitio web oficial</Text>
  </TouchableOpacity>
) : null}
```

### Anti-Patterns to Avoid

- **Placing `GooglePlacesAutocomplete` inside a ScrollView without `keyboardShouldPersistTaps="handled"`:** Suggestions list taps are swallowed — the list disappears on first tap with no selection. The MapScreen root View is not a ScrollView, so this is not an issue in this layout.
- **Using the Google Places Legacy Autocomplete endpoint directly from the backend proxy:** The legacy API (`maps.googleapis.com/maps/api/place/autocomplete/json`) is valid for server-side use but requires a different billing SKU. The frontend component handles autocomplete directly — the backend proxy is only for Place Details enrichment.
- **Hardcoding `GOOGLE_PLACES_API_KEY` in Django settings:** Must use `python-decouple` (already in `base.txt`) — `config('GOOGLE_PLACES_API_KEY', default='')`.
- **Fetching Places Detail on every `StoreProfile` mount without caching:** Without Redis TTL, each store profile view costs a quota hit. Use the 24h cache.
- **Adding `google_place_id` as a required field:** The field must be nullable/blank — most stores in the DB were seeded without a Place ID and the enrichment flow should silently skip them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Places autocomplete input with dropdown | Custom TextInput + debounced fetch + dropdown FlatList | `react-native-google-places-autocomplete` | Session tokens, debounce, keyboard handling, suggestion rendering, iOS/Android keyboard avoidance — all handled |
| DB-match distance check | Haversine in JS | PostGIS `Distance` or haversine helper already in codebase | `haversineDistanceKm` function already exists in `MapScreen.tsx` — reuse it |
| HTTP caching of external API | Custom cache decorator | Django `cache.set/cache.get` low-level API | Already configured for Celery/Redis; no new dependency needed |
| Grey map pin SVG | Draw custom SVG | `react-native-maps` `Marker` with `pinColor` set to grey (#9CA3AF) | The existing chain markers already use `pinColor`; grey is trivially `pinColor="#9CA3AF"` |

**Key insight:** The entire autocomplete complexity (session token batching, rate limits, keyboard avoidance, result rendering) is solved by the FaridSafi library. The backend proxy is just `requests.get` + `cache.set`.

---

## Common Pitfalls

### Pitfall 1: GooglePlacesAutocomplete `zIndex` obscured by MapView

**What goes wrong:** The autocomplete dropdown (results list) renders behind the MapView on Android.
**Why it happens:** React Native's z-index stacking on Android is not CSS-like; Views with absolute positioning can be obscured by MapView which has its own native rendering layer.
**How to avoid:** Wrap the `GooglePlacesAutocomplete` in a `View` with `style={{ zIndex: 10, elevation: 10 }}`. The `elevation` prop is the Android equivalent of z-index for overlapping native views.
**Warning signs:** Dropdown shows briefly then disappears, or only appears in the empty space above the map.

### Pitfall 2: `types` filter not working as expected

**What goes wrong:** Results include non-supermarket places (restaurants, pharmacies).
**Why it happens:** The legacy Places Autocomplete API `types` param has a limited set of supported collection types. `supermarket` and `grocery_or_supermarket` are valid individual Place Types but NOT valid Autocomplete collection types (which are limited to: `geocode`, `address`, `establishment`, `(regions)`, `(cities)`).
**How to avoid:** Use `types: 'establishment'` in the `query` prop and add a custom `filterResults` function, OR accept that filtering by keyword is more reliable than `types` for this use case. The `query.keyword` approach (`keyword: 'supermercado'`) can help narrow results.
**Warning signs:** Non-supermarket establishments appear in the autocomplete dropdown.

### Pitfall 3: `fetchDetails: true` doubles quota cost

**What goes wrong:** Autocomplete costs one SKU call per keystroke; `fetchDetails: true` adds a Place Details call per selection. At high usage this hits quota limits.
**Why it happens:** The component automatically fires a Place Details request on every `onPress` when `fetchDetails` is true.
**How to avoid:** This is acceptable for the BarGAIN use case (TFG scope, not high traffic). The key mitigation is the backend 24h Redis cache for enrichment. For the frontend autocomplete, `fetchDetails: true` is required to get `geometry.location` for map panning — accept the cost.
**Warning signs:** 429 responses from Places API in logs.

### Pitfall 4: `Store` model migration adds column without default

**What goes wrong:** `makemigrations` on `google_place_id = CharField(null=True, blank=True)` requires a migration on a table that may have existing rows. In production this is safe (nullable column), but in test fixtures the seed data must not require the field.
**Why it happens:** Django migration adds the column at the DB level; existing rows get NULL automatically.
**How to avoid:** Declare the field as `null=True, blank=True, max_length=200` — no default needed, no data migration needed. Run `make makemigrations-docker` to generate, then `make migrate-docker` to apply.
**Warning signs:** IntegrityError during migration if `null=False` is accidentally used.

### Pitfall 5: `EXPO_PUBLIC_*` key exposed in web bundle

**What goes wrong:** The frontend Places API key is visible in the JS bundle — this is known and acceptable for Expo's web companion. However, the key should be restricted in Google Cloud Console to allowed referrer domains.
**Why it happens:** Expo public variables are replaced at build time and are visible in the bundle.
**How to avoid:** In Google Cloud Console, restrict the key to `HTTP referrers (web sites)` for the web domain and to `Android/iOS apps` for native. This is operational/infrastructure work, not code work — document as a deployment step.
**Warning signs:** Unexpected Places API charges from unrecognized origins.

---

## Code Examples

Verified patterns from official sources:

### Places API (New) — Place Details request

```python
# Source: https://developers.google.com/maps/documentation/places/web-service/place-details
import requests

resp = requests.get(
    f"https://places.googleapis.com/v1/places/{place_id}",
    headers={
        "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "currentOpeningHours,rating,userRatingCount,websiteUri",
    },
    timeout=5,
)
# Response shape:
# {
#   "currentOpeningHours": { "openNow": true, "periods": [...], "weekdayDescriptions": [...] },
#   "rating": 4.2,
#   "userRatingCount": 312,
#   "websiteUri": "https://www.mercadona.es"
# }
```

### Django low-level Redis cache

```python
# Source: https://fly.io/django-beats/caching-in-django-with-redis/
from django.core.cache import cache

cache_key = f"places_detail:{store_id}"
data = cache.get(cache_key)
if data is None:
    data = fetch_from_google_places(store_id)
    cache.set(cache_key, data, timeout=60 * 60 * 24)  # 24h TTL
```

### GooglePlacesAutocomplete — basic wiring

```typescript
// Source: https://github.com/FaridSafi/react-native-google-places-autocomplete (README)
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

<GooglePlacesAutocomplete
  placeholder="Buscar supermercado..."
  fetchDetails={true}
  onPress={(data, details = null) => {
    const lat = details?.geometry?.location?.lat;
    const lng = details?.geometry?.location?.lng;
    const placeId = data.place_id;
    // pan map to { lat, lng }, then match against DB stores
  }}
  query={{
    key: EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
    language: 'es',
  }}
/>
```

### Discovery marker — grey visual style

```typescript
// Source: existing MapScreen.tsx pattern (pinColor already used for chain markers)
<Marker
  key={`places-${placeId}`}
  coordinate={{ latitude, longitude }}
  title={name}
  pinColor="#9CA3AF"   // Tailwind gray-400 — clearly not a BarGAIN chain marker
  onPress={() => setSelectedPlacesMarker({ name, address, placeId })}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Places API Legacy (`maps.googleapis.com/maps/api`) | Places API (New) (`places.googleapis.com/v1`) | 2023–2024 | New API uses field masks, different billing SKUs; old API is "legacy" but still functional |
| Google Maps SDK for Python (googlemaps) | Direct `requests` call | N/A for this project | `requests` is already in requirements; SDK adds no value for a single endpoint |

**Deprecated/outdated:**
- Places Autocomplete via backend (server-to-server): The `react-native-google-places-autocomplete` component calls the Places Web Service directly from the client with a browser-compatible key. Do NOT route autocomplete through the Django proxy — it adds latency and complexity for no benefit. Only enrichment (Place Details) goes through the backend.

---

## Open Questions

1. **`google_place_id` population strategy**
   - What we know: The `Store` model currently has no `google_place_id` field. The backend admin or seed script would need to populate it.
   - What's unclear: How are the existing seeded stores matched to Place IDs? Manual admin entry? A one-time migration script?
   - Recommendation: For the TFG scope, add the field as nullable and populate it manually via the Django admin for 3–5 test stores. Document this as a data entry step in the task, not a code automation task.

2. **"Ver en Google Maps" URL scheme on iOS vs Android**
   - What we know: `https://maps.google.com/?q=lat,lng` works universally. Deep links (`comgooglemaps://`, `geo:`) are platform-specific and may not be installed.
   - What's unclear: Whether the TFG grader will test on iOS, Android, or both.
   - Recommendation: Use `https://www.google.com/maps/search/?api=1&query=lat,lng&query_place_id={placeId}` — this works as a universal web URL and opens the Google Maps app if installed, falling back to the browser.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-django (backend) / jest-expo + @testing-library/react-native (frontend) |
| Config file | `backend/pytest.ini` (backend) / `frontend/package.json` jest preset (frontend) |
| Quick run command | `cd backend && pytest tests/unit/test_stores.py tests/integration/test_store_endpoints.py -x -v --tb=short` |
| Full suite command | `make test-backend` (backend) + `cd frontend && npx jest --coverage` (frontend) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STORE-04 | `GET /stores/{id}/places-detail/` returns normalized Places data | integration | `cd backend && pytest tests/integration/test_store_endpoints.py::test_places_detail_endpoint -x -v` | ❌ Wave 0 |
| STORE-04 | `GET /stores/{id}/places-detail/` returns `{}` when `google_place_id` is null | integration | `cd backend && pytest tests/integration/test_store_endpoints.py::test_places_detail_no_place_id -x -v` | ❌ Wave 0 |
| STORE-04 | `GET /stores/{id}/places-detail/` caches Redis on second call | unit | `cd backend && pytest tests/unit/test_stores.py::test_places_detail_cache_hit -x -v` | ❌ Wave 0 |
| STORE-04 | Autocomplete bar renders in disabled state when key missing | unit | `cd frontend && npx jest --testPathPattern=MapScreen` | ❌ Wave 0 |
| STORE-04 | `storeService.getPlacesDetail()` returns null when API returns `{}` | unit | `cd frontend && npx jest --testPathPattern=storeService` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && pytest tests/unit/test_stores.py -x --tb=short`
- **Per wave merge:** `make test-backend && cd frontend && npx jest --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/integration/test_store_endpoints.py` — add `test_places_detail_endpoint`, `test_places_detail_no_place_id`, `test_places_detail_silent_fail` (file exists, needs new test functions)
- [ ] `backend/tests/unit/test_stores.py` — add `test_places_detail_cache_hit` to verify Redis cache is returned on second call (file exists, needs new test function)
- [ ] `frontend/__tests__/MapScreen.test.tsx` — new file, covers disabled autocomplete bar render
- [ ] `frontend/__tests__/storeService.test.ts` — new file or extend existing, covers `getPlacesDetail` return shape

---

## Sources

### Primary (HIGH confidence)

- Official Google Places API (New) docs — Place Details endpoint, field masks, response shape: https://developers.google.com/maps/documentation/places/web-service/place-details
- Official Google Places API (New) docs — overview and migration: https://developers.google.com/maps/documentation/places/web-service/overview
- Django caching with Redis low-level API: https://fly.io/django-beats/caching-in-django-with-redis/
- Existing codebase: `MapScreen.tsx`, `StoreProfileScreen.tsx`, `storeService.ts`, `backend/apps/stores/views.py`, `backend/requirements/base.txt` (all verified by direct file read)

### Secondary (MEDIUM confidence)

- react-native-google-places-autocomplete README (FaridSafi/react-native-google-places-autocomplete): https://github.com/FaridSafi/react-native-google-places-autocomplete — installation, props, ScrollView pitfall documented in multiple open issues
- Google Places Legacy Autocomplete — `types` parameter limitations: https://developers.google.com/maps/documentation/places/web-service/legacy/supported_types

### Tertiary (LOW confidence — for awareness only)

- ScrollView / keyboardShouldPersistTaps pitfall: verified from multiple GitHub issues (FaridSafi repo issues #477, #517, #899) — single library source but highly corroborated

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against existing `package.json` (Expo 54, RN 0.81.5, react-native-maps already in use), official Google docs, and existing backend requirements
- Architecture: HIGH — based on direct reading of existing `MapScreen.tsx`, `StoreProfileScreen.tsx`, `storeService.ts`, and `views.py`; additions follow existing patterns exactly
- Pitfalls: MEDIUM-HIGH — `zIndex`/`elevation` issue is widely reported; `types` filter limitation verified against Google docs; cache pitfall is standard Django knowledge

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable APIs; Places API (New) field names unlikely to change within 30 days)
