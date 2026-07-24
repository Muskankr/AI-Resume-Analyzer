from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0003_resumeanalysis_job_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumeanalysis',
            name='resume_text',
            field=models.TextField(blank=True, null=True),
        ),
    ]
