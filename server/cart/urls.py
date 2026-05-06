from django.urls import path
from . import views

urlpatterns = [
    path('', views.cart_detail, name='cart-detail'),
    path('items/', views.cart_items, name='cart-items'),
]
