from django.contrib import admin

from .models import Payment, PaymentMethod


admin.site.register(PaymentMethod)
admin.site.register(Payment)

# Register your models here.
