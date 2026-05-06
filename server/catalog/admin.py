from django.contrib import admin

from .models import (
	Brand,
	Category,
	Product,
	ProductImage,
	ProductSpec,
	ProductVariant,
	ProductVariantOption,
	Review,
	VariantAttribute,
	VariantOption,
)


admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Product)
admin.site.register(ProductImage)
admin.site.register(ProductSpec)
admin.site.register(ProductVariant)
admin.site.register(ProductVariantOption)
admin.site.register(VariantAttribute)
admin.site.register(VariantOption)
admin.site.register(Review)

# Register your models here.
