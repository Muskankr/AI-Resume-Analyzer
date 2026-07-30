from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0007_resumeanalysis_cover_letter'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumeanalysis',
            name='interview_questions',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
