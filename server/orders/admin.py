from django.contrib import admin

from .models import Coupon, Order, OrderItem, OrderStatusHistory, Shipment


admin.site.register(Coupon)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(OrderStatusHistory)
admin.site.register(Shipment)

# Register your models here.
