"""
Modelos del dominio shopping_lists.

Incluye:
- ShoppingList: lista de la compra de un usuario
- ShoppingListItem: ítem de una lista con texto libre
- ListCollaborator: colaborador invitado a una lista
- ListTemplate: plantilla reutilizable de lista
- ListTemplateItem: ítem de una plantilla
"""

from django.conf import settings
from django.db import models

from .utils import normalize_list_text


class ShoppingList(models.Model):
    """Lista de la compra de un usuario con soporte de colaboración."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_lists",
        verbose_name="Propietario",
    )
    name = models.CharField(max_length=200, verbose_name="Nombre")
    is_archived = models.BooleanField(default=False, verbose_name="Archivada")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado en")

    class Meta:
        verbose_name = "Lista de la compra"
        verbose_name_plural = "Listas de la compra"
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        archived = " [archivada]" if self.is_archived else ""
        return f"{self.name}{archived} ({self.owner.username})"


class ShoppingListItem(models.Model):
    """Ítem de una lista de la compra basado en texto libre."""

    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Lista de la compra",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Texto del item",
    )
    normalized_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Texto normalizado",
    )
    quantity = models.PositiveSmallIntegerField(default=1, verbose_name="Cantidad")
    is_checked = models.BooleanField(default=False, verbose_name="Marcado")
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_items",
        verbose_name="Añadido por",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")

    class Meta:
        verbose_name = "Ítem de lista"
        verbose_name_plural = "Ítems de lista"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.name} x{self.quantity} [{self.shopping_list.name}]"

    def save(self, *args, **kwargs) -> None:
        if self.name:
            self.name = self.name.strip()
        self.normalized_name = normalize_list_text(self.name)
        super().save(*args, **kwargs)


class ListCollaborator(models.Model):
    """Colaborador invitado a editar una lista de la compra."""

    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="listcollaborator_set",
        verbose_name="Lista de la compra",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="collaborating_lists",
        verbose_name="Colaborador",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invitations",
        verbose_name="Invitado por",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de invitación")

    class Meta:
        verbose_name = "Colaborador de lista"
        verbose_name_plural = "Colaboradores de lista"
        unique_together = [("shopping_list", "user")]
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} → {self.shopping_list.name}"


class ListTemplate(models.Model):
    """Plantilla reutilizable de lista de la compra."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="list_templates",
        verbose_name="Propietario",
    )
    name = models.CharField(max_length=200, verbose_name="Nombre")
    source_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates",
        verbose_name="Lista de origen",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")

    class Meta:
        verbose_name = "Plantilla de lista"
        verbose_name_plural = "Plantillas de lista"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Plantilla: {self.name} ({self.owner.username})"


class ListTemplateItem(models.Model):
    """Ítem textual de una plantilla de lista de la compra."""

    template = models.ForeignKey(
        ListTemplate,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Plantilla",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Texto del item",
    )
    normalized_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Texto normalizado",
    )
    ordering = models.PositiveSmallIntegerField(default=0, verbose_name="Orden")

    class Meta:
        verbose_name = "Ítem de plantilla"
        verbose_name_plural = "Ítems de plantilla"
        ordering = ["ordering"]

    def __str__(self) -> str:
        return f"{self.name} [{self.template.name}]"

    def save(self, *args, **kwargs) -> None:
        if self.name:
            self.name = self.name.strip()
        self.normalized_name = normalize_list_text(self.name)
        super().save(*args, **kwargs)
