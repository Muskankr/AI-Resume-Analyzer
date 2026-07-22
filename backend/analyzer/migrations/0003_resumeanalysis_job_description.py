from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0002_resumeanalysis'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumeanalysis',
            name='job_description',
            field=models.TextField(blank=True, null=True),
        ),
    ]
