from django.contrib import admin

from .models import Address, PasswordReset, User, UserOauthAccount, UserSession, UserSettings


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
	list_display = ('id', 'email', 'first_name', 'last_name', 'status', 'created_at')
	search_fields = ('email', 'first_name', 'last_name')
	list_filter = ('status', 'email_verified')


admin.site.register(UserSettings)
admin.site.register(UserOauthAccount)
admin.site.register(UserSession)
admin.site.register(PasswordReset)
admin.site.register(Address)

# Register your models here.
