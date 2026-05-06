import json
from datetime import datetime, timezone

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from cart.views import _get_or_create_cart
from orders.models import Order, OrderItem
from .models import Payment


PAYPAL_BASE_URLS = {
	'live': 'https://api-m.paypal.com',
	'sandbox': 'https://api-m.sandbox.paypal.com',
}


def paypal_config(request):
	if request.method != 'GET':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
	if not client_id or client_id.startswith('REPLACE_'):
		return JsonResponse({'error': 'PayPal is not configured'}, status=400)

	return JsonResponse({
		'clientId': client_id,
		'currency': 'USD',
		'env': getattr(settings, 'PAYPAL_ENV', 'sandbox'),
	})


@csrf_exempt
def paypal_create_order(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_SECRET:
		return JsonResponse({'error': 'PayPal is not configured'}, status=400)

	payload = _load_json(request)
	order_number = payload.get('orderNumber')
	if not order_number:
		return JsonResponse({'error': 'orderNumber is required'}, status=400)

	order = Order.objects.filter(order_number=order_number).first()
	if not order:
		return JsonResponse({'error': 'Order not found'}, status=404)

	existing_payment = Payment.objects.filter(order=order, gateway='paypal').order_by('-id').first()
	if existing_payment:
		if existing_payment.status in ['captured', 'refunded']:
			return JsonResponse({'status': existing_payment.status, 'paypalOrderId': existing_payment.transaction_id})
		if existing_payment.status == 'pending' and existing_payment.transaction_id:
			access_token = _paypal_access_token()
			if not access_token:
				return JsonResponse({'error': 'Unable to authenticate with PayPal'}, status=400)
			approval_url = _paypal_get_approval_url(access_token, existing_payment.transaction_id)
			if approval_url:
				return JsonResponse({'approvalUrl': approval_url, 'paypalOrderId': existing_payment.transaction_id})

	charge_amount = _paypal_charge_amount(order)

	access_token = _paypal_access_token()
	if not access_token:
		return JsonResponse({'error': 'Unable to authenticate with PayPal'}, status=400)

	return_url = f"http://localhost:3000/confirmation?orderNumber={order.order_number}"
	cancel_url = f"http://localhost:3000/checkout?canceled=1"

	response = requests.post(
		f"{_paypal_base_url()}/v2/checkout/orders",
		headers={
			'Authorization': f"Bearer {access_token}",
			'Content-Type': 'application/json',
			'PayPal-Request-Id': f"create-{order.order_number}",
		},
		json={
			'intent': 'CAPTURE',
			'purchase_units': [
				{
					'reference_id': order.order_number,
					'amount': {
						'currency_code': order.currency,
						'value': f"{charge_amount:.2f}",
					},
				}
			],
			'application_context': {
				'return_url': return_url,
				'cancel_url': cancel_url,
			},
		},
		timeout=20,
	)

	if response.status_code >= 400:
		return JsonResponse({'error': 'PayPal order creation failed'}, status=400)

	data = response.json()
	approval_url = next((link['href'] for link in data.get('links', []) if link['rel'] == 'approve'), None)
	if not approval_url:
		return JsonResponse({'error': 'Approval URL not found'}, status=400)

	Payment.objects.create(
		order=order,
		amount=charge_amount,
		currency=order.currency,
		gateway='paypal',
		transaction_id=data.get('id'),
		status='pending',
	)

	return JsonResponse({'approvalUrl': approval_url, 'paypalOrderId': data.get('id')})


@csrf_exempt
def paypal_capture_order(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	payload = _load_json(request)
	paypal_order_id = payload.get('paypalOrderId')
	order_number = payload.get('orderNumber')
	if not paypal_order_id or not order_number:
		return JsonResponse({'error': 'paypalOrderId and orderNumber are required'}, status=400)

	order = Order.objects.filter(order_number=order_number).first()
	if not order:
		return JsonResponse({'error': 'Order not found'}, status=404)

	if order.status in ['paid', 'processing', 'shipped', 'delivered']:
		return JsonResponse({'status': 'captured'})

	current_payment = Payment.objects.filter(order=order, gateway='paypal').order_by('-id').first()
	if current_payment and current_payment.status in ['captured', 'refunded']:
		return JsonResponse({'status': current_payment.status})

	access_token = _paypal_access_token()
	if not access_token:
		return JsonResponse({'error': 'Unable to authenticate with PayPal'}, status=400)

	response = requests.post(
		f"{_paypal_base_url()}/v2/checkout/orders/{paypal_order_id}/capture",
		headers={
			'Authorization': f"Bearer {access_token}",
			'Content-Type': 'application/json',
			'PayPal-Request-Id': f"capture-{paypal_order_id}",
		},
		json={},
		timeout=20,
	)

	if response.status_code >= 400:
		return JsonResponse({'error': 'PayPal capture failed'}, status=400)

	capture_id = _extract_capture_id(response.json())
	Payment.objects.filter(order=order, gateway='paypal').update(
		status='captured',
		paid_at=datetime.now(timezone.utc),
		transaction_id=capture_id or paypal_order_id,
	)

	order.status = 'paid'
	order.paid_at = datetime.now(timezone.utc)
	order.save(update_fields=['status', 'paid_at'])

	# Restar stock de los productos
	_deduct_stock_for_order(order)

	cart = _get_or_create_cart(request)
	cart.status = 'converted'
	cart.save(update_fields=['status'])
	cart.cartitem_set.all().delete()

	if settings.PAYPAL_AUTO_REFUND and capture_id:
		refunded = _paypal_refund_capture(access_token, capture_id)
		if refunded:
			Payment.objects.filter(order=order, gateway='paypal').update(status='refunded')
			return JsonResponse({'status': 'refunded'})

	return JsonResponse({'status': 'captured'})


def _load_json(request):
	try:
		return json.loads(request.body.decode('utf-8') or '{}')
	except json.JSONDecodeError:
		return {}


def _paypal_access_token():
	response = requests.post(
		f"{_paypal_base_url()}/v1/oauth2/token",
		auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_SECRET),
		headers={'Content-Type': 'application/x-www-form-urlencoded'},
		data={'grant_type': 'client_credentials'},
		timeout=20,
	)
	if response.status_code >= 400:
		return None
	return response.json().get('access_token')


def _paypal_base_url():
	env = getattr(settings, 'PAYPAL_ENV', 'sandbox')
	return PAYPAL_BASE_URLS.get(env, PAYPAL_BASE_URLS['sandbox'])


def _paypal_charge_amount(order):
	value = getattr(settings, 'PAYPAL_FORCE_AMOUNT', None)
	if not value:
		return order.total
	try:
		return float(value)
	except (TypeError, ValueError):
		return order.total


def _extract_capture_id(payload):
	for unit in payload.get('purchase_units', []):
		payments = unit.get('payments', {})
		captures = payments.get('captures', [])
		if captures:
			return captures[0].get('id')
	return None


def _paypal_refund_capture(access_token, capture_id):
	response = requests.post(
		f"{_paypal_base_url()}/v2/payments/captures/{capture_id}/refund",
		headers={
			'Authorization': f"Bearer {access_token}",
			'Content-Type': 'application/json',
		},
		json={},
		timeout=20,
	)
	return response.status_code < 400


def _paypal_get_approval_url(access_token, paypal_order_id):
	response = requests.get(
		f"{_paypal_base_url()}/v2/checkout/orders/{paypal_order_id}",
		headers={
			'Authorization': f"Bearer {access_token}",
			'Content-Type': 'application/json',
		},
		timeout=20,
	)
	if response.status_code >= 400:
		return None
	data = response.json()
	return next((link['href'] for link in data.get('links', []) if link.get('rel') == 'approve'), None)


def _deduct_stock_for_order(order):
	"""Reduce product stock after order payment is captured"""
	from catalog.models import Product
	
	order_items = OrderItem.objects.filter(order=order)
	for order_item in order_items:
		product = order_item.product
		if product:
			new_stock = max(0, product.stock_quantity - order_item.quantity)
			Product.objects.filter(id=product.id).update(stock_quantity=new_stock)


# Create your views here.
