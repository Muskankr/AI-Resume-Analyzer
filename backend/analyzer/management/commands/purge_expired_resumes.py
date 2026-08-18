import os
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils.timezone import now
from analyzer.models import Resume


def remove_old_files_in_dir(dir_path, cutoff_ts, stdout):
    deleted = 0
    if not os.path.isdir(dir_path):
        return deleted

    for fname in os.listdir(dir_path):
        fpath = os.path.join(dir_path, fname)
        try:
            if os.path.isfile(fpath):
                mtime = os.path.getmtime(fpath)
                if mtime < cutoff_ts:
                    try:
                        os.remove(fpath)
                        deleted += 1
                        stdout.write(f"Deleted file: {fpath}")
                    except Exception as e:
                        stdout.write(f"Failed to delete {fpath}: {e}")
        except Exception as e:
            stdout.write(f"Error inspecting {fpath}: {e}")
    return deleted


class Command(BaseCommand):
    help = "Purge uploaded resume files (tmp and media/resumes) older than RESUME_RETENTION_DAYS setting."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show files that would be deleted without removing them.",
        )

    def handle(self, *args, **options):
        days = getattr(settings, "RESUME_RETENTION_DAYS", 30)
        dry_run = options.get("dry_run", False)

        try:
            days = int(days)
        except Exception:
            days = 30

        cutoff = now() - timedelta(days=days)
        cutoff_ts = cutoff.timestamp()

        total_deleted = 0
        self.stdout.write(f"Purging resume files older than {days} days (cutoff: {cutoff.isoformat()})")

        # 1) Clean tmp directory used by uploads
        tmp_dir = os.path.join(settings.BASE_DIR, "tmp")
        if dry_run:
            self.stdout.write(f"[DRY-RUN] Would scan tmp dir: {tmp_dir}")
        else:
            deleted_tmp = remove_old_files_in_dir(tmp_dir, cutoff_ts, self.stdout)
            total_deleted += deleted_tmp

        # 2) Clean media/resumes directory (files not tracked by model or direct uploads)
        media_resumes_dir = os.path.join(settings.MEDIA_ROOT, "resumes")
        if dry_run:
            self.stdout.write(f"[DRY-RUN] Would scan media resumes dir: {media_resumes_dir}")
        else:
            deleted_media = remove_old_files_in_dir(media_resumes_dir, cutoff_ts, self.stdout)
            total_deleted += deleted_media

        # 3) Delete Resume model instances and associated files older than cutoff
        try:
            expired_qs = Resume.objects.filter(uploaded_at__lt=cutoff)
            count_qs = expired_qs.count()
            self.stdout.write(f"Found {count_qs} Resume model instance(s) older than cutoff.")

            if not dry_run:
                for r in expired_qs:
                    try:
                        if r.file:
                            # delete the file from storage
                            r.file.delete(save=False)
                        r.delete()
                        total_deleted += 1
                        self.stdout.write(f"Deleted Resume model and file for id={r.id}")
                    except Exception as e:
                        self.stdout.write(f"Failed to delete Resume id={r.id}: {e}")
        except Exception as e:
            self.stdout.write(f"Failed to query Resume model: {e}")

        self.stdout.write(self.style.SUCCESS(f"Purge complete. Total deleted items: {total_deleted}"))
