import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductSpec,
    ProductVariant,
    ProductVariantOption,
    VariantAttribute,
    VariantOption,
)


class Command(BaseCommand):
    help = 'Seed catalog data from src/data/products.ts'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing catalog data')

    def handle(self, *args, **options):
        project_root = Path(__file__).resolve().parents[4]
        products_path = project_root / 'src' / 'data' / 'products.ts'

        if not products_path.exists():
            self.stderr.write(f'products.ts not found at {products_path}')
            return

        data = self._load_ts_data(products_path)
        categories = data.get('categories', [])
        brands = data.get('brands', [])
        products = data.get('products', [])

        if options['clear']:
            ProductVariantOption.objects.all().delete()
            ProductVariant.objects.all().delete()
            VariantOption.objects.all().delete()
            VariantAttribute.objects.all().delete()
            ProductSpec.objects.all().delete()
            ProductImage.objects.all().delete()
            Product.objects.all().delete()
            Brand.objects.all().delete()
            Category.objects.all().delete()

        for idx, category in enumerate(categories, start=1):
            Category.objects.update_or_create(
                name=category['name'],
                defaults={
                    'slug': slugify(category['name']),
                    'icon': category.get('icon'),
                    'sort_order': idx,
                },
            )

        for brand in brands:
            Brand.objects.update_or_create(
                name=brand,
                defaults={'slug': slugify(brand)},
            )

        color_attr, _ = VariantAttribute.objects.get_or_create(name='Color')
        storage_attr, _ = VariantAttribute.objects.get_or_create(name='Storage')

        for product in products:
            category = Category.objects.filter(name=product['category']).first()
            if not category:
                category = Category.objects.create(
                    name=product['category'],
                    slug=slugify(product['category']),
                    sort_order=0,
                )

            product_id = int(product['id'])
            record, _ = Product.objects.update_or_create(
                id=product_id,
                defaults={
                    'sku': f'SKU-{product_id}',
                    'name': product['name'],
                    'slug': slugify(product['name']),
                    'description': product['description'],
                    'category': category,
                    'brand': None,
                    'price': product['price'],
                    'original_price': product.get('originalPrice'),
                    'badge': product.get('badge'),
                    'main_image': product['image'],
                    'rating_avg': product['rating'],
                    'review_count': product['reviewCount'],
                    'in_stock': product['inStock'],
                    'stock_quantity': 100 if product['inStock'] else 0,
                    'is_active': True,
                },
            )

            ProductImage.objects.update_or_create(
                product=record,
                url=record.main_image,
                defaults={'alt_text': record.name, 'sort_order': 0},
            )

            ProductSpec.objects.filter(product=record).delete()
            for i, (key, value) in enumerate(product['specs'].items()):
                ProductSpec.objects.create(
                    product=record,
                    spec_key=key,
                    spec_value=value,
                    sort_order=i,
                )

            ProductVariantOption.objects.filter(variant__product=record).delete()
            ProductVariant.objects.filter(product=record).delete()

            variants = product.get('variants') or {}
            colors = variants.get('colors') or []
            sizes = variants.get('sizes') or []

            for idx, color in enumerate(colors, start=1):
                option, _ = VariantOption.objects.get_or_create(
                    attribute=color_attr,
                    label=color['name'],
                    defaults={'value': color['value']},
                )
                variant = ProductVariant.objects.create(
                    product=record,
                    sku=f'SKU-{product_id}-COLOR-{idx}',
                    stock_quantity=record.stock_quantity,
                    is_active=True,
                )
                ProductVariantOption.objects.create(variant=variant, option=option)

            for idx, size in enumerate(sizes, start=1):
                option, _ = VariantOption.objects.get_or_create(
                    attribute=storage_attr,
                    label=size['name'],
                    defaults={'value': size['value']},
                )
                variant = ProductVariant.objects.create(
                    product=record,
                    sku=f'SKU-{product_id}-STORAGE-{idx}',
                    stock_quantity=record.stock_quantity,
                    is_active=True,
                )
                ProductVariantOption.objects.create(variant=variant, option=option)

        self.stdout.write(self.style.SUCCESS('Catalog seeded successfully.'))

    def _load_ts_data(self, path):
        text = path.read_text(encoding='utf-8')
        return {
            'products': self._extract_array(text, 'products'),
            'categories': self._extract_array(text, 'categories'),
            'brands': self._extract_array(text, 'brands'),
        }

    def _extract_array(self, text, name):
        marker = f'export const {name}'
        start = text.find(marker)
        if start == -1:
            raise ValueError(f'{name} export not found')

        bracket_start = text.find('[', start)
        if bracket_start == -1:
            raise ValueError(f'{name} array not found')

        depth = 0
        end = None
        for i in range(bracket_start, len(text)):
            if text[i] == '[':
                depth += 1
            elif text[i] == ']':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end is None:
            raise ValueError(f'{name} array not closed')

        js_array = text[bracket_start:end]
        json_like = self._to_json(js_array)
        return json.loads(json_like)

    def _to_json(self, js):
        js = js.replace("'", '"')
        js = re.sub(r'([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', js)
        js = re.sub(r',\s*([}\]])', r'\1', js)
        return js
