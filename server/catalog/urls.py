from django.urls import path
from . import views

urlpatterns = [
    path('products/', views.products_list, name='products-list'),
    path('products/<int:product_id>/', views.product_detail, name='product-detail'),
    path('categories/', views.categories_list, name='categories-list'),
    path('brands/', views.brands_list, name='brands-list'),
]
