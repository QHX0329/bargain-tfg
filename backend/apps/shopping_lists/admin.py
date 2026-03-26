"""Admin de Django para el dominio shopping_lists."""

from django.contrib import admin

from .models import (
    ListCollaborator,
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)


class ShoppingListItemInline(admin.TabularInline):
    model = ShoppingListItem
    extra = 0
    readonly_fields = ("added_by", "created_at")
    fields = ("name", "quantity", "is_checked", "added_by", "created_at")


class ListCollaboratorInline(admin.TabularInline):
    model = ListCollaborator
    extra = 0
    readonly_fields = ("invited_by", "created_at")
    fields = ("user", "invited_by", "created_at")


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "is_archived", "created_at", "updated_at")
    list_filter = ("is_archived",)
    search_fields = ("name", "owner__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ShoppingListItemInline, ListCollaboratorInline]


@admin.register(ListCollaborator)
class ListCollaboratorAdmin(admin.ModelAdmin):
    list_display = ("shopping_list", "user", "invited_by", "created_at")
    search_fields = ("shopping_list__name", "user__username")
    readonly_fields = ("created_at",)


class ListTemplateItemInline(admin.TabularInline):
    model = ListTemplateItem
    extra = 0
    fields = ("name", "ordering")


@admin.register(ListTemplate)
class ListTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "source_list", "created_at")
    search_fields = ("name", "owner__username")
    readonly_fields = ("created_at",)
    inlines = [ListTemplateItemInline]
