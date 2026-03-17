---
phase: 01-core-backend
plan: "05"
subsystem: api
tags: [django, shopping-lists, drf, collaborators, templates, tdd, rest-api]

# Dependency graph
requires:
  - phase: 01-01
    provides: User model with username; JWT auth
  - phase: 01-02
    provides: Product/Category models used as FKs in ShoppingListItem

provides:
  - ShoppingList, ShoppingListItem, ListCollaborator, ListTemplate, ListTemplateItem models
  - GET/POST /api/v1/lists/ — list and create shopping lists
  - PATCH/DELETE /api/v1/lists/{id}/ — update name/archived, delete
  - GET/POST /api/v1/lists/{id}/items/ — list enriched items, add item
  - PATCH/DELETE /api/v1/lists/{id}/items/{pk}/ — update quantity/checked, remove
  - POST /api/v1/lists/{id}/collaborators/ — invite by username
  - DELETE /api/v1/lists/{id}/collaborators/{user_pk}/ — remove collaborator
  - POST /api/v1/lists/{id}/save-template/ — save template from list
  - POST /api/v1/lists/from-template/{template_pk}/ — create list from template
  - IsOwnerOrCollaborator permission class

affects:
  - 01-04-prices (Price model is lazily imported for item enrichment)
  - optimizer (ShoppingList is primary input to route optimization)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Active list limit checked in perform_create and from_template actions; raises ActiveListLimitError (409)
    - Lazy Price import in enrichment serializer (try/except ImportError) decouples from plan 01-04
    - Collaborator access via Q(owner=user) | Q(listcollaborator_set__user=user) .distinct()
    - Template copy rule: product FKs only, no quantity/is_checked fields on ListTemplateItem
    - prefetch_related("items__product__category") prevents N+1 on list GET

key-files:
  created:
    - backend/apps/shopping_lists/models.py
    - backend/apps/shopping_lists/serializers.py
    - backend/apps/shopping_lists/views.py
    - backend/apps/shopping_lists/urls.py
    - backend/apps/shopping_lists/admin.py
    - backend/apps/shopping_lists/permissions.py
    - backend/apps/shopping_lists/migrations/0001_initial.py
    - backend/tests/unit/test_shopping_lists.py
    - backend/tests/integration/test_list_endpoints.py
  modified:
    - backend/apps/products/models.py (added Meta.indexes GIN declaration)

key-decisions:
  - "ActiveListLimitError defined in shopping_lists/views.py (not core/exceptions.py) as it is domain-specific to this module"
  - "ShoppingListCreateSerializer allows is_archived as writable field — PATCH uses same serializer for create/update (no separate UpdateSerializer)"
  - "ListCollaborator related_name='listcollaborator_set' matches IsOwnerOrCollaborator permission filter pattern"
  - "Product Meta.indexes must declare GIN index matching 0001_initial AddIndex to prevent Django generating spurious removal migration"
  - "DefaultRouter for ShoppingListViewSet; nested item/collaborator actions use url_path with regex capture groups"

patterns-established:
  - "Active limit pattern: count active, raise typed exception at threshold"
  - "Collaborator lookup: Q objects OR filter + distinct()"
  - "Nested actions with typed URL params: url_path=r'items/(?P<item_pk>\\d+)'"
  - "Lazy service import: try import Price except (ImportError, LookupError) return None"

requirements-completed: [LIST-01, LIST-02, LIST-03, LIST-04]

# Metrics
duration: 25min
completed: 2026-03-16
---

# Phase 1 Plan 05: Shopping Lists Domain Summary

**Full shopping list CRUD with collaborators (username invite), templates (product-only copy), 20-active-list limit (409), and enriched item response with lazy Price import**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-16T21:05:00Z
- **Completed:** 2026-03-16T21:30:00Z
- **Tasks:** 2
- **Files modified:** 9 created, 1 modified

## Accomplishments

- 5 models migrated: ShoppingList, ShoppingListItem, ListCollaborator, ListTemplate, ListTemplateItem
- Full REST API: list CRUD, nested items, collaborator management, template save/restore
- 20-active-list limit: 409 "Archiva una lista para crear una nueva" on both create and from-template
- Collaborator system: username-based invite, full co-edit rights, removal leaves items intact
- Enriched item GET: product_name, category_name, latest_price, is_stale (lazy import from prices app)
- 47 tests added (19 unit + 28 integration), all passing; full suite 140 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Shopping list models, migration, admin, permissions** - `12849dc` (feat)
2. **Task 2: Shopping list serializers, views, URLs + integration tests** - `703958d` (feat)

## Files Created/Modified

- `backend/apps/shopping_lists/models.py` - 5 models with constraints and FKs
- `backend/apps/shopping_lists/migrations/0001_initial.py` - All 5 shopping list tables
- `backend/apps/shopping_lists/permissions.py` - IsOwnerOrCollaborator permission class
- `backend/apps/shopping_lists/admin.py` - Admin with inlines for items, collaborators, template items
- `backend/apps/shopping_lists/serializers.py` - Enriched item serializer + create/update/template serializers
- `backend/apps/shopping_lists/views.py` - ShoppingListViewSet with all nested actions
- `backend/apps/shopping_lists/urls.py` - DefaultRouter registration
- `backend/tests/unit/test_shopping_lists.py` - 19 unit tests for models and permissions
- `backend/tests/integration/test_list_endpoints.py` - 28 integration tests for all endpoints
- `backend/apps/products/models.py` - Added Meta.indexes GIN declaration (drift fix)

## Decisions Made

- **ActiveListLimitError in views.py:** Domain-specific exception placed in the module that owns it, not in core/exceptions.py. Keeps the exception close to the business rule.
- **Writable is_archived on create serializer:** Using a single serializer for create/update avoids maintaining two near-identical classes; is_archived is never set on create (default False) but is updatable via PATCH.
- **related_name='listcollaborator_set':** Explicit `_set` suffix matches the access pattern `shopping_list.listcollaborator_set.filter(user=...)` used in IsOwnerOrCollaborator.
- **GIN index in Product.Meta.indexes:** Django migration autodetect compares model state to migration state; the index was only in AddIndex operation, not in Meta, causing a spurious removal migration every time migrations were generated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ShoppingListCreateSerializer did not allow archiving via PATCH**
- **Found during:** Task 2 integration tests (TestListCRUD::test_archive_list)
- **Issue:** `is_archived` was in `read_only_fields` of `ShoppingListCreateSerializer`, so PATCH body `{"is_archived": true}` was silently ignored
- **Fix:** Removed `is_archived` from `read_only_fields` — it is settable on update
- **Files modified:** `backend/apps/shopping_lists/serializers.py`
- **Verification:** test_archive_list passes
- **Committed in:** `703958d` (Task 2 commit)

**2. [Rule 1 - Bug] Product GIN index drift caused spurious products 0002 migration**
- **Found during:** Task 1 (makemigrations for shopping_lists)
- **Issue:** Django generated `0002_remove_product_products_normalized_name_gin` because the GIN index was only in the `AddIndex` migration operation, not in `Product.Meta.indexes`. Django thought the index needed to be removed.
- **Fix:** Added `Meta.indexes = [GinIndex(...)]` to Product model; deleted spurious migration; fixed shopping_lists 0001_initial dependency from `('products', '0002_...')` to `('products', '0001_initial')`
- **Files modified:** `backend/apps/products/models.py`, `backend/apps/shopping_lists/migrations/0001_initial.py`
- **Verification:** `makemigrations --check` exits 0, `migrate` applies clean
- **Committed in:** `12849dc` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 - Bug)
**Impact on plan:** Both fixes required for correct operation. No scope creep.

## Issues Encountered

- Django migration autodetect drift for pg_trgm GIN index: the AddIndex in migration and the Meta.indexes on the model must be consistent. Fixed by declaring the index in both places.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shopping lists fully functional; ShoppingListFactory in factories.py resolves correctly
- Price enrichment returns null values until plan 01-04 implements Price model (lazy import guards this)
- Optimizer (later phases) can use ShoppingList + ShoppingListItem as primary input
- The 20-list limit and collaborator system are production-ready

---
*Phase: 01-core-backend*
*Completed: 2026-03-16*

## Self-Check: PASSED

All created files exist on disk. Both task commits confirmed in git log.

| Item | Status |
|------|--------|
| backend/apps/shopping_lists/models.py | FOUND |
| backend/apps/shopping_lists/serializers.py | FOUND |
| backend/apps/shopping_lists/views.py | FOUND |
| backend/apps/shopping_lists/urls.py | FOUND |
| backend/apps/shopping_lists/admin.py | FOUND |
| backend/apps/shopping_lists/permissions.py | FOUND |
| backend/apps/shopping_lists/migrations/0001_initial.py | FOUND |
| backend/tests/unit/test_shopping_lists.py | FOUND |
| backend/tests/integration/test_list_endpoints.py | FOUND |
| Commit 12849dc (Task 1) | FOUND |
| Commit 703958d (Task 2) | FOUND |
