from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0014_webhook'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='is_verified',
            field=models.BooleanField(default=False),
        ),
    ]
