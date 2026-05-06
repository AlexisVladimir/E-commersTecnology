# Generated migration to set initial stock for all products

from django.db import migrations


def set_initial_stock(apps, schema_editor):
    """Set initial stock of 5 units for all existing products"""
    Product = apps.get_model('catalog', 'Product')
    Product.objects.all().update(stock_quantity=5)


def reverse_stock(apps, schema_editor):
    """Reverse: set stock back to 0"""
    Product = apps.get_model('catalog', 'Product')
    Product.objects.all().update(stock_quantity=0)


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(set_initial_stock, reverse_stock),
    ]
