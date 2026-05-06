from django.db import models
from users.models import User


class PaymentMethod(models.Model):
	BRAND_CHOICES = [
		('visa', 'visa'),
		('mastercard', 'mastercard'),
		('amex', 'amex'),
		('discover', 'discover'),
		('other', 'other'),
	]

	user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
	brand = models.CharField(max_length=20, choices=BRAND_CHOICES)
	last4 = models.CharField(max_length=4)
	exp_month = models.PositiveSmallIntegerField()
	exp_year = models.PositiveSmallIntegerField()
	cardholder_name = models.CharField(max_length=160)
	gateway = models.CharField(max_length=40, default='paypal')
	gateway_token = models.CharField(max_length=255)
	is_default = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'payment_methods'


class Payment(models.Model):
	STATUS_CHOICES = [
		('pending', 'pending'),
		('authorized', 'authorized'),
		('captured', 'captured'),
		('failed', 'failed'),
		('refunded', 'refunded'),
	]

	order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
	payment_method = models.ForeignKey(PaymentMethod, null=True, blank=True, on_delete=models.SET_NULL)
	amount = models.DecimalField(max_digits=12, decimal_places=2)
	currency = models.CharField(max_length=3, default='USD')
	gateway = models.CharField(max_length=40, default='paypal')
	transaction_id = models.CharField(max_length=100, null=True, blank=True)
	status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')
	error_message = models.CharField(max_length=255, null=True, blank=True)
	paid_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'payments'

# Create your models here.
