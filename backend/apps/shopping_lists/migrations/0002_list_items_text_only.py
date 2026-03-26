from __future__ import annotations

import re
import unicodedata

from django.db import migrations, models


_MULTISPACE_RE = re.compile(r"\s+")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower().strip()
    ascii_text = _NON_ALNUM_RE.sub(" ", ascii_text)
    return _MULTISPACE_RE.sub(" ", ascii_text).strip()


def copy_product_names(apps, schema_editor) -> None:
    ShoppingListItem = apps.get_model("shopping_lists", "ShoppingListItem")
    ListTemplateItem = apps.get_model("shopping_lists", "ListTemplateItem")

    for item in ShoppingListItem.objects.select_related("product").all():
        name = ""
        normalized_name = ""
        if getattr(item, "product_id", None):
            name = item.product.name
            normalized_name = getattr(item.product, "normalized_name", "") or _normalize(name)
        item.name = name
        item.normalized_name = normalized_name
        item.save(update_fields=["name", "normalized_name"])

    for template_item in ListTemplateItem.objects.select_related("product").all():
        name = ""
        normalized_name = ""
        if getattr(template_item, "product_id", None):
            name = template_item.product.name
            normalized_name = (
                getattr(template_item.product, "normalized_name", "") or _normalize(name)
            )
        template_item.name = name
        template_item.normalized_name = normalized_name
        template_item.save(update_fields=["name", "normalized_name"])


class Migration(migrations.Migration):
    dependencies = [
        ("shopping_lists", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shoppinglistitem",
            name="name",
            field=models.CharField(default="", max_length=255, verbose_name="Texto del item"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="shoppinglistitem",
            name="normalized_name",
            field=models.CharField(
                db_index=True,
                default="",
                max_length=255,
                verbose_name="Texto normalizado",
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="listtemplateitem",
            name="name",
            field=models.CharField(default="", max_length=255, verbose_name="Texto del item"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="listtemplateitem",
            name="normalized_name",
            field=models.CharField(
                db_index=True,
                default="",
                max_length=255,
                verbose_name="Texto normalizado",
            ),
            preserve_default=False,
        ),
        migrations.RunPython(copy_product_names, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name="shoppinglistitem",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="shoppinglistitem",
            name="product",
        ),
        migrations.RemoveField(
            model_name="listtemplateitem",
            name="product",
        ),
    ]
