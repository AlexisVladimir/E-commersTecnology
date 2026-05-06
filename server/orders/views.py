import json
from decimal import Decimal
from uuid import uuid4

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from cart.views import _get_or_create_cart, _calculate_totals
from users.models import Address

from .models import Order, OrderItem, OrderStatusHistory


def orders_list(request):
	order_number = request.GET.get('orderNumber')
	if order_number:
		order = Order.objects.filter(order_number=order_number).first()
		if not order:
			return JsonResponse({'items': []})
		return JsonResponse({'items': [_serialize_order(order)]})

	if request.user.is_authenticated:
		orders = Order.objects.filter(user=request.user).order_by('-placed_at')
		return JsonResponse({'items': [_serialize_order(order) for order in orders]})

	return JsonResponse({'items': []})


@csrf_exempt
def order_create(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	payload = _load_json(request)
	shipping = payload.get('shipping') or {}
	if not shipping:
		return JsonResponse({'error': 'Shipping data is required'}, status=400)

	cart = _get_or_create_cart(request)
	items = list(cart.cartitem_set.select_related('product'))
	if not items:
		return JsonResponse({'error': 'Cart is empty'}, status=400)

	# Validar stock disponible para todos los items
	for item in items:
		if item.product.stock_quantity <= 0:
			return JsonResponse({'error': f'{item.product.name} is out of stock'}, status=400)
		if item.quantity > item.product.stock_quantity:
			return JsonResponse({'error': f'Insufficient stock for {item.product.name}. Available: {item.product.stock_quantity}'}, status=400)

	address = Address.objects.create(
		user=request.user if request.user.is_authenticated else None,
		label='Shipping',
		recipient_name=f"{shipping.get('firstName', '').strip()} {shipping.get('lastName', '').strip()}".strip(),
		phone=shipping.get('phone'),
		line1=shipping.get('address', ''),
		line2=shipping.get('address2'),
		city=shipping.get('city', ''),
		state=shipping.get('state'),
		zip=shipping.get('zip', ''),
		country=shipping.get('country', 'United States'),
	)

	totals = _calculate_totals(cart)
	order_number = f"TS-{uuid4().hex[:8].upper()}"
	order = Order.objects.create(
		order_number=order_number,
		user=request.user if request.user.is_authenticated else None,
		status='pending',
		currency='USD',
		subtotal=Decimal(str(totals['subtotal'])),
		shipping_cost=Decimal(str(totals['shipping'])),
		tax=Decimal(str(totals['tax'])),
		discount=Decimal('0'),
		total=Decimal(str(totals['total'])),
		ship_recipient=address.recipient_name,
		ship_email=shipping.get('email', ''),
		ship_phone=address.phone,
		ship_line1=address.line1,
		ship_line2=address.line2,
		ship_city=address.city,
		ship_state=address.state,
		ship_zip=address.zip,
		ship_country=address.country,
		shipping_address=address,
	)

	for item in items:
		line_total = item.unit_price * item.quantity
		OrderItem.objects.create(
			order=order,
			product=item.product,
			variant=item.variant,
			product_name=item.product.name,
			variant_label=item.variant_label or None,
			product_sku=item.product.sku,
			product_image=item.product.main_image,
			unit_price=item.unit_price,
			quantity=item.quantity,
			line_total=line_total,
		)

	OrderStatusHistory.objects.create(order=order, status='pending')

	return JsonResponse({'orderNumber': order.order_number, 'totals': totals})


def _serialize_order(order):
	return {
		'orderNumber': order.order_number,
		'status': order.status,
		'total': float(order.total),
		'placedAt': order.placed_at.isoformat(),
	}


def _load_json(request):
	try:
		return json.loads(request.body.decode('utf-8') or '{}')
	except json.JSONDecodeError:
		return {}

# Create your views here.
