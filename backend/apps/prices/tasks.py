"""Tareas Celery relacionadas con precios."""

import structlog
from celery import shared_task
from django.utils import timezone

logger = structlog.get_logger(__name__)


@shared_task(bind=True, ignore_result=True)
def expire_stale_prices(self) -> dict[str, int]:
    """Marca precios expirados de scraping (48h) y crowdsourcing (24h) como is_stale=True.

    Returns:
        Dict con número de precios marcados por fuente.
    """
    from datetime import timedelta

    from apps.prices.models import Price

    now = timezone.now()
    scraping_cutoff = now - timedelta(hours=48)
    crowdsourcing_cutoff = now - timedelta(hours=24)

    scraping_count = Price.objects.filter(
        source=Price.Source.SCRAPING,
        is_stale=False,
        verified_at__lt=scraping_cutoff,
    ).update(is_stale=True)

    crowdsourcing_count = Price.objects.filter(
        source=Price.Source.CROWDSOURCING,
        is_stale=False,
        verified_at__lt=crowdsourcing_cutoff,
    ).update(is_stale=True)

    logger.info(
        "expire_stale_prices_complete",
        scraping_marked_stale=scraping_count,
        crowdsourcing_marked_stale=crowdsourcing_count,
    )
    return {"scraping": scraping_count, "crowdsourcing": crowdsourcing_count}


@shared_task(bind=True, ignore_result=True)
def check_price_alerts(self) -> dict[str, int]:
    """Comprueba alertas de precio activas y dispara notificaciones si se cumplen.

    Para cada PriceAlert activa obtiene el precio mínimo actual del producto
    (en la tienda específica si se indicó, o en cualquier tienda), y si el
    precio actual es <= target_price, marca la alerta como disparada.

    Returns:
        Dict con número de alertas disparadas.
    """
    from apps.prices.models import Price, PriceAlert

    active_alerts = PriceAlert.objects.filter(is_active=True).select_related(
        "user", "product", "store"
    )
    triggered_count = 0
    now = timezone.now()

    for alert in active_alerts:
        qs = Price.objects.filter(
            product=alert.product,
            is_stale=False,
        )
        if alert.store is not None:
            qs = qs.filter(store=alert.store)

        # Obtener el precio mínimo actual
        from django.db.models import Min

        result = qs.aggregate(min_price=Min("price"))
        current_min_price = result.get("min_price")

        if current_min_price is not None and current_min_price <= alert.target_price:
            alert.triggered_at = now
            alert.is_active = False
            alert.save(update_fields=["triggered_at", "is_active"])
            triggered_count += 1
            logger.info(
                "price_alert_triggered",
                user_id=alert.user_id,
                product_id=alert.product_id,
                target_price=str(alert.target_price),
                current_min_price=str(current_min_price),
                alert_id=alert.id,
            )
            # Dispatch push notification if user has push enabled and pref not off
            if alert.user.push_notifications_enabled and alert.user.notify_price_alerts is not False:
                from apps.notifications.tasks import dispatch_push_notification

                dispatch_push_notification.delay(
                    user_id=alert.user_id,
                    title="Alerta de precio activada",
                    body=f"{alert.product.name} ya está a {current_min_price}€",
                    data={"product_id": alert.product_id, "alert_id": alert.id},
                    action_url=f"bargain://products/{alert.product_id}/prices",
                    notification_type="price_alert",
                )

    logger.info("check_price_alerts_complete", triggered=triggered_count)
    return {"triggered": triggered_count}


@shared_task(bind=True, ignore_result=True)
def purge_old_price_history(self) -> dict[str, int]:
    """Elimina registros de precios con más de 90 días de antigüedad.

    Returns:
        Dict con número de registros eliminados.
    """
    from datetime import timedelta

    from apps.prices.models import Price

    cutoff = timezone.now() - timedelta(days=90)
    deleted_count, _ = Price.objects.filter(created_at__lt=cutoff).delete()

    logger.info("purge_old_price_history_complete", deleted=deleted_count)
    return {"deleted": deleted_count}
