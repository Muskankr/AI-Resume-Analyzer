from django.db import migrations, models
import uuid

class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0004_resumeanalysis_resume_text'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumeanalysis',
            name='share_id',
            field=models.UUIDField(default=uuid.uuid4, unique=True),
        ),
    ]
