"""
Migración inicial del módulo core.

Habilita la extensión PostGIS en PostgreSQL.
Esta migración debe ejecutarse ANTES que cualquier otra que use
campos geoespaciales (PointField, PolygonField, etc.).

Todas las apps que usen GeoDjango deben depender de:
    ('core', '0001_postgis')
"""

from django.db import migrations


class Migration(migrations.Migration):
    """Habilita PostGIS en la base de datos."""

    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS postgis;",
            reverse_sql="SELECT 1;",  # No eliminar PostGIS en reversa (puede afectar otros datos)
        ),
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS postgis_topology;",
            reverse_sql="SELECT 1;",
        ),
    ]
