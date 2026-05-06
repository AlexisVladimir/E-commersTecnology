import json
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from catalog.models import Product
from catalog.views import _serialize_product
from .models import Cart, CartItem


def cart_detail(request):
	cart = _get_or_create_cart(request)
	items = [_serialize_cart_item(item) for item in cart.cartitem_set.select_related('product')]
	return JsonResponse({'items': items, 'totals': _calculate_totals(cart)})


@csrf_exempt
def cart_items(request):
	cart = _get_or_create_cart(request)

	if request.method == 'POST':
		payload = _load_json(request)
		product_id = payload.get('productId')
		if not product_id:
			return JsonResponse({'error': 'productId is required'}, status=400)

		quantity = int(payload.get('quantity', 1))
		variant_label = payload.get('variant') or ''
		product = Product.objects.filter(id=product_id).first()
		if not product:
			return JsonResponse({'error': 'product not found'}, status=404)

		# Validar stock disponible
		if product.stock_quantity <= 0:
			return JsonResponse({'error': 'product out of stock'}, status=400)
		if quantity > product.stock_quantity:
			return JsonResponse({'error': f'insufficient stock. available: {product.stock_quantity}'}, status=400)

		item, created = CartItem.objects.get_or_create(
			cart=cart,
			product=product,
			variant_label=variant_label,
			defaults={'quantity': quantity, 'unit_price': product.price},
		)
		if not created:
			# Validar que la cantidad total no exceda el stock
			new_quantity = item.quantity + quantity
			if new_quantity > product.stock_quantity:
				return JsonResponse({'error': f'insufficient stock. available: {product.stock_quantity}'}, status=400)
			item.quantity = new_quantity
			item.save(update_fields=['quantity'])

		return JsonResponse({'item': _serialize_cart_item(item), 'totals': _calculate_totals(cart)})

	if request.method == 'PATCH':
		payload = _load_json(request)
		product_id = payload.get('productId')
		variant_label = payload.get('variant') or ''
		quantity = int(payload.get('quantity', 1))

		item = CartItem.objects.filter(
			cart=cart, product_id=product_id, variant_label=variant_label
		).first()
		if not item:
			return JsonResponse({'error': 'item not found'}, status=404)

		if quantity <= 0:
			item.delete()
			return JsonResponse({'items': _serialize_cart_items(cart), 'totals': _calculate_totals(cart)})

		# Validar stock disponible
		if quantity > item.product.stock_quantity:
			return JsonResponse({'error': f'insufficient stock. available: {item.product.stock_quantity}'}, status=400)

		item.quantity = quantity
		item.save(update_fields=['quantity'])
		return JsonResponse({'item': _serialize_cart_item(item), 'totals': _calculate_totals(cart)})

	if request.method == 'DELETE':
		payload = _load_json(request)
		product_id = payload.get('productId')
		variant_label = payload.get('variant') or ''
		CartItem.objects.filter(
			cart=cart, product_id=product_id, variant_label=variant_label
		).delete()
		return JsonResponse({'items': _serialize_cart_items(cart), 'totals': _calculate_totals(cart)})

	return JsonResponse({'items': _serialize_cart_items(cart), 'totals': _calculate_totals(cart)})


def _get_or_create_cart(request):
	if request.user.is_authenticated:
		cart, _ = Cart.objects.get_or_create(user=request.user, status='active')
		return cart

	if not request.session.session_key:
		request.session.create()

	cart, _ = Cart.objects.get_or_create(
		session_id=request.session.session_key,
		status='active',
	)
	return cart


def _calculate_totals(cart):
	items = cart.cartitem_set.all()
	subtotal = sum((item.unit_price * item.quantity for item in items), Decimal('0'))
	shipping = Decimal('0') if subtotal > Decimal('500') else Decimal('15')
	tax = subtotal * Decimal('0.08')
	total = subtotal + shipping + tax
	return {
		'subtotal': float(subtotal),
		'shipping': float(shipping),
		'tax': float(tax.quantize(Decimal('0.01'))),
		'total': float(total.quantize(Decimal('0.01'))),
	}


def _serialize_cart_item(item):
	product_payload = _serialize_product(item.product)
	return {
		'product': product_payload,
		'quantity': item.quantity,
		'variant': item.variant_label or None,
	}


def _serialize_cart_items(cart):
	return [_serialize_cart_item(item) for item in cart.cartitem_set.select_related('product')]


def _load_json(request):
	try:
		return json.loads(request.body.decode('utf-8') or '{}')
	except json.JSONDecodeError:
		return {}

# Create your views here.
