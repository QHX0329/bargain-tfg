"""Configuracion minima de Scrapy para el proyecto BargAIn."""

BOT_NAME = "bargain_scraping"

SPIDER_MODULES = ["bargain_scraping.spiders"]
NEWSPIDER_MODULE = "bargain_scraping.spiders"

ROBOTSTXT_OBEY = False
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
FEED_EXPORT_ENCODING = "utf-8"

ITEM_PIPELINES = {
    "bargain_scraping.pipelines.PriceUpsertPipeline": 300,
}
