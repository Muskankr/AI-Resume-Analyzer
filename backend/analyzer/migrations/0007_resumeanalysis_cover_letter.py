from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0005_resumeanalysis_share_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumeanalysis',
            name='cover_letter_text',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='resumeanalysis',
            name='cover_letter_feedback',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
