import json
from decimal import Decimal
from uuid import uuid4

from django.core.files.storage import default_storage
from django.db.models import Case, IntegerField, Q, Value, When
from django.http import JsonResponse, QueryDict
from django.http.multipartparser import MultiPartParser, MultiPartParserError
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt

from .models import Brand, Category, Product, VariantOption



@csrf_exempt
def products_list(request):
	if request.method == 'POST':
		return _create_product(request)

	queryset = Product.objects.all()

	category = request.GET.get('category')
	if category:
		queryset = queryset.filter(category__name=category)

	brand = request.GET.get('brand')
	if brand:
		queryset = queryset.filter(brand__name=brand)

	search = request.GET.get('search')
	if search:
		queryset = queryset.filter(
			Q(name__icontains=search)
			| Q(description__icontains=search)
			| Q(category__name__icontains=search)
		)

	min_price = request.GET.get('minPrice')
	max_price = request.GET.get('maxPrice')
	if min_price:
		queryset = queryset.filter(price__gte=min_price)
	if max_price:
		queryset = queryset.filter(price__lte=max_price)

	min_rating = request.GET.get('minRating')
	if min_rating:
		queryset = queryset.filter(rating_avg__gte=min_rating)

	sort = request.GET.get('sort')
	if sort == 'price-low':
		queryset = queryset.order_by('price')
	elif sort == 'price-high':
		queryset = queryset.order_by('-price')
	elif sort == 'rating':
		queryset = queryset.order_by('-rating_avg')
	elif sort == 'newest':
		queryset = queryset.annotate(
			badge_rank=Case(
				When(badge='New', then=Value(0)),
				default=Value(1),
				output_field=IntegerField(),
			)
		).order_by('badge_rank', '-created_at')

	page = int(request.GET.get('page', 1))
	page_size = int(request.GET.get('pageSize', 20))
	start = (page - 1) * page_size
	end = start + page_size

	queryset = queryset.prefetch_related(
		'productspec_set',
		'productvariant_set__productvariantoption_set__option__attribute',
	)

	items = [_serialize_product(product) for product in queryset[start:end]]
	return JsonResponse({'items': items, 'total': queryset.count(), 'page': page, 'pageSize': page_size})


def _create_product(request):
	if not request.user.is_authenticated:
		return JsonResponse({'error': 'Authentication required'}, status=401)

	if request.user.email.lower() != 'admin@example.com':
		return JsonResponse({'error': 'Admin access required'}, status=403)

	payload, files = _get_request_payload(request)
	name = (payload.get('name') or '').strip()
	description = (payload.get('description') or '').strip()
	category_name = (payload.get('category') or '').strip()
	price = payload.get('price')
	image = (payload.get('image') or '').strip()
	image_file = files.get('imageFile')

	if not name or not description or not category_name or price is None or (not image and not image_file):
		return JsonResponse({'error': 'Missing required fields'}, status=400)

	category = Category.objects.filter(name=category_name).first()
	if not category:
		return JsonResponse({'error': 'Category not found'}, status=400)

	brand = None
	brand_name = (payload.get('brand') or '').strip()
	if brand_name:
		brand = Brand.objects.filter(name=brand_name).first()
		if not brand:
			return JsonResponse({'error': 'Brand not found'}, status=400)

	base_slug = slugify(name) or f'product-{uuid4().hex[:8]}'
	slug = base_slug
	count = 1
	while Product.objects.filter(slug=slug).exists():
		count += 1
		slug = f'{base_slug}-{count}'

	sku = (payload.get('sku') or '').strip() or f'SKU-{uuid4().hex[:8].upper()}'
	if Product.objects.filter(sku=sku).exists():
		return JsonResponse({'error': 'SKU already exists'}, status=400)

	original_price = payload.get('originalPrice')
	badge = payload.get('badge') or None
	if image_file:
		image = _store_image(request, image_file)

	product = Product.objects.create(
		sku=sku,
		name=name,
		slug=slug,
		description=description,
		category=category,
		brand=brand,
		price=Decimal(str(price)),
		original_price=Decimal(str(original_price)) if original_price is not None else None,
		badge=badge,
		main_image=image,
		in_stock=_parse_bool(payload.get('inStock'), True),
		stock_quantity=int(payload.get('stockQuantity') or 0),
		is_active=_parse_bool(payload.get('isActive'), True),
	)

	return JsonResponse({'item': _serialize_product(product)}, status=201)



@csrf_exempt
def product_detail(request, product_id: int):
	is_admin = request.user.is_authenticated and request.user.email.lower() == 'admin@example.com'
	base_queryset = Product.objects.filter(id=product_id)
	if not is_admin and request.method == 'GET':
		base_queryset = base_queryset.filter(is_active=True)
	product = (
		base_queryset.prefetch_related(
			'productspec_set',
			'productvariant_set__productvariantoption_set__option__attribute',
		)
		.first()
	)
	if not product:
		return JsonResponse({'error': 'Not found'}, status=404)

	if request.method == 'PATCH':
		return _update_product(request, product)
	if request.method == 'DELETE':
		return _delete_product(request, product)
	if request.method != 'GET':
		return JsonResponse({'error': 'Method not allowed'}, status=405)
	return JsonResponse({'item': _serialize_product(product)})


def _update_product(request, product: Product):
	if not request.user.is_authenticated:
		return JsonResponse({'error': 'Authentication required'}, status=401)
	if request.user.email.lower() != 'admin@example.com':
		return JsonResponse({'error': 'Admin access required'}, status=403)

	payload, files = _get_request_payload(request)

	if 'name' in payload:
		product.name = (payload.get('name') or '').strip() or product.name
	if 'description' in payload:
		product.description = (payload.get('description') or '').strip() or product.description
	if 'category' in payload:
		category_name = (payload.get('category') or '').strip()
		if category_name:
			category = Category.objects.filter(name=category_name).first()
			if not category:
				return JsonResponse({'error': 'Category not found'}, status=400)
			product.category = category
	if 'brand' in payload:
		brand_name = (payload.get('brand') or '').strip()
		if brand_name:
			brand = Brand.objects.filter(name=brand_name).first()
			if not brand:
				return JsonResponse({'error': 'Brand not found'}, status=400)
			product.brand = brand
		else:
			product.brand = None
	if 'price' in payload and payload.get('price') is not None:
		product.price = Decimal(str(payload.get('price')))
	if 'originalPrice' in payload:
		original_price = payload.get('originalPrice')
		product.original_price = Decimal(str(original_price)) if original_price not in (None, '') else None
	if 'badge' in payload:
		badge = payload.get('badge') or None
		product.badge = badge
	if 'sku' in payload:
		sku = (payload.get('sku') or '').strip()
		if sku and sku != product.sku:
			if Product.objects.filter(sku=sku).exclude(id=product.id).exists():
				return JsonResponse({'error': 'SKU already exists'}, status=400)
			product.sku = sku
	if 'inStock' in payload:
		product.in_stock = _parse_bool(payload.get('inStock'), product.in_stock)
	if 'stockQuantity' in payload:
		product.stock_quantity = int(payload.get('stockQuantity') or 0)
	if 'isActive' in payload:
		product.is_active = _parse_bool(payload.get('isActive'), product.is_active)

	image_file = files.get('imageFile')
	if image_file:
		product.main_image = _store_image(request, image_file)
	elif 'image' in payload:
		image = (payload.get('image') or '').strip()
		if image:
			product.main_image = image

	product.save()
	return JsonResponse({'item': _serialize_product(product)})


def _delete_product(request, product: Product):
	if not request.user.is_authenticated:
		return JsonResponse({'error': 'Authentication required'}, status=401)
	if request.user.email.lower() != 'admin@example.com':
		return JsonResponse({'error': 'Admin access required'}, status=403)
	product.delete()
	return JsonResponse({'status': 'deleted'})


def categories_list(request):
	items = [
		{'name': category.name, 'icon': category.icon}
		for category in Category.objects.order_by('sort_order', 'name')
	]
	return JsonResponse({'items': items})


def brands_list(request):
	items = [brand.name for brand in Brand.objects.order_by('name')]
	return JsonResponse({'items': items})


def _serialize_product(product):
	specs = {spec.spec_key: spec.spec_value for spec in product.productspec_set.all().order_by('sort_order')}

	options = VariantOption.objects.filter(
		productvariantoption__variant__product=product
	).select_related('attribute').distinct()

	colors = []
	sizes = []
	for option in options:
		attribute = option.attribute.name.lower()
		payload = {'name': option.label, 'value': option.value}
		if attribute == 'color':
			colors.append(payload)
		elif attribute in ('storage', 'size'):
			sizes.append(payload)

	variants = {}
	if colors:
		variants['colors'] = colors
	if sizes:
		variants['sizes'] = sizes

	data = {
		'id': str(product.id),
		'sku': product.sku,
		'name': product.name,
		'category': product.category.name,
		'brand': product.brand.name if product.brand else None,
		'price': float(product.price),
		'rating': float(product.rating_avg),
		'reviewCount': product.review_count,
		'image': product.main_image,
		'description': product.description,
		'specs': specs,
		'inStock': product.in_stock,
		'stockQuantity': product.stock_quantity,
		'isActive': product.is_active,
	}

	if product.original_price is not None:
		data['originalPrice'] = float(product.original_price)
	if product.badge:
		data['badge'] = product.badge
	if variants:
		data['variants'] = variants

	return data


def _get_request_payload(request):
	if request.content_type and request.content_type.startswith('multipart/'):
		if request.method == 'POST':
			return request.POST, request.FILES
		try:
			parser = MultiPartParser(request.META, request, request.upload_handlers)
			data, files = parser.parse()
			return data, files
		except MultiPartParserError:
			return QueryDict('', mutable=True), {}
	if request.method in ('PATCH', 'PUT'):
		return _load_json(request), {}
	return _load_json(request), {}


def _parse_bool(value, default=False):
	if value is None:
		return default
	if isinstance(value, bool):
		return value
	if isinstance(value, str):
		return value.lower() in ('true', '1', 'yes', 'on')
	return bool(value)


def _store_image(request, uploaded_file):
	filename = f"products/{uuid4().hex}_{uploaded_file.name}"
	path = default_storage.save(filename, uploaded_file)
	return request.build_absolute_uri(default_storage.url(path))


def _load_json(request):
	try:
		return json.loads(request.body.decode('utf-8') or '{}')
	except json.JSONDecodeError:
		return {}

# Create your views here.
