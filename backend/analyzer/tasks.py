import logging
import os
import tempfile
import zipfile
from celery import shared_task
from django.contrib.auth import get_user_model

from .services import analyze_resume
from .webhook_utils import deliver, trigger_webhooks_for_user

User = get_user_model()

logger = logging.getLogger(__name__)


@shared_task
def analyze_resume_task(file_path, target_role, file_name, user_id=None, job_description=None, cover_letter_path=None, cover_letter_name=None, experience_level="Mid-Level"):

    # 1. Run the AI analysis and capture the result
    analysis_result = analyze_resume(
        file_path=file_path,
        target_role=target_role,
        file_name=file_name,
        user_id=user_id,
        job_description=job_description,
        cover_letter_path=cover_letter_path,
        cover_letter_name=cover_letter_name,
        experience_level=experience_level,
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


@shared_task
def analyze_single_resume_task(resume_task_id, target_role, experience_level, job_description):
    from .models import ResumeTask, BatchJob
    from asgiref.sync import async_to_sync
    import channels.layers
    import traceback

    try:
        resume_task = ResumeTask.objects.get(id=resume_task_id)
    except ResumeTask.DoesNotExist:
        return {"error": "ResumeTask not found"}

    resume_task.status = "Processing"
    resume_task.save(update_fields=["status"])

    batch_job = resume_task.batch_job

    try:
        analysis_result = analyze_resume(
            file_path=resume_task.file_name,
            target_role=target_role,
            file_name=os.path.basename(resume_task.file_name),
            user_id=batch_job.user_id,
            job_description=job_description,
            experience_level=experience_level,
        )

        from .models import ResumeAnalysis
        analysis = ResumeAnalysis.objects.get(id=analysis_result["id"])
        resume_task.analysis = analysis
        resume_task.status = "Completed"
        resume_task.save(update_fields=["analysis", "status"])
        
    except Exception as e:
        logger.exception(f"Failed to analyze {resume_task.file_name}")
        resume_task.status = "Failed"
        resume_task.error_trace = traceback.format_exc()
        resume_task.save(update_fields=["status", "error_trace"])

    # Update processed files
    from django.db.models import F
    BatchJob.objects.filter(id=batch_job.id).update(processed_files=F('processed_files') + 1)
    batch_job.refresh_from_db()

    # Broadcast progress
    channel_layer = channels.layers.get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"batch_{batch_job.id}",
            {
                "type": "batch_progress",
                "processed_files": batch_job.processed_files,
                "total_files": batch_job.total_files,
                "status": batch_job.status
            }
        )

    return resume_task.id


@shared_task
def batch_upload_complete(results, batch_id):
    from .models import BatchJob
    import channels.layers
    from asgiref.sync import async_to_sync

    try:
        batch = BatchJob.objects.get(id=batch_id)
        batch.status = "Completed"
        batch.save(update_fields=["status"])
        
        channel_layer = channels.layers.get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"batch_{batch_id}",
                {
                    "type": "batch_progress",
                    "processed_files": batch.processed_files,
                    "total_files": batch.total_files,
                    "status": batch.status
                }
            )
    except BatchJob.DoesNotExist:
        pass


@shared_task
def process_batch_upload(batch_id, zip_file_path, target_role="General", experience_level="Mid-Level", job_description=None):
    from .models import BatchJob, ResumeTask
    from celery import chord
    import shutil

    try:
        batch = BatchJob.objects.get(id=batch_id)
    except BatchJob.DoesNotExist:
        logger.error(f"BatchJob {batch_id} not found.")
        return

    batch.status = "Processing"
    batch.save(update_fields=["status"])

    try:
        # Create a permanent extraction directory (tempfile context manager is deleted when function ends)
        extract_dir = os.path.join(os.path.dirname(zip_file_path), str(batch_id))
        os.makedirs(extract_dir, exist_ok=True)

        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        pdf_files = []
        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    pdf_files.append(os.path.join(root, file))

        batch.total_files = len(pdf_files)
        batch.save(update_fields=["total_files"])

        if not pdf_files:
            batch.status = "Completed"
            batch.save(update_fields=["status"])
            return

        tasks_to_run = []
        for pdf_path in pdf_files:
            resume_task = ResumeTask.objects.create(
                batch_job=batch,
                file_name=pdf_path,
                status="Pending"
            )
            tasks_to_run.append(
                analyze_single_resume_task.s(
                    resume_task.id, target_role, experience_level, job_description
                )
            )

        chord(tasks_to_run)(batch_upload_complete.s(batch_id))

    except Exception as e:
        logger.exception(f"Batch processing failed for {batch_id}")
        batch.status = "Failed"
        batch.error_message = str(e)
        batch.save(update_fields=["status", "error_message"])
