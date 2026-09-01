# Generated for Issue #992: Pro tier with premium features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0025_signupabuseevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='tier',
            field=models.CharField(
                choices=[('free', 'Free'), ('pro', 'Pro')],
                default='free',
                help_text="Subscription tier: 'free' or 'pro'.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tier_updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
