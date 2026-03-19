# Generated migration: adds nullable business_profile FK to Store

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("business", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="store",
            name="business_profile",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stores",
                to="business.businessprofile",
                verbose_name="Perfil de negocio",
            ),
        ),
    ]
