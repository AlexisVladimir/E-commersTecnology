import json

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import User


def me(request):
	if not request.user.is_authenticated:
		return JsonResponse({'user': None})

	return JsonResponse({'user': _serialize_user(request.user)})


@csrf_exempt
def login(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	payload = _load_json(request)
	email = payload.get('email')
	password = payload.get('password')
	if not email or not password:
		return JsonResponse({'error': 'Email and password are required'}, status=400)

	user = authenticate(request, username=email, password=password)
	if not user:
		return JsonResponse({'error': 'Invalid credentials'}, status=401)

	auth_login(request, user)
	return JsonResponse({'user': _serialize_user(user)})


@csrf_exempt
def register(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'Method not allowed'}, status=405)

	payload = _load_json(request)
	email = payload.get('email')
	password = payload.get('password')
	first_name = payload.get('firstName')
	last_name = payload.get('lastName')

	if not email or not password or not first_name or not last_name:
		return JsonResponse({'error': 'Missing required fields'}, status=400)

	if User.objects.filter(email=email).exists():
		return JsonResponse({'error': 'Email already registered'}, status=400)

	user = User.objects.create_user(
		email=email,
		password=password,
		first_name=first_name,
		last_name=last_name,
	)
	auth_login(request, user)
	return JsonResponse({'user': _serialize_user(user)})


def logout(request):
	auth_logout(request)
	return JsonResponse({'status': 'ok'})


def _serialize_user(user: User):
	return {
		'id': user.id,
		'email': user.email,
		'firstName': user.first_name,
		'lastName': user.last_name,
		'phone': user.phone,
		'isAdmin': user.email.lower() == 'admin@example.com',
	}


def _load_json(request):
	try:
		return json.loads(request.body.decode('utf-8') or '{}')
	except json.JSONDecodeError:
		return {}

# Create your views here.
