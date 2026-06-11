"""Comando ``seed_sevilla``: red ficticia de supermercados por Sevilla a gran escala.

Crea de forma idempotente (sin borrar nada existente):

- 7 cadenas ficticias y 50 tiendas repartidas por los barrios de Sevilla y su
  área metropolitana, con coordenadas PostGIS reales aproximadas.
- Un catálogo normalizado de ~1.300 productos con precios base estilo Mercadona.
- Para cada tienda, un subconjunto determinista de al menos 1.000 productos con
  precio propio (variación ±12 % por tienda) y ofertas puntuales (~15 %).

Todo el aleatorio es determinista (hash MD5 de claves estables), de modo que
ejecuciones repetidas producen exactamente los mismos datos y solo rellenan
lo que falte. Pensado para ejecutarse en el arranque del servicio de Render.

Uso:
    python manage.py seed_sevilla [--stores 50] [--min-prices 1000]
"""

import hashlib
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.prices.models import Price
from apps.products.models import Category, Product
from apps.stores.models import Store, StoreChain

# --------------------------------------------------------------------- cadenas --
CHAINS = [
    ("superguadalquivir", "SuperGuadalquivir"),
    ("mercasur", "MercaSur"),
    ("hispalis-market", "Hispalis Market"),
    ("superazahar", "SuperAzahar"),
    ("almacenes-triana", "Almacenes Triana"),
    ("la-giralda-super", "La Giralda Súper"),
    ("superbetica", "SuperBética"),
]

# 50 zonas de Sevilla capital y área metropolitana: (zona, lat, lng).
LOCATIONS = [
    ("Casco Antiguo", 37.3891, -5.9945),
    ("Alameda", 37.3990, -5.9930),
    ("Triana", 37.3826, -6.0027),
    ("El Tardón", 37.3850, -6.0080),
    ("Barrio León", 37.3780, -6.0090),
    ("Los Remedios", 37.3743, -6.0000),
    ("Nervión", 37.3839, -5.9731),
    ("San Bernardo", 37.3800, -5.9810),
    ("La Buhaira", 37.3810, -5.9770),
    ("Santa Justa", 37.3920, -5.9750),
    ("La Macarena", 37.4031, -5.9903),
    ("La Bachillera", 37.4130, -5.9860),
    ("San Jerónimo", 37.4221, -5.9783),
    ("Pino Montano", 37.4226, -5.9614),
    ("Polígono Norte", 37.4090, -5.9750),
    ("Valdezorras", 37.4310, -5.9420),
    ("San Pablo", 37.3960, -5.9520),
    ("Santa Clara", 37.3980, -5.9430),
    ("Aeropuerto Viejo", 37.4050, -5.9350),
    ("Sevilla Este", 37.4007, -5.9201),
    ("Parque Alcosa", 37.4082, -5.9243),
    ("Torreblanca", 37.3850, -5.9034),
    ("Amate", 37.3780, -5.9450),
    ("Rochelambert", 37.3690, -5.9450),
    ("Cerro del Águila", 37.3702, -5.9610),
    ("Su Eminencia", 37.3640, -5.9580),
    ("El Juncal", 37.3650, -5.9560),
    ("Ciudad Jardín", 37.3800, -5.9560),
    ("La Calzada", 37.3870, -5.9780),
    ("El Plantinar", 37.3680, -5.9690),
    ("El Porvenir", 37.3700, -5.9850),
    ("Bami", 37.3590, -5.9790),
    ("Heliópolis", 37.3540, -5.9810),
    ("Los Bermejales", 37.3470, -5.9760),
    ("Bellavista", 37.3260, -5.9690),
    ("La Cartuja", 37.4036, -6.0080),
    ("Montequinto", 37.3300, -5.9330),
    ("Dos Hermanas Centro", 37.2850, -5.9220),
    ("Alcalá de Guadaíra", 37.3380, -5.8390),
    ("Mairena del Aljarafe", 37.3440, -6.0640),
    ("San Juan de Aznalfarache", 37.3590, -6.0370),
    ("Tomares", 37.3720, -6.0460),
    ("Bormujos", 37.3740, -6.0720),
    ("Camas", 37.4020, -6.0330),
    ("Castilleja de la Cuesta", 37.3860, -6.0540),
    ("Gines", 37.3870, -6.0780),
    ("La Rinconada", 37.4870, -5.9810),
    ("San José de la Rinconada", 37.4690, -5.9590),
    ("Coria del Río", 37.2880, -6.0530),
    ("Gelves", 37.3340, -6.0240),
]

# Marca blanca ficticia común (más barata, como Hacendado en Mercadona).
WHITE_LABEL = "BienStar"

# ------------------------------------------------------------------- catálogo --
# Cada familia: (categoría, unidad, [marcas], [(nombre, cantidad, precio base €)])
# El precio base es el de la marca de referencia; cada marca aplica un
# multiplicador determinista (la marca blanca siempre es más barata).
FAMILIES: list[tuple[str, str, list[str], list[tuple[str, float, float]]]] = [
    (
        "Lácteos",
        "l",
        ["Puleva", "Pascual", "Asturiana", WHITE_LABEL],
        [
            ("Leche entera brik 1L", 1.0, 0.98),
            ("Leche semidesnatada brik 1L", 1.0, 0.98),
            ("Leche desnatada brik 1L", 1.0, 0.98),
            ("Leche sin lactosa semidesnatada 1L", 1.0, 1.25),
            ("Leche fresca entera 1L", 1.0, 1.40),
            ("Batido de chocolate 1L", 1.0, 1.15),
            ("Horchata de chufa 1L", 1.0, 1.65),
        ],
    ),
    (
        "Lácteos",
        "units",
        ["Danone", "Nestlé", "La Vega", WHITE_LABEL],
        [
            ("Yogur natural pack 4", 4.0, 1.10),
            ("Yogur natural azucarado pack 4", 4.0, 1.15),
            ("Yogur desnatado pack 4", 4.0, 1.25),
            ("Yogur griego natural pack 4", 4.0, 1.75),
            ("Yogur sabor fresa pack 4", 4.0, 1.20),
            ("Yogur sabor limón pack 4", 4.0, 1.20),
            ("Yogur con bífidus pack 4", 4.0, 1.55),
            ("Yogur líquido de fresa 1L", 1.0, 1.45),
            ("Flan de huevo pack 4", 4.0, 1.30),
            ("Natillas de chocolate pack 4", 4.0, 1.25),
        ],
    ),
    (
        "Lácteos",
        "g",
        ["García Baquero", "El Cigarral", "Millán Vicente", WHITE_LABEL],
        [
            ("Queso curado cuña 250g", 250.0, 3.95),
            ("Queso semicurado cuña 250g", 250.0, 3.45),
            ("Queso tierno cuña 250g", 250.0, 2.95),
            ("Queso rallado 4 quesos 200g", 200.0, 1.85),
            ("Queso en lonchas havarti 200g", 200.0, 1.95),
            ("Queso fresco de Burgos 250g", 250.0, 1.45),
            ("Queso de cabra rulo 180g", 180.0, 2.65),
            ("Mozzarella fresca 125g", 125.0, 0.95),
            ("Queso crema untable 300g", 300.0, 1.85),
            ("Requesón 250g", 250.0, 1.55),
        ],
    ),
    (
        "Lácteos",
        "g",
        ["Central Lechera", WHITE_LABEL],
        [
            ("Mantequilla 250g", 250.0, 2.55),
            ("Margarina vegetal 500g", 500.0, 1.75),
            ("Nata para cocinar 200ml", 200.0, 0.85),
            ("Nata para montar 200ml", 200.0, 1.05),
            ("Cuajada pack 4", 4.0, 1.45),
            ("Leche condensada 450g", 450.0, 2.25),
        ],
    ),
    (
        "Panadería",
        "units",
        ["Bimbo", "La Espiga de Oro", "Horno del Arenal", WHITE_LABEL],
        [
            ("Pan de barra clásico", 1.0, 0.65),
            ("Chapata rústica", 1.0, 0.95),
            ("Hogaza integral", 1.0, 1.45),
            ("Pan de molde blanco 700g", 1.0, 1.55),
            ("Pan de molde integral 700g", 1.0, 1.85),
            ("Pan de molde sin corteza 450g", 1.0, 1.75),
            ("Pan tostado 30 rebanadas", 1.0, 1.35),
            ("Pan rallado 500g", 1.0, 0.85),
            ("Pan de hamburguesa pack 4", 4.0, 1.15),
            ("Pan de perrito pack 6", 6.0, 1.25),
            ("Picos camperos 250g", 1.0, 0.95),
            ("Regañás artesanas 200g", 1.0, 1.15),
        ],
    ),
    (
        "Bollería",
        "units",
        ["La Tahona", "Dulcesol", WHITE_LABEL],
        [
            ("Croissants pack 6", 6.0, 1.45),
            ("Magdalenas cuadradas 12 uds", 12.0, 1.55),
            ("Napolitanas de chocolate pack 4", 4.0, 1.65),
            ("Donuts glaseados pack 4", 4.0, 1.85),
            ("Sobaos pasiegos 8 uds", 8.0, 1.75),
            ("Bizcocho de mármol 400g", 1.0, 2.15),
            ("Palmeras de hojaldre pack 2", 2.0, 1.25),
            ("Torrijas pack 4", 4.0, 2.45),
        ],
    ),
    (
        "Huevos",
        "units",
        ["Granja San Miguel", "Avícola del Sur", WHITE_LABEL],
        [
            ("Huevos L docena", 12.0, 2.45),
            ("Huevos M docena", 12.0, 2.15),
            ("Huevos L media docena", 6.0, 1.35),
            ("Huevos camperos L docena", 12.0, 3.15),
            ("Huevos ecológicos M docena", 12.0, 3.85),
        ],
    ),
    (
        "Despensa",
        "kg",
        ["La Fallera", "SOS", "Brillante", WHITE_LABEL],
        [
            ("Arroz redondo 1kg", 1.0, 1.45),
            ("Arroz largo 1kg", 1.0, 1.35),
            ("Arroz basmati 500g", 0.5, 1.65),
            ("Arroz integral 1kg", 1.0, 1.75),
            ("Arroz vaporizado 1kg", 1.0, 1.85),
            ("Arroz para sushi 500g", 0.5, 1.95),
            ("Arroz bomba 500g", 0.5, 2.45),
        ],
    ),
    (
        "Despensa",
        "g",
        ["Gallo", "La Campagna", "Barilla", "Romero", WHITE_LABEL],
        [
            ("Espaguetis 500g", 500.0, 1.10),
            ("Macarrones 500g", 500.0, 1.05),
            ("Tallarines 500g", 500.0, 1.15),
            ("Fusilli 500g", 500.0, 1.15),
            ("Pajaritas 500g", 500.0, 1.20),
            ("Placas de lasaña 500g", 500.0, 1.85),
            ("Fideos nº2 500g", 500.0, 0.95),
            ("Espaguetis integrales 500g", 500.0, 1.35),
            ("Canelones 20 placas", 20.0, 1.45),
            ("Cuscús 500g", 500.0, 1.55),
        ],
    ),
    (
        "Despensa",
        "kg",
        ["Luengo", WHITE_LABEL],
        [
            ("Garbanzos secos 1kg", 1.0, 2.25),
            ("Lentejas pardinas 1kg", 1.0, 2.45),
            ("Alubias blancas 1kg", 1.0, 2.65),
            ("Lentejas rojas 500g", 0.5, 1.65),
            ("Quinoa 500g", 0.5, 2.85),
        ],
    ),
    (
        "Despensa",
        "l",
        ["Coosur", "La Española", "Carbonell", WHITE_LABEL],
        [
            ("Aceite de oliva virgen extra 1L", 1.0, 7.95),
            ("Aceite de oliva virgen 1L", 1.0, 6.95),
            ("Aceite de oliva suave 1L", 1.0, 6.45),
            ("Aceite de girasol 1L", 1.0, 1.85),
            ("AOVE picual 500ml", 0.5, 4.95),
            ("Vinagre de vino 500ml", 0.5, 0.65),
            ("Vinagre de Jerez 250ml", 0.25, 1.45),
            ("Vinagre de manzana 500ml", 0.5, 1.15),
            ("Aceite de oliva en spray 200ml", 0.2, 2.45),
        ],
    ),
    (
        "Despensa",
        "kg",
        ["Gallo", "Azucarera", WHITE_LABEL],
        [
            ("Harina de trigo 1kg", 1.0, 0.85),
            ("Harina de repostería 1kg", 1.0, 1.05),
            ("Azúcar blanco 1kg", 1.0, 1.15),
            ("Azúcar moreno 1kg", 1.0, 1.55),
            ("Levadura química 3 sobres", 3.0, 0.65),
            ("Sal fina 1kg", 1.0, 0.45),
            ("Sal gruesa 1kg", 1.0, 0.50),
            ("Edulcorante 300 comprimidos", 300.0, 2.35),
            ("Cacao puro en polvo 250g", 0.25, 2.55),
            ("Maicena 400g", 0.4, 1.35),
        ],
    ),
    (
        "Salsas",
        "ml",
        ["Choví", "Prima", "Heinz", "Ybarra", WHITE_LABEL],
        [
            ("Tomate frito brik 400g", 400.0, 0.85),
            ("Tomate frito estilo casero 300g", 300.0, 1.15),
            ("Mayonesa 450ml", 450.0, 1.85),
            ("Ketchup 300ml", 300.0, 1.25),
            ("Mostaza 300ml", 300.0, 1.15),
            ("Salsa barbacoa 300ml", 300.0, 1.45),
            ("Alioli 175ml", 175.0, 1.35),
            ("Salsa de soja 150ml", 150.0, 1.25),
            ("Pesto genovés 190g", 190.0, 2.15),
            ("Salsa de yogur 250ml", 250.0, 1.30),
        ],
    ),
    (
        "Despensa",
        "l",
        ["Gallina Blanca", "Aneto", WHITE_LABEL],
        [
            ("Caldo de pollo 1L", 1.0, 1.25),
            ("Caldo de verduras 1L", 1.0, 1.25),
            ("Caldo de pescado 1L", 1.0, 1.55),
            ("Sopa de fideos sobre", 1.0, 0.95),
            ("Crema de calabaza 500ml", 0.5, 1.65),
            ("Gazpacho suave 1L", 1.0, 1.85),
        ],
    ),
    (
        "Conservas",
        "units",
        ["Calvo", "Isabel", "Cabo de Peñas", WHITE_LABEL],
        [
            ("Atún en aceite de girasol pack 3", 3.0, 2.45),
            ("Atún en aceite de oliva pack 3", 3.0, 2.95),
            ("Atún al natural pack 3", 3.0, 2.55),
            ("Sardinas en aceite 120g", 1.0, 1.15),
            ("Mejillones en escabeche 8-12", 1.0, 1.65),
            ("Berberechos al natural 40-50", 1.0, 2.95),
            ("Caballa en aceite 125g", 1.0, 1.45),
            ("Anchoas en aceite 50g", 1.0, 2.25),
            ("Pulpo en aceite 111g", 1.0, 2.85),
        ],
    ),
    (
        "Conservas",
        "g",
        ["Cidacos", "El Huerto Real", "La Huerta de Itálica", WHITE_LABEL],
        [
            ("Garbanzos cocidos 400g", 400.0, 0.95),
            ("Lentejas cocidas 400g", 400.0, 0.95),
            ("Alubias cocidas 400g", 400.0, 0.95),
            ("Maíz dulce 300g", 300.0, 1.05),
            ("Aceitunas manzanilla 350g", 350.0, 1.25),
            ("Aceitunas sin hueso 150g", 150.0, 0.85),
            ("Pimientos del piquillo 290g", 290.0, 1.95),
            ("Espárragos blancos 250g", 250.0, 2.85),
            ("Tomate triturado 800g", 800.0, 1.15),
            ("Tomate entero pelado 780g", 780.0, 1.25),
            ("Champiñón laminado 355g", 355.0, 1.15),
            ("Corazones de alcachofa 390g", 390.0, 2.25),
            ("Pisto de verduras 400g", 400.0, 1.55),
            ("Menestra de verduras 660g", 660.0, 1.75),
        ],
    ),
    (
        "Conservas",
        "g",
        ["Cidacos", WHITE_LABEL],
        [
            ("Melocotón en almíbar 840g", 840.0, 1.95),
            ("Piña en su jugo 565g", 565.0, 1.65),
            ("Cóctel de frutas 840g", 840.0, 2.15),
            ("Mandarina en almíbar 312g", 312.0, 1.25),
        ],
    ),
    (
        "Carnicería",
        "kg",
        [""],
        [
            ("Pechuga de pollo 1kg", 1.0, 6.50),
            ("Muslos de pollo 1kg", 1.0, 3.45),
            ("Alitas de pollo 1kg", 1.0, 3.25),
            ("Pollo entero", 1.0, 4.95),
            ("Filetes de pechuga de pavo 500g", 0.5, 3.95),
            ("Carne picada mixta 500g", 0.5, 3.95),
            ("Carne picada de vacuno 500g", 0.5, 4.65),
            ("Lomo de cerdo 1kg", 1.0, 5.95),
            ("Chuletas de cerdo 1kg", 1.0, 4.95),
            ("Secreto ibérico 500g", 0.5, 5.45),
            ("Costillas de cerdo 1kg", 1.0, 5.25),
            ("Filetes de ternera 1ª 500g", 0.5, 6.45),
            ("Entrecot de vacuno 400g", 0.4, 7.95),
            ("Hamburguesas de vacuno pack 4", 0.4, 3.45),
            ("Salchichas frescas pack 8", 0.4, 2.45),
            ("Chorizo fresco 400g", 0.4, 2.65),
            ("Morcilla de cebolla 300g", 0.3, 1.95),
            ("Panceta fresca 400g", 0.4, 2.55),
            ("Conejo entero", 1.0, 6.95),
            ("Chuletillas de cordero 500g", 0.5, 8.45),
        ],
    ),
    (
        "Charcutería",
        "g",
        ["ElPozo", "Campofrío", "Navidul", WHITE_LABEL],
        [
            ("Jamón serrano en lonchas 200g", 200.0, 2.95),
            ("Jamón cocido extra 200g", 200.0, 1.95),
            ("Pechuga de pavo en lonchas 200g", 200.0, 1.85),
            ("Chorizo ibérico 100g", 100.0, 1.85),
            ("Salchichón ibérico 100g", 100.0, 1.75),
            ("Fuet extra 180g", 180.0, 1.65),
            ("Bacon en lonchas 200g", 200.0, 1.95),
            ("Mortadela con aceitunas 300g", 300.0, 1.45),
            ("Salchichas cocidas pack 8", 8.0, 1.25),
            ("Lomo embuchado 100g", 100.0, 2.15),
        ],
    ),
    (
        "Pescadería",
        "g",
        [""],
        [
            ("Filetes de merluza 400g", 400.0, 5.60),
            ("Salmón fresco 500g", 500.0, 6.95),
            ("Lubina ración 400g", 400.0, 4.45),
            ("Dorada ración 400g", 400.0, 4.25),
            ("Bacalao desalado 400g", 400.0, 6.45),
            ("Gambón argentino 800g", 800.0, 8.95),
            ("Langostino cocido 500g", 500.0, 7.45),
            ("Mejillón fresco 1kg", 1000.0, 2.95),
            ("Anillas de calamar 400g", 400.0, 4.95),
            ("Pulpo cocido 300g", 300.0, 6.95),
            ("Boquerones frescos 500g", 500.0, 3.45),
            ("Sardinas frescas 500g", 500.0, 2.95),
            ("Filete de atún 300g", 300.0, 5.95),
            ("Cola de rape 500g", 500.0, 9.45),
        ],
    ),
    (
        "Congelados",
        "g",
        ["Pescanova", WHITE_LABEL],
        [
            ("Merluza empanada 400g", 400.0, 3.45),
            ("Varitas de pescado 300g", 300.0, 2.45),
            ("Gamba pelada 250g", 250.0, 4.45),
            ("Calamares a la romana 400g", 400.0, 3.25),
            ("Palitos de surimi 200g", 200.0, 1.45),
            ("Filetes de panga 500g", 500.0, 3.95),
        ],
    ),
    (
        "Congelados",
        "g",
        ["La Cocinera", "Findus", "Polo Sur", WHITE_LABEL],
        [
            ("Pizza margarita 350g", 350.0, 2.45),
            ("Pizza barbacoa 400g", 400.0, 2.95),
            ("Pizza 4 quesos 380g", 380.0, 2.95),
            ("Verduras salteadas 750g", 750.0, 2.15),
            ("Menestra de verduras 1kg", 1000.0, 1.95),
            ("Guisantes 750g", 750.0, 1.75),
            ("Patatas fritas corte fino 1kg", 1000.0, 1.85),
            ("Croquetas de jamón 500g", 500.0, 2.45),
            ("Empanadillas de atún 12 uds", 12.0, 2.25),
            ("Helado de nata 1L", 1000.0, 2.95),
            ("Helado de chocolate 1L", 1000.0, 2.95),
            ("Tarta helada de turrón", 1.0, 3.95),
        ],
    ),
    (
        "Frutería",
        "kg",
        [""],
        [
            ("Manzana fuji 1kg", 1.0, 2.10),
            ("Manzana golden 1kg", 1.0, 1.85),
            ("Pera conferencia 1kg", 1.0, 1.95),
            ("Plátano de Canarias 1kg", 1.0, 2.35),
            ("Banana 1kg", 1.0, 1.45),
            ("Naranja de zumo 2kg", 2.0, 2.60),
            ("Naranja de mesa 1kg", 1.0, 1.65),
            ("Mandarina 1kg", 1.0, 1.95),
            ("Limón 1kg", 1.0, 1.75),
            ("Fresas 500g", 0.5, 2.80),
            ("Sandía pieza", 1.0, 4.50),
            ("Melón piel de sapo pieza", 1.0, 3.95),
            ("Uva blanca sin semilla 500g", 0.5, 2.25),
            ("Kiwi 1kg", 1.0, 3.45),
            ("Aguacates pack 2", 2.0, 2.50),
            ("Mango pieza", 1.0, 1.85),
            ("Piña pieza", 1.0, 2.95),
            ("Melocotón 1kg", 1.0, 2.45),
            ("Nectarina 1kg", 1.0, 2.35),
            ("Ciruela roja 1kg", 1.0, 2.55),
            ("Cereza 500g", 0.5, 3.45),
            ("Granada 1kg", 1.0, 2.65),
        ],
    ),
    (
        "Verdulería",
        "kg",
        [""],
        [
            ("Tomate de ensalada 1kg", 1.0, 1.95),
            ("Tomate pera 1kg", 1.0, 1.75),
            ("Tomate en rama 1kg", 1.0, 2.15),
            ("Cebolla 1kg", 1.0, 1.25),
            ("Cebolleta manojo", 1.0, 1.15),
            ("Ajo malla 250g", 0.25, 1.45),
            ("Patata saco 3kg", 3.0, 2.85),
            ("Patata nueva 1kg", 1.0, 1.35),
            ("Zanahoria 1kg", 1.0, 0.95),
            ("Pimiento verde 500g", 0.5, 1.15),
            ("Pimiento rojo 500g", 0.5, 1.35),
            ("Calabacín 1kg", 1.0, 1.45),
            ("Berenjena 1kg", 1.0, 1.55),
            ("Pepino 1kg", 1.0, 1.25),
            ("Lechuga iceberg pieza", 1.0, 0.95),
            ("Lechuga romana pieza", 1.0, 0.85),
            ("Espinacas bolsa 300g", 0.3, 1.15),
            ("Rúcula 100g", 0.1, 0.95),
            ("Brócoli 500g", 0.5, 1.45),
            ("Coliflor pieza", 1.0, 1.95),
            ("Calabaza 1kg", 1.0, 1.35),
            ("Champiñón 250g", 0.25, 1.15),
        ],
    ),
    (
        "Desayuno",
        "g",
        ["Marcilla", "Bonka", "Saimaza", WHITE_LABEL],
        [
            ("Café molido natural 250g", 250.0, 2.95),
            ("Café molido mezcla 250g", 250.0, 2.65),
            ("Café en grano natural 500g", 500.0, 5.95),
            ("Café cápsulas intensidad 8, 10 uds", 10.0, 2.45),
            ("Café cápsulas descafeinado, 10 uds", 10.0, 2.45),
            ("Café soluble natural 200g", 200.0, 3.95),
            ("Café molido descafeinado 250g", 250.0, 3.15),
        ],
    ),
    (
        "Desayuno",
        "units",
        ["Hornimans", WHITE_LABEL],
        [
            ("Manzanilla 25 sobres", 25.0, 1.25),
            ("Tila 25 sobres", 25.0, 1.35),
            ("Té verde 25 sobres", 25.0, 1.45),
            ("Poleo menta 25 sobres", 25.0, 1.25),
            ("Rooibos 20 sobres", 20.0, 1.65),
        ],
    ),
    (
        "Desayuno",
        "g",
        ["La Tahona", "Kellogg's", WHITE_LABEL],
        [
            ("Cacao soluble 800g", 800.0, 3.45),
            ("Galletas María 800g", 800.0, 1.85),
            ("Galletas digestive 400g", 400.0, 1.65),
            ("Galletas con chocolate 300g", 300.0, 1.95),
            ("Cereales corn flakes 500g", 500.0, 2.15),
            ("Cereales de chocolate 500g", 500.0, 2.65),
            ("Muesli con frutas 500g", 500.0, 2.95),
            ("Copos de avena 500g", 500.0, 1.45),
            ("Mermelada de fresa 350g", 350.0, 1.55),
            ("Mermelada de melocotón 350g", 350.0, 1.55),
            ("Miel de flores 500g", 500.0, 3.45),
            ("Crema de cacao y avellanas 500g", 500.0, 3.25),
            ("Tortitas de arroz 130g", 130.0, 1.15),
            ("Crema de cacahuete 340g", 340.0, 2.55),
        ],
    ),
    (
        "Dulces",
        "g",
        ["Valor", "Nestlé", WHITE_LABEL],
        [
            ("Chocolate con leche 125g", 125.0, 1.25),
            ("Chocolate negro 72% 100g", 100.0, 1.45),
            ("Chocolate con almendras 150g", 150.0, 1.85),
            ("Chocolate blanco 100g", 100.0, 1.35),
            ("Caramelos surtidos 150g", 150.0, 1.15),
            ("Gominolas 150g", 150.0, 1.25),
            ("Chicles de menta sin azúcar", 1.0, 0.95),
            ("Turrón de chocolate crujiente 200g", 200.0, 2.45),
        ],
    ),
    (
        "Aperitivos",
        "g",
        ["Frit Ravich", "Doña Inés", WHITE_LABEL],
        [
            ("Patatas fritas clásicas 150g", 150.0, 1.35),
            ("Patatas fritas onduladas 150g", 150.0, 1.40),
            ("Nachos de maíz 200g", 200.0, 1.25),
            ("Cacahuete frito salado 250g", 250.0, 1.45),
            ("Almendra frita 200g", 200.0, 2.95),
            ("Pistacho tostado 250g", 250.0, 3.45),
            ("Mix de frutos secos 200g", 200.0, 2.45),
            ("Palomitas microondas 3x90g", 270.0, 1.15),
            ("Aceitunas snack 3x50g", 150.0, 1.25),
            ("Anacardo tostado 200g", 200.0, 3.25),
        ],
    ),
    (
        "Bebidas",
        "l",
        ["Fuente Sur", "Refresquera Bética", "Burbuja", WHITE_LABEL],
        [
            ("Agua mineral 6x1.5L", 9.0, 2.10),
            ("Agua mineral 1.5L", 1.5, 0.40),
            ("Agua con gas 1L", 1.0, 0.65),
            ("Refresco de cola 2L", 2.0, 1.45),
            ("Refresco de cola zero 2L", 2.0, 1.45),
            ("Refresco de naranja 2L", 2.0, 1.25),
            ("Refresco de limón 2L", 2.0, 1.25),
            ("Tónica 1L", 1.0, 0.95),
            ("Gaseosa 1.5L", 1.5, 0.55),
            ("Bebida isotónica 500ml", 0.5, 0.85),
            ("Té frío de limón 1.5L", 1.5, 1.15),
            ("Agua de coco 330ml", 0.33, 1.45),
        ],
    ),
    (
        "Bebidas",
        "l",
        ["Don Simón", "Zumosol", WHITE_LABEL],
        [
            ("Zumo de naranja 1L", 1.0, 1.35),
            ("Zumo de piña 1L", 1.0, 1.25),
            ("Zumo de melocotón 1L", 1.0, 1.25),
            ("Néctar multifrutas 1.5L", 1.5, 1.45),
            ("Zumo de tomate 1L", 1.0, 1.15),
            ("Zumo exprimido refrigerado 1L", 1.0, 2.45),
            ("Limonada 1L", 1.0, 1.35),
        ],
    ),
    (
        "Bebidas",
        "units",
        ["Cervezas del Sur", "Bodegas Itálica", WHITE_LABEL],
        [
            ("Cerveza pack 6 latas", 6.0, 3.45),
            ("Cerveza sin alcohol pack 6", 6.0, 3.25),
            ("Cerveza especial pack 4 botellines", 4.0, 2.95),
            ("Cerveza tostada pack 4", 4.0, 3.15),
            ("Tinto de verano 1.5L", 1.0, 1.65),
            ("Vino tinto crianza 750ml", 1.0, 3.95),
            ("Vino blanco verdejo 750ml", 1.0, 3.45),
            ("Vino rosado 750ml", 1.0, 2.95),
            ("Cava brut 750ml", 1.0, 4.45),
            ("Sangría 1L", 1.0, 2.15),
            ("Vermut rojo 1L", 1.0, 4.25),
            ("Sidra natural 750ml", 1.0, 2.65),
        ],
    ),
    (
        "Limpieza",
        "units",
        ["Netia", "Brillo Sur", "Limpisol", WHITE_LABEL],
        [
            ("Detergente líquido 40 lavados", 1.0, 6.95),
            ("Detergente en cápsulas 30 uds", 30.0, 7.45),
            ("Suavizante concentrado 60 lavados", 1.0, 2.45),
            ("Lejía 2L", 1.0, 0.95),
            ("Lejía con detergente 1.5L", 1.0, 1.35),
            ("Lavavajillas a mano 750ml", 1.0, 1.45),
            ("Lavavajillas máquina 30 cápsulas", 30.0, 5.45),
            ("Limpiador multiusos 1L", 1.0, 1.55),
            ("Limpiacristales 750ml", 1.0, 1.35),
            ("Desengrasante cocina 750ml", 1.0, 1.85),
            ("Limpiador de baño 750ml", 1.0, 1.65),
            ("Fregasuelos 1.5L", 1.0, 1.75),
            ("Amoniaco perfumado 1L", 1.0, 0.85),
            ("Abrillantador lavavajillas 250ml", 1.0, 1.95),
        ],
    ),
    (
        "Hogar",
        "units",
        ["Celulosas del Sur", WHITE_LABEL],
        [
            ("Papel higiénico 12 rollos", 12.0, 4.20),
            ("Papel de cocina 4 rollos", 4.0, 1.85),
            ("Servilletas blancas 100 uds", 100.0, 0.95),
            ("Pañuelos pack 10 paquetes", 10.0, 1.15),
            ("Papel de aluminio 30m", 1.0, 1.95),
            ("Film transparente 30m", 1.0, 1.45),
            ("Bolsas de basura 30L 15 uds", 15.0, 1.25),
            ("Bolsas de congelación 20 uds", 20.0, 1.05),
            ("Estropajo salvauñas pack 3", 3.0, 0.85),
            ("Bayetas multiusos pack 3", 3.0, 1.25),
            ("Guantes de látex talla M", 1.0, 1.15),
            ("Pinzas de la ropa 20 uds", 20.0, 1.35),
        ],
    ),
    (
        "Higiene",
        "ml",
        ["Belleza Andaluza", "DermoSur", "NaturSur", WHITE_LABEL],
        [
            ("Gel de baño hidratante 750ml", 750.0, 2.25),
            ("Champú anticaspa 300ml", 300.0, 2.45),
            ("Champú hidratante 300ml", 300.0, 1.95),
            ("Acondicionador nutritivo 300ml", 300.0, 2.15),
            ("Jabón de manos dosificador 500ml", 500.0, 1.25),
            ("Desodorante roll-on 50ml", 50.0, 1.85),
            ("Desodorante spray 200ml", 200.0, 2.15),
            ("Crema hidratante corporal 400ml", 400.0, 2.95),
            ("Crema de manos 100ml", 100.0, 1.45),
            ("Protector solar 50+ 200ml", 200.0, 6.95),
            ("Agua micelar 400ml", 400.0, 2.85),
            ("Toallitas desmaquillantes 25 uds", 25.0, 1.35),
        ],
    ),
    (
        "Higiene",
        "units",
        ["DentaSur", WHITE_LABEL],
        [
            ("Pasta de dientes blanqueante 100ml", 1.0, 1.55),
            ("Colutorio menta 500ml", 1.0, 2.25),
            ("Cepillo de dientes medio pack 2", 2.0, 1.85),
            ("Seda dental 50m", 1.0, 1.25),
            ("Maquinillas de afeitar 5+1", 6.0, 2.95),
            ("Espuma de afeitar 300ml", 1.0, 1.95),
            ("Compresas con alas 16 uds", 16.0, 1.65),
            ("Tampones regular 24 uds", 24.0, 2.45),
        ],
    ),
    (
        "Bebé",
        "units",
        ["Pequesur", WHITE_LABEL],
        [
            ("Pañales talla 4, 30 uds", 30.0, 6.45),
            ("Toallitas de bebé 80 uds", 80.0, 1.35),
            ("Potito de pollo con verduras 250g", 1.0, 1.15),
            ("Potito de frutas variadas 250g", 1.0, 1.15),
            ("Papilla de cereales 600g", 1.0, 3.45),
            ("Crema balsámica del pañal 100ml", 1.0, 2.95),
        ],
    ),
    (
        "Mascotas",
        "units",
        ["Compy del Sur", WHITE_LABEL],
        [
            ("Pienso para perro adulto 4kg", 1.0, 6.95),
            ("Comida húmeda perro 6x400g", 6.0, 3.95),
            ("Pienso para gato esterilizado 3kg", 1.0, 7.45),
            ("Comida húmeda gato 12 sobres", 12.0, 4.25),
            ("Arena aglomerante para gato 10L", 1.0, 4.45),
            ("Snacks dentales para perro 200g", 1.0, 2.15),
        ],
    ),
    (
        "Despensa",
        "g",
        ["Carmencita", WHITE_LABEL],
        [
            ("Pimentón dulce 75g", 75.0, 1.15),
            ("Pimentón picante 75g", 75.0, 1.15),
            ("Orégano 40g", 40.0, 0.95),
            ("Comino molido 40g", 40.0, 1.05),
            ("Pimienta negra molida 50g", 50.0, 1.35),
            ("Canela molida 40g", 40.0, 1.10),
            ("Ajo en polvo 55g", 55.0, 1.05),
            ("Perejil deshidratado 25g", 25.0, 0.85),
            ("Colorante alimentario 100g", 100.0, 0.95),
            ("Azafrán en hebras 0.5g", 0.5, 2.95),
            ("Curry en polvo 45g", 45.0, 1.15),
            ("Nuez moscada molida 40g", 40.0, 1.25),
        ],
    ),
    (
        "Internacional",
        "g",
        ["Casa Azteca", WHITE_LABEL],
        [
            ("Tortillas de trigo 8 uds", 8.0, 1.45),
            ("Salsa mexicana 300g", 300.0, 1.65),
            ("Guacamole 200g", 200.0, 1.95),
            ("Fideos orientales 3 uds", 3.0, 1.35),
            ("Salsa teriyaki 250ml", 250.0, 1.85),
            ("Leche de coco 400ml", 400.0, 1.55),
            ("Alga nori 10 hojas", 10.0, 2.25),
            ("Salsa curry suave 350g", 350.0, 1.95),
            ("Pan naan 2 uds", 2.0, 1.65),
            ("Burritos kit completo", 1.0, 3.45),
        ],
    ),
    (
        "Bio y sin gluten",
        "g",
        ["NaturalSur", WHITE_LABEL],
        [
            ("Pan de molde sin gluten 400g", 400.0, 2.95),
            ("Pasta sin gluten 500g", 500.0, 2.15),
            ("Galletas sin gluten 200g", 200.0, 2.45),
            ("Bebida de avena 1L", 1000.0, 1.45),
            ("Bebida de soja 1L", 1000.0, 1.35),
            ("Bebida de almendras 1L", 1000.0, 1.75),
            ("Tofu firme 250g", 250.0, 1.95),
            ("Hamburguesa vegetal pack 2", 2.0, 2.45),
            ("Semillas de chía 250g", 250.0, 1.85),
            ("Crema de arroz integral 500g", 500.0, 2.25),
        ],
    ),
    (
        "Repostería",
        "units",
        ["La Confitera", WHITE_LABEL],
        [
            ("Preparado para bizcocho 500g", 1.0, 1.85),
            ("Chocolate de cobertura 200g", 1.0, 1.95),
            ("Fideos de chocolate 100g", 1.0, 1.15),
            ("Azúcar glas 250g", 1.0, 0.95),
            ("Vainilla en esencia 100ml", 1.0, 1.45),
            ("Gelatina de fresa 170g", 1.0, 1.05),
            ("Obleas para tarta 6 uds", 6.0, 1.25),
            ("Moldes de papel 50 uds", 50.0, 0.95),
            ("Frutas confitadas 200g", 1.0, 1.65),
            ("Almendra molida 200g", 1.0, 2.45),
        ],
    ),
    (
        "Platos preparados",
        "g",
        ["La Cocina Andaluza", WHITE_LABEL],
        [
            ("Gazpacho fresco 1L", 1000.0, 1.95),
            ("Salmorejo fresco 1L", 1000.0, 2.25),
            ("Hummus de garbanzos 240g", 240.0, 1.65),
            ("Tortilla de patatas fresca 500g", 500.0, 2.45),
            ("Pizza fresca margarita 400g", 400.0, 2.65),
            ("Lasaña boloñesa fresca 600g", 600.0, 3.45),
            ("Ensaladilla rusa 450g", 450.0, 2.15),
            ("Croquetas frescas de puchero 300g", 300.0, 2.25),
            ("Canelones frescos 400g", 400.0, 3.15),
            ("Pollo asado entero", 1.0, 5.95),
            ("Paella refrigerada 350g", 350.0, 2.95),
            ("Ensalada de pasta 300g", 300.0, 2.05),
        ],
    ),
]

OFFER_THRESHOLD = 0.85  # ~15 % de los precios llevan oferta


# ------------------------------------------------------------------- helpers --
def _digest(key: str) -> int:
    """Entero determinista de 32 bits a partir de una clave."""
    return int(hashlib.md5(key.encode()).hexdigest()[:8], 16)


def stable_unit(key: str) -> float:
    """Valor determinista en [0, 1) a partir de una clave."""
    return _digest(key) / 0x100000000


def stable_factor(key: str, spread: float) -> float:
    """Multiplicador determinista en [1-spread, 1+spread]."""
    return 1.0 + (stable_unit(key) * 2 - 1) * spread


def brand_multiplier(brand: str) -> float:
    """Multiplicador de precio por marca: la marca blanca siempre es más barata."""
    if brand == WHITE_LABEL:
        return 0.78
    if not brand:
        return 1.0
    return stable_factor(f"brand|{brand}", 0.08)


def build_catalog() -> list[tuple[str, str, str, str, float, float]]:
    """Expande las familias en tuplas (nombre, categoría, marca, unidad, cantidad, base €)."""
    catalog = []
    for category, unit, brands, items in FAMILIES:
        for name, qty, base in items:
            for brand in brands:
                price = round(base * brand_multiplier(brand), 2)
                catalog.append((name, category, brand, unit, qty, max(price, 0.30)))
    return catalog


class Command(BaseCommand):
    """Población masiva e idempotente de tiendas ficticias por Sevilla."""

    help = "Crea 50 tiendas ficticias en Sevilla con >=1000 precios cada una."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--stores", type=int, default=50, help="Número de tiendas")
        parser.add_argument(
            "--min-prices", type=int, default=1000, help="Precios mínimos por tienda"
        )

    def handle(self, *args, **options) -> None:
        n_stores: int = min(options["stores"], len(LOCATIONS))
        min_prices: int = options["min_prices"]
        now = timezone.now()

        catalog = build_catalog()
        if len(catalog) < min_prices:
            raise CommandError(
                f"El catálogo generado ({len(catalog)}) no alcanza --min-prices={min_prices}."
            )
        self.stdout.write(
            f"== seed_sevilla: {n_stores} tiendas, catálogo de {len(catalog)} productos =="
        )

        stores = self._ensure_stores(n_stores)

        # Guard rápido: si ya está sembrado por completo, salir sin trabajo pesado.
        existing_total = Price.objects.filter(store__in=stores).count()
        if existing_total >= n_stores * min_prices:
            self.stdout.write(
                self.style.SUCCESS(
                    f"== seed_sevilla: ya sembrado ({existing_total} precios), nada que hacer =="
                )
            )
            return

        products = self._ensure_products(catalog)
        created = self._ensure_prices(stores, products, min_prices, now)

        total = Price.objects.filter(store__in=stores).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"== seed_sevilla COMPLETADO: {len(stores)} tiendas, "
                f"{created} precios nuevos, {total} precios totales =="
            )
        )

    # -------------------------------------------------------------- tiendas --
    def _ensure_stores(self, n_stores: int) -> list[Store]:
        """Crea las cadenas ficticias y una tienda por zona (round-robin de cadena)."""
        chains = []
        for slug, name in CHAINS:
            chain, _ = StoreChain.objects.get_or_create(
                slug=slug, defaults={"name": name, "logo_url": ""}
            )
            chains.append(chain)

        stores = []
        created = 0
        for i, (zone, lat, lng) in enumerate(LOCATIONS[:n_stores]):
            chain = chains[i % len(chains)]
            name = f"{chain.name} {zone}"
            # Jitter determinista de ~±300 m para no clavar tiendas en el mismo punto.
            jlat = lat + (stable_unit(f"lat|{name}") - 0.5) * 0.006
            jlng = lng + (stable_unit(f"lng|{name}") - 0.5) * 0.006
            store, was_created = Store.objects.get_or_create(
                name=name,
                defaults={
                    "chain": chain,
                    "address": f"{zone}, Sevilla",
                    "location": Point(jlng, jlat, srid=4326),
                    "opening_hours": {"mon-sat": "09:00-21:30"},
                    "is_local_business": False,
                    "is_active": True,
                },
            )
            created += int(was_created)
            stores.append(store)
        self.stdout.write(f"  tiendas: {len(stores)} ({created} nuevas)")
        return stores

    # ------------------------------------------------------------- catálogo --
    def _ensure_products(self, catalog) -> list[tuple[int, str, str, float, float]]:
        """Asegura los productos del catálogo y devuelve (id, nombre, marca, qty, base)."""
        root, _ = Category.objects.get_or_create(
            slug="alimentacion", defaults={"name": "Alimentación"}
        )
        cat_cache: dict[str, Category] = {}

        def get_category(name: str) -> Category:
            if name not in cat_cache:
                slug = name.lower().replace(" ", "-")
                cat = Category.objects.filter(slug=slug).first()
                if cat is None:
                    cat = Category.objects.create(name=name, slug=slug, parent=root)
                cat_cache[name] = cat
            return cat_cache[name]

        existing = {
            (norm, brand): pk
            for pk, norm, brand in Product.objects.values_list("pk", "normalized_name", "brand")
        }
        to_create = []
        for name, category, brand, unit, qty, _base in catalog:
            if (name.lower(), brand) not in existing:
                to_create.append(
                    Product(
                        name=name,
                        normalized_name=name.lower(),
                        category=get_category(category),
                        brand=brand,
                        unit=unit,
                        unit_quantity=qty,
                        is_active=True,
                    )
                )
        if to_create:
            Product.objects.bulk_create(to_create, batch_size=500)
            existing = {
                (norm, brand): pk
                for pk, norm, brand in Product.objects.values_list(
                    "pk", "normalized_name", "brand"
                )
            }
        self.stdout.write(f"  productos nuevos: {len(to_create)}")
        return [
            (existing[(name.lower(), brand)], name, brand, qty, base)
            for name, _category, brand, _unit, qty, base in catalog
        ]

    # --------------------------------------------------------------- precios --
    def _ensure_prices(self, stores, products, min_prices: int, now) -> int:
        """Crea los precios que falten por tienda para su subconjunto determinista."""
        spread = max(len(products) - min_prices, 0)
        today = date.today()
        created = 0
        for idx, store in enumerate(stores, start=1):
            k = min_prices + (_digest(f"size|{store.name}") % (spread + 1) if spread else 0)
            subset = sorted(products, key=lambda p: stable_unit(f"{store.name}|{p[1]}|{p[2]}"))[:k]
            existing_ids = set(
                Price.objects.filter(store=store).values_list("product_id", flat=True)
            )
            batch = []
            for product_id, name, brand, qty, base in subset:
                if product_id in existing_ids:
                    continue
                key = f"{store.name}|{name}|{brand}"
                value = max(round(base * stable_factor(key, 0.12), 2), 0.30)
                offer = None
                offer_end = None
                if stable_unit(f"offer|{key}") > OFFER_THRESHOLD:
                    discount = 0.82 + stable_unit(f"disc|{key}") * 0.10
                    offer = Decimal(f"{value * discount:.2f}")
                    offer_end = today + timedelta(days=5 + _digest(f"end|{key}") % 10)
                batch.append(
                    Price(
                        product_id=product_id,
                        store=store,
                        price=Decimal(f"{value:.2f}"),
                        unit_price=Decimal(f"{value / max(qty, 0.1):.2f}"),
                        offer_price=offer,
                        offer_end_date=offer_end,
                        source=Price.Source.SCRAPING,
                        verified_at=now,
                        is_stale=False,
                    )
                )
            if batch:
                Price.objects.bulk_create(batch, batch_size=1000)
                created += len(batch)
            if idx % 10 == 0 or idx == len(stores):
                self.stdout.write(f"  [{idx}/{len(stores)}] precios acumulados: {created}")
        return created
