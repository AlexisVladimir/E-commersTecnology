from django.db import models
from catalog.models import Product, ProductVariant
from users.models import User


class Cart(models.Model):
	STATUS_CHOICES = [
		('active', 'active'),
		('converted', 'converted'),
		('abandoned', 'abandoned'),
	]

	user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
	session_id = models.CharField(max_length=36, null=True, blank=True)
	status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'carts'


class CartItem(models.Model):
	cart = models.ForeignKey(Cart, on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.PROTECT)
	variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
	variant_label = models.CharField(max_length=160, default='')
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)
	added_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'cart_items'
		unique_together = ('cart', 'product', 'variant_label')


class Wishlist(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	added_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'wishlists'
		unique_together = ('user', 'product')

# Create your models here.
