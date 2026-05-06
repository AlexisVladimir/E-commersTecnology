from django.db import models
from catalog.models import Product, ProductVariant
from users.models import Address, User


class Coupon(models.Model):
	DISCOUNT_TYPE_CHOICES = [('percent', 'percent'), ('fixed', 'fixed')]

	code = models.CharField(max_length=40, unique=True)
	description = models.CharField(max_length=255, null=True, blank=True)
	discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
	discount_value = models.DecimalField(max_digits=10, decimal_places=2)
	min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	max_uses = models.PositiveIntegerField(null=True, blank=True)
	uses_count = models.PositiveIntegerField(default=0)
	valid_from = models.DateTimeField(null=True, blank=True)
	valid_until = models.DateTimeField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'coupons'


class Order(models.Model):
	STATUS_CHOICES = [
		('pending', 'pending'),
		('paid', 'paid'),
		('processing', 'processing'),
		('shipped', 'shipped'),
		('delivered', 'delivered'),
		('cancelled', 'cancelled'),
		('refunded', 'refunded'),
	]

	order_number = models.CharField(max_length=20, unique=True)
	user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
	status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')
	currency = models.CharField(max_length=3, default='USD')
	subtotal = models.DecimalField(max_digits=12, decimal_places=2)
	shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	total = models.DecimalField(max_digits=12, decimal_places=2)
	ship_recipient = models.CharField(max_length=160)
	ship_email = models.EmailField(max_length=190)
	ship_phone = models.CharField(max_length=30, null=True, blank=True)
	ship_line1 = models.CharField(max_length=255)
	ship_line2 = models.CharField(max_length=255, null=True, blank=True)
	ship_city = models.CharField(max_length=100)
	ship_state = models.CharField(max_length=100, null=True, blank=True)
	ship_zip = models.CharField(max_length=20)
	ship_country = models.CharField(max_length=80)
	shipping_address = models.ForeignKey(Address, null=True, blank=True, on_delete=models.SET_NULL)
	payment_method = models.ForeignKey('payments.PaymentMethod', null=True, blank=True, on_delete=models.SET_NULL)
	coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
	placed_at = models.DateTimeField(auto_now_add=True)
	paid_at = models.DateTimeField(null=True, blank=True)
	shipped_at = models.DateTimeField(null=True, blank=True)
	delivered_at = models.DateTimeField(null=True, blank=True)
	cancelled_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		db_table = 'orders'


class OrderItem(models.Model):
	order = models.ForeignKey(Order, on_delete=models.CASCADE)
	product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)
	variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
	product_name = models.CharField(max_length=200)
	variant_label = models.CharField(max_length=160, null=True, blank=True)
	product_sku = models.CharField(max_length=64)
	product_image = models.CharField(max_length=500, null=True, blank=True)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)
	quantity = models.PositiveIntegerField()
	line_total = models.DecimalField(max_digits=12, decimal_places=2)

	class Meta:
		db_table = 'order_items'


class OrderStatusHistory(models.Model):
	STATUS_CHOICES = Order.STATUS_CHOICES

	order = models.ForeignKey(Order, on_delete=models.CASCADE)
	status = models.CharField(max_length=12, choices=STATUS_CHOICES)
	note = models.CharField(max_length=255, null=True, blank=True)
	changed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'order_status_history'


class Shipment(models.Model):
	STATUS_CHOICES = [
		('pending', 'pending'),
		('in_transit', 'in_transit'),
		('delivered', 'delivered'),
		('returned', 'returned'),
	]

	order = models.ForeignKey(Order, on_delete=models.CASCADE)
	carrier = models.CharField(max_length=60, null=True, blank=True)
	tracking_number = models.CharField(max_length=100, null=True, blank=True)
	status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')
	shipped_at = models.DateTimeField(null=True, blank=True)
	delivered_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		db_table = 'shipments'

# Create your models here.
