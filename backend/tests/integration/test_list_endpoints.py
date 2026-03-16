"""
Integration tests for the shopping_lists API endpoints.

Tests:
- TestListCRUD: create, retrieve, update, archive, delete lists
- TestListLimit: 20 active list limit; archived lists don't count
- TestListItems: add, update, delete items; enriched GET
- TestCollaborators: invite by username, collaborator can edit, remove keeps items
- TestTemplates: save-template, from-template flow
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from tests.factories import UserFactory, ProductFactory

User = get_user_model()
pytestmark = pytest.mark.django_db


def auth_client(user):
    """Return authenticated APIClient for given user."""
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ── CRUD basics ────────────────────────────────────────────────────────────────


class TestListCRUD:
    """Test basic list CRUD operations."""

    def test_create_list(self):
        user = UserFactory()
        client = auth_client(user)
        response = client.post("/api/v1/lists/", {"name": "Mi lista"}, format="json")
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Mi lista"
        assert data["is_archived"] is False

    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/lists/")
        assert response.status_code == 401

    def test_get_own_lists(self):
        user = UserFactory()
        client = auth_client(user)
        client.post("/api/v1/lists/", {"name": "Lista A"}, format="json")
        client.post("/api/v1/lists/", {"name": "Lista B"}, format="json")
        response = client.get("/api/v1/lists/")
        assert response.status_code == 200
        data = response.json()
        # Response may be wrapped in success envelope or plain list
        if isinstance(data, dict) and "results" in data:
            items = data["results"]
        elif isinstance(data, dict) and "data" in data:
            items = data["data"]
        else:
            items = data
        names = [item["name"] for item in items]
        assert "Lista A" in names
        assert "Lista B" in names

    def test_get_list_detail(self):
        user = UserFactory()
        client = auth_client(user)
        create_resp = client.post("/api/v1/lists/", {"name": "Lista"}, format="json")
        list_id = create_resp.json()["id"]
        response = client.get(f"/api/v1/lists/{list_id}/")
        assert response.status_code == 200
        assert response.json()["id"] == list_id

    def test_update_list_name(self):
        user = UserFactory()
        client = auth_client(user)
        create_resp = client.post("/api/v1/lists/", {"name": "Antigua"}, format="json")
        list_id = create_resp.json()["id"]
        response = client.patch(f"/api/v1/lists/{list_id}/", {"name": "Nueva"}, format="json")
        assert response.status_code == 200
        assert response.json()["name"] == "Nueva"

    def test_archive_list(self):
        user = UserFactory()
        client = auth_client(user)
        create_resp = client.post("/api/v1/lists/", {"name": "Lista"}, format="json")
        list_id = create_resp.json()["id"]
        response = client.patch(
            f"/api/v1/lists/{list_id}/", {"is_archived": True}, format="json"
        )
        assert response.status_code == 200
        assert response.json()["is_archived"] is True

    def test_delete_list(self):
        user = UserFactory()
        client = auth_client(user)
        create_resp = client.post("/api/v1/lists/", {"name": "Lista"}, format="json")
        list_id = create_resp.json()["id"]
        response = client.delete(f"/api/v1/lists/{list_id}/")
        assert response.status_code == 204

    def test_other_user_cannot_access_list(self):
        user1 = UserFactory()
        user2 = UserFactory()
        client1 = auth_client(user1)
        create_resp = client1.post("/api/v1/lists/", {"name": "Privada"}, format="json")
        list_id = create_resp.json()["id"]
        client2 = auth_client(user2)
        response = client2.get(f"/api/v1/lists/{list_id}/")
        assert response.status_code in (403, 404)


# ── Active list limit ─────────────────────────────────────────────────────────


class TestListLimit:
    """Test 20-active-list limit enforcement."""

    def test_create_list_blocked_at_20_active(self):
        """Creating the 21st active list returns 409."""
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        for i in range(20):
            ShoppingList.objects.create(owner=user, name=f"Lista {i}")
        client = auth_client(user)
        response = client.post("/api/v1/lists/", {"name": "Lista 21"}, format="json")
        assert response.status_code == 409
        # Check error message
        data = response.json()
        error_msg = str(data)
        assert "Archiva" in error_msg or "archiva" in error_msg or "lista" in error_msg.lower()

    def test_archived_lists_dont_count(self):
        """If 20 exist but some are archived, creation should succeed."""
        from apps.shopping_lists.models import ShoppingList

        user = UserFactory()
        for i in range(20):
            ShoppingList.objects.create(owner=user, name=f"Lista {i}")
        # Archive 5
        for sl in ShoppingList.objects.filter(owner=user)[:5]:
            sl.is_archived = True
            sl.save()
        client = auth_client(user)
        response = client.post("/api/v1/lists/", {"name": "Nueva lista"}, format="json")
        assert response.status_code == 201


# ── Items ─────────────────────────────────────────────────────────────────────


class TestListItems:
    """Test item CRUD on a shopping list."""

    def setup_method(self):
        self.user = UserFactory()
        self.client = auth_client(self.user)
        create_resp = self.client.post("/api/v1/lists/", {"name": "Lista"}, format="json")
        self.list_id = create_resp.json()["id"]
        self.product = ProductFactory()

    def test_add_item(self):
        response = self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk, "quantity": 2},
            format="json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["product"] == self.product.pk
        assert data["quantity"] == 2

    def test_update_item_quantity(self):
        add_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk, "quantity": 1},
            format="json",
        )
        item_id = add_resp.json()["id"]
        response = self.client.patch(
            f"/api/v1/lists/{self.list_id}/items/{item_id}/",
            {"quantity": 5},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["quantity"] == 5

    def test_check_item(self):
        add_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk},
            format="json",
        )
        item_id = add_resp.json()["id"]
        response = self.client.patch(
            f"/api/v1/lists/{self.list_id}/items/{item_id}/",
            {"is_checked": True},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["is_checked"] is True

    def test_delete_item(self):
        add_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk},
            format="json",
        )
        item_id = add_resp.json()["id"]
        response = self.client.delete(
            f"/api/v1/lists/{self.list_id}/items/{item_id}/"
        )
        assert response.status_code == 204

    def test_get_list_with_enriched_items(self):
        """GET /lists/{id}/ should return items with product_name and category_name."""
        self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk, "quantity": 2},
            format="json",
        )
        response = self.client.get(f"/api/v1/lists/{self.list_id}/")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        assert len(items) == 1
        item = items[0]
        assert "product_name" in item
        assert "category_name" in item
        assert item["product_name"] == self.product.name
        assert item["quantity"] == 2

    def test_duplicate_product_returns_400(self):
        """Adding the same product twice should fail due to unique_together."""
        self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk},
            format="json",
        )
        response = self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product.pk},
            format="json",
        )
        assert response.status_code == 400


# ── Collaborators ─────────────────────────────────────────────────────────────


class TestCollaborators:
    """Test collaborator invite, co-edit, and removal."""

    def setup_method(self):
        self.owner = UserFactory()
        self.collab = UserFactory()
        self.owner_client = auth_client(self.owner)
        self.collab_client = auth_client(self.collab)
        create_resp = self.owner_client.post(
            "/api/v1/lists/", {"name": "Lista compartida"}, format="json"
        )
        self.list_id = create_resp.json()["id"]

    def test_add_collaborator_by_username(self):
        response = self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        assert response.status_code == 201

    def test_collaborator_can_view_list(self):
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        response = self.collab_client.get(f"/api/v1/lists/{self.list_id}/")
        assert response.status_code == 200

    def test_collaborator_can_add_items(self):
        product = ProductFactory()
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        response = self.collab_client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": product.pk},
            format="json",
        )
        assert response.status_code == 201

    def test_collaborator_can_edit_items(self):
        product = ProductFactory()
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        add_resp = self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": product.pk, "quantity": 1},
            format="json",
        )
        item_id = add_resp.json()["id"]
        response = self.collab_client.patch(
            f"/api/v1/lists/{self.list_id}/items/{item_id}/",
            {"quantity": 3},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["quantity"] == 3

    def test_remove_collaborator_keeps_items(self):
        """Removing collaborator does NOT remove their items."""
        product = ProductFactory()
        # Invite collaborator
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        # Collaborator adds an item
        self.collab_client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": product.pk},
            format="json",
        )
        # Remove collaborator
        remove_resp = self.owner_client.delete(
            f"/api/v1/lists/{self.list_id}/collaborators/{self.collab.pk}/"
        )
        assert remove_resp.status_code == 204
        # Item should still exist
        list_resp = self.owner_client.get(f"/api/v1/lists/{self.list_id}/")
        items = list_resp.json().get("items", [])
        assert len(items) == 1

    def test_add_nonexistent_user_returns_400(self):
        response = self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": "nonexistent_user_xyz"},
            format="json",
        )
        assert response.status_code == 400

    def test_add_duplicate_collaborator_returns_400(self):
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        response = self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        assert response.status_code == 400

    def test_collaborator_appears_in_own_list_view(self):
        """Shared list should appear in collaborator's GET /lists/."""
        self.owner_client.post(
            f"/api/v1/lists/{self.list_id}/collaborators/",
            {"username": self.collab.username},
            format="json",
        )
        response = self.collab_client.get("/api/v1/lists/")
        assert response.status_code == 200
        data = response.json()
        if isinstance(data, dict) and "results" in data:
            items = data["results"]
        elif isinstance(data, dict) and "data" in data:
            items = data["data"]
        else:
            items = data
        ids = [item["id"] for item in items]
        assert self.list_id in ids


# ── Templates ─────────────────────────────────────────────────────────────────


class TestTemplates:
    """Test template save and from-template creation."""

    def setup_method(self):
        self.user = UserFactory()
        self.client = auth_client(self.user)
        create_resp = self.client.post("/api/v1/lists/", {"name": "Lista original"}, format="json")
        self.list_id = create_resp.json()["id"]
        self.product1 = ProductFactory()
        self.product2 = ProductFactory()
        # Add items with varied quantities and checked states
        self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product1.pk, "quantity": 5, "is_checked": True},
            format="json",
        )
        self.client.post(
            f"/api/v1/lists/{self.list_id}/items/",
            {"product": self.product2.pk, "quantity": 3},
            format="json",
        )

    def test_save_template(self):
        response = self.client.post(
            f"/api/v1/lists/{self.list_id}/save-template/",
            {"name": "Mi plantilla"},
            format="json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Mi plantilla"

    def test_save_template_copies_products_only(self):
        """Template items have the same products but the list state is irrelevant."""
        save_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/save-template/",
            {"name": "Plantilla"},
            format="json",
        )
        assert save_resp.status_code == 201
        template_id = save_resp.json()["id"]
        # Create list from template
        from_resp = self.client.post(
            f"/api/v1/lists/from-template/{template_id}/",
            {"name": "Nueva desde plantilla"},
            format="json",
        )
        assert from_resp.status_code == 201
        new_list_id = from_resp.json()["id"]
        # Check items: qty=1, is_checked=False
        detail_resp = self.client.get(f"/api/v1/lists/{new_list_id}/")
        items = detail_resp.json().get("items", [])
        assert len(items) == 2
        for item in items:
            assert item["quantity"] == 1
            assert item["is_checked"] is False

    def test_from_template_creates_new_list(self):
        save_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/save-template/",
            {"name": "Plantilla base"},
            format="json",
        )
        template_id = save_resp.json()["id"]
        response = self.client.post(
            f"/api/v1/lists/from-template/{template_id}/",
            {"name": "Lista desde plantilla"},
            format="json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Lista desde plantilla"
        assert data["is_archived"] is False

    def test_from_template_respects_20_list_limit(self):
        """from-template creation is also blocked at 20 active lists."""
        from apps.shopping_lists.models import ShoppingList

        save_resp = self.client.post(
            f"/api/v1/lists/{self.list_id}/save-template/",
            {"name": "Plantilla"},
            format="json",
        )
        template_id = save_resp.json()["id"]
        # Fill user to 20 active lists (1 already created in setup)
        for i in range(19):
            ShoppingList.objects.create(owner=self.user, name=f"Extra {i}")
        response = self.client.post(
            f"/api/v1/lists/from-template/{template_id}/",
            {"name": "Excede límite"},
            format="json",
        )
        assert response.status_code == 409
