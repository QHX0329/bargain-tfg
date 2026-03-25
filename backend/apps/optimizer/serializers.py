"""
Serializadores del modulo optimizer.

Incluye validacion de la peticion de optimizacion y formato de respuesta.
"""

from rest_framework import serializers


class OptimizeRequestSerializer(serializers.Serializer):
    """Serializa y valida la peticion de optimizacion de ruta de compra."""

    shopping_list_id = serializers.IntegerField(
        help_text="ID de la lista de la compra a optimizar",
    )
    lat = serializers.FloatField(help_text="Latitud del usuario")
    lng = serializers.FloatField(help_text="Longitud del usuario")
    max_distance_km = serializers.FloatField(
        default=10.0,
        min_value=1.0,
        max_value=50.0,
        help_text="Radio maximo de busqueda en km",
    )
    max_stops = serializers.IntegerField(
        default=3,
        min_value=2,
        max_value=5,
        help_text="Numero maximo de tiendas a visitar",
    )
    w_precio = serializers.FloatField(
        default=0.5,
        min_value=0,
        max_value=1,
        help_text="Peso del ahorro en precio (0-1)",
    )
    w_distancia = serializers.FloatField(
        default=0.3,
        min_value=0,
        max_value=1,
        help_text="Peso de la distancia (0-1)",
    )
    w_tiempo = serializers.FloatField(
        default=0.2,
        min_value=0,
        max_value=1,
        help_text="Peso del tiempo (0-1)",
    )

    def validate(self, attrs: dict) -> dict:
        """Normaliza los pesos para que sumen 1.0."""
        w_p = attrs.get("w_precio", 0.5)
        w_d = attrs.get("w_distancia", 0.3)
        w_t = attrs.get("w_tiempo", 0.2)
        total = w_p + w_d + w_t

        if total <= 0:
            raise serializers.ValidationError(
                "La suma de los pesos debe ser mayor que 0."
            )

        attrs["w_precio"] = w_p / total
        attrs["w_distancia"] = w_d / total
        attrs["w_tiempo"] = w_t / total
        return attrs


class RouteStopSerializer(serializers.Serializer):
    """Serializa una parada de la ruta optimizada."""

    store_id = serializers.IntegerField()
    store_name = serializers.CharField()
    chain = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    distance_km = serializers.FloatField()
    time_minutes = serializers.FloatField()
    products = serializers.ListField(child=serializers.DictField())


class OptimizeResponseSerializer(serializers.Serializer):
    """Serializa el resultado de una optimizacion de ruta."""

    id = serializers.IntegerField(help_text="ID del resultado persistido en BD")
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_distance_km = serializers.FloatField()
    estimated_time_minutes = serializers.FloatField()
    route = RouteStopSerializer(many=True, source="route_data")
