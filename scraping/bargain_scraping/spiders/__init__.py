"""Paquete de spiders de BarGAIN.

Capa de compatibilidad de Scrapy
================================
A partir de Scrapy 2.13 el punto de entrada de un spider dejó de ser el método
síncrono ``start_requests()`` y pasó a ser la corrutina asíncrona ``start()``.
En Scrapy 2.16 ``start_requests`` se eliminó por completo de la clase base, de
modo que los spiders que solo definen ``start_requests()`` ya no emiten ninguna
petición (terminan con 0 páginas y 0 items).

Todos los spiders de este proyecto se escribieron con la API clásica
``start_requests()``. En lugar de reescribir cada uno, restauramos el
comportamiento clásico de forma centralizada: si un spider define
``start_requests()``, ``start()`` lo consume; si no, se delega en la
implementación por defecto de Scrapy (que sigue soportando ``start_urls``).

El parche se aplica una sola vez, al importar el paquete de spiders (que es lo
que hace Scrapy mediante ``SPIDER_MODULES``), y respeta cualquier spider que
defina su propio ``start()`` asíncrono (la definición de la subclase prevalece).
"""

import scrapy

if not getattr(scrapy.Spider, "_bargain_start_compat", False):
    _default_start = scrapy.Spider.start

    async def _bargain_start(self):
        """Restaura ``start_requests()`` como punto de entrada (Scrapy >=2.13)."""
        start_requests = getattr(self, "start_requests", None)
        if callable(start_requests):
            for item_or_request in start_requests():
                yield item_or_request
        else:
            async for item_or_request in _default_start(self):
                yield item_or_request

    scrapy.Spider.start = _bargain_start
    scrapy.Spider._bargain_start_compat = True
