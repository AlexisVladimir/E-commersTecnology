from django.db import models
from users.models import User


class Category(models.Model):
	name = models.CharField(max_length=80)
	slug = models.CharField(max_length=100, unique=True)
	icon = models.CharField(max_length=50, null=True, blank=True)
	parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
	sort_order = models.IntegerField(default=0)

	class Meta:
		db_table = 'categories'


class Brand(models.Model):
	name = models.CharField(max_length=100, unique=True)
	slug = models.CharField(max_length=120, unique=True)
	logo_url = models.CharField(max_length=500, null=True, blank=True)

	class Meta:
		db_table = 'brands'


class Product(models.Model):
	BADGE_CHOICES = [('New', 'New'), ('Sale', 'Sale')]

	sku = models.CharField(max_length=64, unique=True)
	name = models.CharField(max_length=200)
	slug = models.CharField(max_length=220, unique=True)
	description = models.TextField()
	category = models.ForeignKey(Category, on_delete=models.PROTECT)
	brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.SET_NULL)
	price = models.DecimalField(max_digits=10, decimal_places=2)
	original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	badge = models.CharField(max_length=10, choices=BADGE_CHOICES, null=True, blank=True)
	main_image = models.CharField(max_length=500)
	rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
	review_count = models.PositiveIntegerField(default=0)
	in_stock = models.BooleanField(default=True)
	stock_quantity = models.IntegerField(default=0)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'products'


class ProductImage(models.Model):
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	url = models.CharField(max_length=500)
	alt_text = models.CharField(max_length=200, null=True, blank=True)
	sort_order = models.IntegerField(default=0)

	class Meta:
		db_table = 'product_images'


class ProductSpec(models.Model):
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	spec_key = models.CharField(max_length=80)
	spec_value = models.CharField(max_length=255)
	sort_order = models.IntegerField(default=0)

	class Meta:
		db_table = 'product_specs'
		unique_together = ('product', 'spec_key')


class VariantAttribute(models.Model):
	name = models.CharField(max_length=50, unique=True)

	class Meta:
		db_table = 'variant_attributes'


class VariantOption(models.Model):
	attribute = models.ForeignKey(VariantAttribute, on_delete=models.CASCADE)
	label = models.CharField(max_length=80)
	value = models.CharField(max_length=80)

	class Meta:
		db_table = 'variant_options'
		unique_together = ('attribute', 'label')


class ProductVariant(models.Model):
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	sku = models.CharField(max_length=64, unique=True)
	price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	stock_quantity = models.IntegerField(default=0)
	image_url = models.CharField(max_length=500, null=True, blank=True)
	is_active = models.BooleanField(default=True)

	class Meta:
		db_table = 'product_variants'


class ProductVariantOption(models.Model):
	variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
	option = models.ForeignKey(VariantOption, on_delete=models.PROTECT)

	class Meta:
		db_table = 'product_variant_options'
		unique_together = ('variant', 'option')


class Review(models.Model):
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	user = models.ForeignKey(User, on_delete=models.CASCADE)
	order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL)
	rating = models.PositiveSmallIntegerField()
	title = models.CharField(max_length=160, null=True, blank=True)
	body = models.TextField(null=True, blank=True)
	is_approved = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'reviews'
		unique_together = ('user', 'product', 'order')

# Create your models here.
