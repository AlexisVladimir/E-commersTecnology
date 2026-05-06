from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
	def create_user(self, email, password=None, **extra_fields):
		if not email:
			raise ValueError('Email is required')
		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		if password:
			user.set_password(password)
		else:
			user.set_unusable_password()
		user.save(using=self._db)
		return user


class User(AbstractBaseUser):
	STATUS_CHOICES = [
		('active', 'active'),
		('suspended', 'suspended'),
		('deleted', 'deleted'),
	]

	email = models.EmailField(max_length=190, unique=True)
	password = models.CharField(max_length=255, db_column='password_hash', null=True, blank=True)
	first_name = models.CharField(max_length=80)
	last_name = models.CharField(max_length=80)
	phone = models.CharField(max_length=30, null=True, blank=True)
	email_verified = models.BooleanField(default=False)
	two_factor_enabled = models.BooleanField(default=False)
	status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
	last_login = models.DateTimeField(db_column='last_login_at', null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	objects = UserManager()

	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['first_name', 'last_name']

	class Meta:
		db_table = 'users'

	@property
	def is_active(self):
		return self.status == 'active'

	@property
	def is_staff(self):
		return self.status == 'active'

	def has_perm(self, perm, obj=None):
		return True

	def has_module_perms(self, app_label):
		return True


class UserOauthAccount(models.Model):
	PROVIDER_CHOICES = [
		('google', 'google'),
		('facebook', 'facebook'),
		('apple', 'apple'),
	]

	user = models.ForeignKey(User, on_delete=models.CASCADE)
	provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
	provider_user_id = models.CharField(max_length=190)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'user_oauth_accounts'
		unique_together = ('provider', 'provider_user_id')


class UserSession(models.Model):
	id = models.CharField(max_length=36, primary_key=True)
	user = models.ForeignKey(User, on_delete=models.CASCADE)
	token_hash = models.CharField(max_length=64, unique=True)
	ip_address = models.CharField(max_length=45, null=True, blank=True)
	user_agent = models.CharField(max_length=255, null=True, blank=True)
	expires_at = models.DateTimeField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'user_sessions'


class PasswordReset(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE)
	token_hash = models.CharField(max_length=64, unique=True)
	expires_at = models.DateTimeField()
	used_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'password_resets'


class UserSettings(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
	email_notifications = models.BooleanField(default=True)
	sms_notifications = models.BooleanField(default=False)
	newsletter = models.BooleanField(default=True)

	class Meta:
		db_table = 'user_settings'


class Address(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
	label = models.CharField(max_length=50, default='Shipping')
	recipient_name = models.CharField(max_length=160)
	phone = models.CharField(max_length=30, null=True, blank=True)
	line1 = models.CharField(max_length=255)
	line2 = models.CharField(max_length=255, null=True, blank=True)
	city = models.CharField(max_length=100)
	state = models.CharField(max_length=100, null=True, blank=True)
	zip = models.CharField(max_length=20)
	country = models.CharField(max_length=80, default='United States')
	is_default = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'addresses'

# Create your models here.
