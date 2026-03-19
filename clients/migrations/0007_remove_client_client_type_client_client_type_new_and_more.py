# Restored stub migration - this migration was already applied on the server DB
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0006_client_active_status_and_more'),
        ('services', '0004_servicecatalog_client_taxes_and_more'),
    ]

    operations = []
