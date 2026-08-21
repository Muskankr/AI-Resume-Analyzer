"""Share controls on ResumeAnalysis, plus the 0016 merge they need to sit on.

Two leaf nodes exist at 0016 — ``0016_merge_20260819_1833`` and
``0016_resumeanalysis_partial_skills`` were generated independently against
``0015``. ``manage.py test`` refuses to build a database in that state
("Conflicting migrations detected; multiple leaf nodes"), so anything added
after it has to resolve the fork. Depending on both here does that and adds the
new columns in one node, rather than shipping an empty merge migration and then
immediately adding a second one on top of it.

The data step matters as much as the schema. ``share_enabled`` defaults to
``False``, which is the whole point of the change — but applying that default to
rows that already exist would break every link a user has already sent. Those
rows are backfilled as enabled, dated from the analysis, with the standard
lifetime measured from *now* rather than from creation, so an old share gets a
full window to be noticed and re-shared rather than expiring the moment this
deploys.
"""

from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


def enable_sharing_on_existing_rows(apps, schema_editor):
    """Preserve links that already work.

    Every pre-existing analysis was publicly readable by id, so switching the
    default to off is a behaviour change for links already in circulation. They
    are marked enabled with a normal expiry: the new rules apply to them, the
    link keeps working today, and it stops working on the same schedule as
    everything else instead of living forever.
    """
    ResumeAnalysis = apps.get_model("analyzer", "ResumeAnalysis")
    now = timezone.now()

    ResumeAnalysis.objects.update(
        share_enabled=True,
        share_created_at=models.F("created_at"),
        share_expires_at=now + timedelta(days=30),
    )


def disable_sharing_on_existing_rows(apps, schema_editor):
    """Reverse step.

    Nothing to undo in the data — the columns themselves are dropped by the
    schema reversal below. Present so the migration is reversible rather than
    irreversible for no reason.
    """
    return None


class Migration(migrations.Migration):

    dependencies = [
        ("analyzer", "0016_merge_20260819_1833"),
        ("analyzer", "0016_resumeanalysis_partial_skills"),
    ]

    operations = [
        migrations.AddField(
            model_name="resumeanalysis",
            name="share_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="share_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="share_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="share_view_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(
            enable_sharing_on_existing_rows,
            disable_sharing_on_existing_rows,
        ),
    ]
