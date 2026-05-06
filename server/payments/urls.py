from django.urls import path
from . import views

urlpatterns = [
	path('paypal/config/', views.paypal_config, name='paypal-config'),
    path('paypal/create-order/', views.paypal_create_order, name='paypal-create-order'),
    path('paypal/capture/', views.paypal_capture_order, name='paypal-capture-order'),
]
