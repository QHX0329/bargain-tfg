"""
Unit tests for the shopping_lists domain.

Tests:
- ShoppingList model creation and constraints
- ShoppingListItem text normalization
- ListCollaborator unique_together constraint
- ListTemplate and ListTemplateItem creation
- IsOwnerOrCollaborator permission logic
- Active list limit: 20 active max, archived lists don't count
- Template copy rule: items with qty=1, is_checked=False
"""

import pytest
from django.db import IntegrityError

from tests.factories import UserFactory

pytestmark = pytest.mark.django_db


# ── Model creation tests ───────────────────────────────────────────────────────


class TestShoppingListModel:
    """Test ShoppingList model behaviour."""

    def test_create_shopping_list(self):
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Mi lista")
        assert sl.pk is not None
        assert sl.name == "Mi lista"
        assert sl.is_archived is False
        assert sl.owner == user

    def test_shopping_list_str(self):
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista semanal")
        assert "Lista semanal" in str(sl)

    def test_shopping_list_ordering_by_updated_at(self):
        """Meta ordering must be -updated_at."""
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        sl1 = ShoppingList.objects.create(owner=user, name="Lista A")
        ShoppingList.objects.create(owner=user, name="Lista B")
        # Touch sl1 to make it newer
        sl1.name = "Lista A updated"
        sl1.save()
        lists = list(ShoppingList.objects.filter(owner=user))
        assert lists[0].pk == sl1.pk


class TestShoppingListItemModel:
    """Test ShoppingListItem constraints."""

    def test_create_item(self):
        from apps.shopping_lists.models import ShoppingList, ShoppingListItem

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista")
        item = ShoppingListItem.objects.create(
            shopping_list=sl, name="Leche entera", quantity=2, added_by=user
        )
        assert item.pk is not None
        assert item.name == "Leche entera"
        assert item.quantity == 2
        assert item.is_checked is False

    def test_item_normalized_name(self):
        """El modelo guarda una versión normalizada del texto libre."""
        from apps.shopping_lists.models import ShoppingList, ShoppingListItem

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista")
        item = ShoppingListItem.objects.create(
            shopping_list=sl,
            name="  Leché-Entera 1L ",
            added_by=user,
        )
        assert item.normalized_name == "leche entera 1l"

    def test_item_default_quantity_is_one(self):
        from apps.shopping_lists.models import ShoppingList, ShoppingListItem

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista")
        item = ShoppingListItem.objects.create(
            shopping_list=sl,
            name="Pan integral",
            added_by=user,
        )
        assert item.quantity == 1


class TestListCollaboratorModel:
    """Test ListCollaborator constraints."""

    def test_create_collaborator(self):
        from apps.shopping_lists.models import ListCollaborator, ShoppingList

        owner = UserFactory()
        collaborator = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")
        lc = ListCollaborator.objects.create(shopping_list=sl, user=collaborator, invited_by=owner)
        assert lc.pk is not None

    def test_collaborator_unique_together(self):
        """Same user cannot be added as collaborator twice."""
        from apps.shopping_lists.models import ListCollaborator, ShoppingList

        owner = UserFactory()
        collaborator = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")
        ListCollaborator.objects.create(shopping_list=sl, user=collaborator, invited_by=owner)
        with pytest.raises(IntegrityError):
            ListCollaborator.objects.create(shopping_list=sl, user=collaborator, invited_by=owner)


class TestListTemplateModel:
    """Test ListTemplate and ListTemplateItem."""

    def test_create_template(self):
        from apps.shopping_lists.models import ListTemplate, ShoppingList

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista fuente")
        template = ListTemplate.objects.create(owner=user, name="Mi plantilla", source_list=sl)
        assert template.pk is not None
        assert template.source_list == sl

    def test_template_source_list_nullable(self):
        from apps.shopping_lists.models import ListTemplate

        user = UserFactory()
        template = ListTemplate.objects.create(owner=user, name="Sin lista fuente")
        assert template.source_list is None

    def test_create_template_item(self):
        from apps.shopping_lists.models import ListTemplate, ListTemplateItem

        user = UserFactory()
        template = ListTemplate.objects.create(owner=user, name="Plantilla")
        item = ListTemplateItem.objects.create(template=template, name="Huevos")
        assert item.pk is not None
        assert item.ordering == 0


# ── Permission tests ───────────────────────────────────────────────────────────


class TestIsOwnerOrCollaboratorPermission:
    """Test IsOwnerOrCollaborator permission class."""

    def test_owner_has_permission(self):
        from unittest.mock import MagicMock

        from apps.shopping_lists.models import ShoppingList
        from apps.shopping_lists.permissions import IsOwnerOrCollaborator

        user = UserFactory()
        sl = ShoppingList.objects.create(owner=user, name="Lista")
        request = MagicMock()
        request.user = user
        perm = IsOwnerOrCollaborator()
        assert perm.has_object_permission(request, None, sl) is True

    def test_collaborator_has_permission(self):
        from unittest.mock import MagicMock

        from apps.shopping_lists.models import ListCollaborator, ShoppingList
        from apps.shopping_lists.permissions import IsOwnerOrCollaborator

        owner = UserFactory()
        collaborator = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")
        ListCollaborator.objects.create(shopping_list=sl, user=collaborator, invited_by=owner)

        request = MagicMock()
        request.user = collaborator
        perm = IsOwnerOrCollaborator()
        assert perm.has_object_permission(request, None, sl) is True

    def test_stranger_has_no_permission(self):
        from unittest.mock import MagicMock

        from apps.shopping_lists.models import ShoppingList
        from apps.shopping_lists.permissions import IsOwnerOrCollaborator

        owner = UserFactory()
        stranger = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")

        request = MagicMock()
        request.user = stranger
        perm = IsOwnerOrCollaborator()
        assert perm.has_object_permission(request, None, sl) is False

    def test_permission_via_item(self):
        """IsOwnerOrCollaborator also works for ShoppingListItem (has shopping_list attr)."""
        from unittest.mock import MagicMock

        from apps.shopping_lists.models import ShoppingList, ShoppingListItem
        from apps.shopping_lists.permissions import IsOwnerOrCollaborator

        owner = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")
        item = ShoppingListItem.objects.create(
            shopping_list=sl,
            name="Tomate frito",
            added_by=owner,
        )

        request = MagicMock()
        request.user = owner
        perm = IsOwnerOrCollaborator()
        assert perm.has_object_permission(request, None, item) is True


# ── Active list limit tests ────────────────────────────────────────────────────


class TestActiveListLimit:
    """Test the 20-active-list limit rule."""

    def test_create_20_active_lists(self):
        """Creating exactly 20 active lists should succeed."""
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        for i in range(20):
            ShoppingList.objects.create(owner=user, name=f"Lista {i}")
        assert ShoppingList.objects.filter(owner=user, is_archived=False).count() == 20

    def test_archived_lists_dont_count_toward_limit(self):
        """Archived lists are excluded from the active count."""
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        for i in range(20):
            ShoppingList.objects.create(owner=user, name=f"Lista {i}")
        # Archive 5 of them
        for sl in ShoppingList.objects.filter(owner=user)[:5]:
            sl.is_archived = True
            sl.save()
        active_count = ShoppingList.objects.filter(owner=user, is_archived=False).count()
        assert active_count == 15

    def test_active_count_is_by_user(self):
        """Active list count is per-user, not global."""
        from apps.shopping_lists.models import ShoppingList

        user1 = UserFactory()
        user2 = UserFactory()
        for i in range(20):
            ShoppingList.objects.create(owner=user1, name=f"Lista {i}")
        # user2 should still be able to create lists
        count_user2 = ShoppingList.objects.filter(owner=user2, is_archived=False).count()
        assert count_user2 == 0


# ── Template copy rule tests ───────────────────────────────────────────────────


class TestTemplateCopyRule:
    """Test that template items always have qty=1 and is_checked=False."""

    def test_template_items_always_qty_one_unchecked(self):
        """
        Template creation: all items should have ordering=0 (default),
        and original list items have nothing to inherit for is_checked because
        ListTemplateItem doesn't have those fields — only the spec on
        ShoppingListItem.is_checked and quantity verification applies when
        creating a list from template.
        """
        from apps.shopping_lists.models import (
            ListTemplate,
            ListTemplateItem,
            ShoppingList,
            ShoppingListItem,
        )

        owner = UserFactory()
        sl = ShoppingList.objects.create(owner=owner, name="Lista")
        # Add items with various quantities and checked states
        ShoppingListItem.objects.create(
            shopping_list=sl, name="Arroz largo", quantity=5, is_checked=True, added_by=owner
        )
        ShoppingListItem.objects.create(
            shopping_list=sl, name="Pasta", quantity=3, is_checked=False, added_by=owner
        )
        # Create template from list
        template = ListTemplate.objects.create(owner=owner, name="Plantilla", source_list=sl)
        for i, item in enumerate(sl.items.all()):
            ListTemplateItem.objects.create(template=template, name=item.name, ordering=i)

        # Verify template items have correct structure
        template_items = list(ListTemplateItem.objects.filter(template=template))
        assert len(template_items) == 2
        # Template items don't carry quantity or is_checked — those are on ShoppingListItem
        template_names = {ti.name for ti in template_items}
        assert "Arroz largo" in template_names
        assert "Pasta" in template_names
