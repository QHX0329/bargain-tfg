"""
Tareas Celery para el portal business de BarGAIN.

Tareas:
- send_business_approval_email: notificación de aprobación al negocio
- send_business_rejection_email: notificación de rechazo al negocio
- deactivate_expired_promotions: desactiva promociones cuya end_date ha pasado
- check_competitor_prices: alerta al negocio si un competidor tiene precio más bajo
"""

import structlog
from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone

logger = structlog.get_logger(__name__)


@shared_task(bind=True, ignore_result=True)
def send_business_approval_email(self, profile_id: int) -> None:
    """Envía email de aprobación al negocio verificado."""
    from apps.business.models import BusinessProfile

    try:
        profile = BusinessProfile.objects.select_related("user").get(pk=profile_id)
    except BusinessProfile.DoesNotExist:
        logger.warning("send_approval_email_profile_not_found", profile_id=profile_id)
        return

    send_mail(
        subject="Tu negocio ha sido verificado en BarGAIN",
        message=(
            f"Hola {profile.user.get_full_name() or profile.user.username},\n\n"
            f"Nos complace informarte que tu negocio «{profile.business_name}» "
            "ha sido verificado en BarGAIN.\n\n"
            "Ya puedes actualizar tus precios y crear promociones desde el portal.\n\n"
            "El equipo de BarGAIN"
        ),
        from_email="noreply@bargain.app",
        recipient_list=[profile.user.email],
        fail_silently=True,
    )
    logger.info("business_approval_email_sent", profile_id=profile_id)


@shared_task(bind=True, ignore_result=True)
def send_business_rejection_email(self, profile_id: int, reason: str) -> None:
    """Envía email de rechazo al negocio con el motivo."""
    from apps.business.models import BusinessProfile

    try:
        profile = BusinessProfile.objects.select_related("user").get(pk=profile_id)
    except BusinessProfile.DoesNotExist:
        logger.warning("send_rejection_email_profile_not_found", profile_id=profile_id)
        return

    send_mail(
        subject="Solicitud de verificación de negocio en BarGAIN",
        message=(
            f"Hola {profile.user.get_full_name() or profile.user.username},\n\n"
            f"Hemos revisado la solicitud de verificación de «{profile.business_name}» "
            "y, lamentablemente, no ha podido ser aprobada en este momento.\n\n"
            f"Motivo: {reason}\n\n"
            "Si tienes dudas, ponte en contacto con soporte@bargain.app.\n\n"
            "El equipo de BarGAIN"
        ),
        from_email="noreply@bargain.app",
        recipient_list=[profile.user.email],
        fail_silently=True,
    )
    logger.info("business_rejection_email_sent", profile_id=profile_id)


@shared_task(bind=True, ignore_result=True)
def deactivate_expired_promotions(self) -> None:
    """
    Desactiva promociones cuya end_date es anterior a hoy.

    Programada cada hora en CELERY_BEAT_SCHEDULE.
    """
    from apps.business.models import Promotion

    today = timezone.now().date()
    updated = Promotion.objects.filter(is_active=True, end_date__lt=today).update(is_active=False)
    logger.info("expired_promotions_deactivated", count=updated)


@shared_task(bind=True, ignore_result=True)
def check_competitor_prices(self) -> None:
    """
    Compara precios de negocios verificados con precios scrapeados.

    Si la diferencia supera el umbral del perfil y no se ha enviado alerta
    en las últimas 24h, envía un email al negocio.
    """
    from datetime import timedelta

    from apps.business.models import BusinessProfile
    from apps.prices.models import Price

    profiles = BusinessProfile.objects.filter(is_verified=True).select_related("user")

    for profile in profiles:
        # Evitar alertas repetidas en 24h
        if profile.last_competitor_alert_at:
            since = timezone.now() - profile.last_competitor_alert_at
            if since < timedelta(hours=24):
                continue

        # Precios del negocio
        business_prices = Price.objects.filter(
            store__business_profile=profile,
            source=Price.Source.BUSINESS,
            is_stale=False,
        ).select_related("product", "store")

        alert_triggered = False
        for bp in business_prices:
            # Precio más reciente scrapeado para el mismo producto y tienda
            scraped = (
                Price.objects.filter(
                    product=bp.product,
                    store=bp.store,
                    source__in=[Price.Source.SCRAPING, Price.Source.API],
                    is_stale=False,
                )
                .order_by("-verified_at")
                .first()
            )
            if scraped is None:
                continue

            if bp.price == 0:
                continue

            diff_pct = abs(float(scraped.price) - float(bp.price)) / float(bp.price) * 100
            if diff_pct > profile.price_alert_threshold_pct:
                send_mail(
                    subject="Alerta de precio competidor en BarGAIN",
                    message=(
                        f"Hola {profile.user.get_full_name() or profile.user.username},\n\n"
                        f"Se ha detectado una diferencia de precio mayor al "
                        f"{profile.price_alert_threshold_pct}% para «{bp.product.name}» "
                        f"en «{bp.store.name}».\n\n"
                        f"Tu precio: {bp.price}€ | Precio de referencia: {scraped.price}€\n\n"
                        "Revisa tu catálogo en BarGAIN.\n\nEl equipo de BarGAIN"
                    ),
                    from_email="noreply@bargain.app",
                    recipient_list=[profile.user.email],
                    fail_silently=True,
                )
                alert_triggered = True
                logger.info(
                    "competitor_price_alert_sent",
                    profile_id=profile.id,
                    product_id=bp.product.id,
                    diff_pct=round(diff_pct, 2),
                )
                break  # Una alerta por perfil por ciclo

        if alert_triggered:
            BusinessProfile.objects.filter(pk=profile.pk).update(
                last_competitor_alert_at=timezone.now()
            )
