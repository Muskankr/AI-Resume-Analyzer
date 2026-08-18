import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from .services import analyze_resume
from .webhook_utils import deliver, trigger_webhooks_for_user

User = get_user_model()

logger = logging.getLogger(__name__)


@shared_task
def analyze_resume_task(file_path, target_role, file_name, user_id=None, job_description=None, cover_letter_path=None, cover_letter_name=None):

    # 1. Run the AI analysis and capture the result
    analysis_result = analyze_resume(
        file_path=file_path,
        target_role=target_role,
        file_name=file_name,
        user_id=user_id,
        job_description=job_description,
        cover_letter_path=cover_letter_path,
        cover_letter_name=cover_letter_name
    )

    # 2. If this was triggered by a logged-in user, queue their webhooks. Each
    #    delivery is now its own task, so a receiver that is slow or down
    #    cannot hold up the analysis result getting back to the user.
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            trigger_webhooks_for_user(user, analysis_result)
        except User.DoesNotExist:
            logger.info("Skipping webhooks: user %s no longer exists", user_id)
        except Exception:
            # A notification must never lose an analysis that already
            # succeeded, so this is logged rather than raised.
            logger.exception("Failed to queue webhooks for user %s", user_id)

    # 3. Return the result so the Celery task completes successfully
    return analysis_result


@shared_task(bind=True, max_retries=3, default_retry_delay=30, retry_backoff=True)
def deliver_webhook_task(self, webhook_id, event, data):
    """Deliver one event to one webhook, retrying if it does not land.

    Retrying here rather than inside ``requests`` — which is what the old
    ``Retry`` adapter did — spreads the attempts over minutes instead of
    seconds, and does not hold a worker open in between.
    """
    from .models import Webhook

    try:
        webhook = Webhook.objects.get(pk=webhook_id)
    except Webhook.DoesNotExist:
        # Deleted between queueing and delivery. Nothing to send, and nothing
        # worth retrying.
        return False

    if not webhook.is_active:
        return False

    delivered = deliver(webhook, event, data)

    if not delivered and self.request.retries < self.max_retries:
        # Re-read from the row `deliver` just wrote: if that attempt tripped
        # the consecutive-failure limit the hook is now off, and retrying it
        # would only drive the count further past a threshold that has already
        # been acted on.
        webhook.refresh_from_db(fields=["is_active"])
        if webhook.is_active:
            raise self.retry()

    return delivered
