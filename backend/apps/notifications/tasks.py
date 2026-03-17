"""Tareas Celery del módulo de notificaciones de BargAIn."""

import redis as redis_lib
import structlog
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)

logger = structlog.get_logger(__name__)

PUSH_RATE_LIMIT = 10
PUSH_RATE_TTL = 86400  # 24 horas en segundos


@shared_task(bind=True, max_retries=3)
def dispatch_push_notification(
    self,
    user_id: int,
    title: str,
    body: str,
    data: dict,
    action_url: str = "",
    notification_type: str = "price_alert",
) -> None:
    """Envía una notificación push al usuario y la almacena en el inbox.

    Aplica rate limiting de 10 notificaciones por usuario/día vía Redis.
    Elimina tokens inválidos (DeviceNotRegisteredError).
    Reintenta en errores de servidor (máx 3, espera 60s).
    Siempre crea un registro Notification en BD independientemente del resultado push.

    Args:
        user_id: ID del usuario destinatario.
        title: Título de la notificación.
        body: Cuerpo del mensaje.
        data: Diccionario de datos adicionales (deep links, IDs, etc.).
        action_url: Deep link, p.ej. 'bargain://lists/42'.
        notification_type: Valor de NotificationType.
    """
    from apps.notifications.models import Notification, UserPushToken

    # ── Rate limiting ──────────────────────────────────────────────────────────
    r = redis_lib.from_url(settings.CELERY_BROKER_URL)
    rate_key = f"push_rate:{user_id}:{timezone.now().date()}"
    count = r.incr(rate_key)
    if count == 1:
        r.expire(rate_key, PUSH_RATE_TTL)

    if count > PUSH_RATE_LIMIT:
        logger.warning(
            "push_rate_limit_exceeded",
            user_id=user_id,
            count=count,
            limit=PUSH_RATE_LIMIT,
        )
        # Still create the inbox record — just don't push
        _create_notification_record(
            user_id, notification_type, title, body, data, action_url
        )
        return

    # ── Push dispatch ──────────────────────────────────────────────────────────
    tokens = list(UserPushToken.objects.filter(user_id=user_id))
    client = PushClient()

    for push_token in tokens:
        try:
            client.publish(
                PushMessage(
                    to=push_token.token,
                    title=title,
                    body=body,
                    data=data,
                    sound="default",
                )
            )
        except DeviceNotRegisteredError:
            logger.info(
                "push_token_invalid_deleted",
                user_id=user_id,
                token_id=push_token.id,
            )
            push_token.delete()
        except (PushServerError, PushTicketError) as exc:
            logger.error(
                "push_server_error",
                user_id=user_id,
                error=str(exc),
            )
            raise self.retry(exc=exc, countdown=60)

    # ── DB inbox record ────────────────────────────────────────────────────────
    _create_notification_record(
        user_id, notification_type, title, body, data, action_url
    )


def _create_notification_record(
    user_id: int,
    notification_type: str,
    title: str,
    body: str,
    data: dict,
    action_url: str,
) -> None:
    """Crea un registro Notification en BD (inbox del usuario)."""
    from apps.notifications.models import Notification

    Notification.objects.create(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data,
        action_url=action_url,
    )


@shared_task(bind=True, ignore_result=True)
def notify_new_promo_at_store(self, promotion_id: int) -> None:
    """Notifica a los usuarios que han marcado una tienda como favorita cuando se crea una promo.

    Solo notifica a usuarios con push_notifications_enabled=True y
    notify_new_promos no explícitamente desactivado (None se trata como True).

    Args:
        promotion_id: ID de la Promotion creada.
    """
    from apps.business.models import Promotion

    try:
        promotion = Promotion.objects.select_related("store", "product").get(
            pk=promotion_id
        )
    except Promotion.DoesNotExist:
        logger.warning("notify_new_promo_promotion_not_found", promotion_id=promotion_id)
        return

    users = promotion.store.favorited_by.filter(
        push_notifications_enabled=True
    ).exclude(notify_new_promos=False)

    product_name = promotion.product.name if promotion.product else "producto"
    promo_body = (
        promotion.title
        if promotion.title
        else f"{promotion.discount_value}% de descuento en {product_name}"
    )

    for user in users:
        dispatch_push_notification.delay(
            user_id=user.id,
            title=f"Nueva promoción en {promotion.store.name}",
            body=promo_body,
            data={
                "promotion_id": promotion_id,
                "store_id": promotion.store_id,
            },
            action_url=f"bargain://stores/{promotion.store_id}/promotions",
            notification_type="new_promo",
        )

    logger.info(
        "notify_new_promo_dispatched",
        promotion_id=promotion_id,
        users_notified=users.count(),
    )


@shared_task(bind=True, ignore_result=True)
def send_shared_list_notification(self, list_id: int, actor_id: int) -> None:
    """Notifica a los colaboradores de una lista compartida tras una modificación.

    Se programa con countdown=900 (15 min) para agrupar ediciones múltiples
    en una sola notificación por colaborador.

    Args:
        list_id: ID de la ShoppingList modificada.
        actor_id: ID del usuario que realizó el cambio (excluido de notificaciones).
    """
    from apps.shopping_lists.models import ListCollaborator, ShoppingList

    try:
        shopping_list = ShoppingList.objects.prefetch_related(
            "listcollaborator_set__user"
        ).get(pk=list_id)
    except ShoppingList.DoesNotExist:
        logger.warning("send_shared_list_notif_list_not_found", list_id=list_id)
        return

    collaborators = shopping_list.listcollaborator_set.exclude(user_id=actor_id)
    action_url = f"bargain://lists/{list_id}"
    notified = 0

    for collab in collaborators:
        user = collab.user
        if user.push_notifications_enabled and user.notify_shared_list_changes is not False:
            dispatch_push_notification.delay(
                user_id=user.id,
                title="Lista de la compra actualizada",
                body=f"La lista '{shopping_list.name}' ha sido modificada.",
                data={"list_id": list_id},
                action_url=action_url,
                notification_type="shared_list_changed",
            )
            notified += 1

    logger.info(
        "send_shared_list_notification_dispatched",
        list_id=list_id,
        actor_id=actor_id,
        collaborators_notified=notified,
    )
