"""
Items de Scrapy para el proyecto BargAIn.

Define los campos de datos extraidos por los spiders antes
de pasar por el pipeline de persistencia.
"""

import scrapy


class ProductPriceItem(scrapy.Item):
    """Item que representa un precio de producto extraido de un supermercado."""

    product_name = scrapy.Field()
    barcode = scrapy.Field()
    category_name = scrapy.Field()
    image_url = scrapy.Field()

    store_chain = scrapy.Field()

    price = scrapy.Field()
    unit_price = scrapy.Field()
    offer_price = scrapy.Field()
    offer_end_date = scrapy.Field()

    url = scrapy.Field()
