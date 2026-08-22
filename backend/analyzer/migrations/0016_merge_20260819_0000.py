# Generated manually to join the two independently merged 0015 migrations.
#
# Both branches are already represented in the database schema; this migration
# contains no operations and simply gives Django one unambiguous head.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("analyzer", "0015_knowndevice"),
        ("analyzer", "0015_resumeanalysis_experience_level"),
    ]

    operations = []
