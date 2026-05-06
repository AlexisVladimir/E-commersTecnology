from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = 'Seed demo users for local development'

    def add_arguments(self, parser):
        parser.add_argument('--admin-email', default='admin@example.com')
        parser.add_argument('--admin-password', default='admin1234')
        parser.add_argument('--user-email', default='user@example.com')
        parser.add_argument('--user-password', default='user1234')

    def handle(self, *args, **options):
        admin_email = options['admin_email']
        admin_password = options['admin_password']
        user_email = options['user_email']
        user_password = options['user_password']

        admin_user, _ = User.objects.update_or_create(
            email=admin_email,
            defaults={'first_name': 'Admin', 'last_name': 'User', 'status': 'active'},
        )
        admin_user.set_password(admin_password)
        admin_user.save()

        demo_user, _ = User.objects.update_or_create(
            email=user_email,
            defaults={'first_name': 'Demo', 'last_name': 'User', 'status': 'active'},
        )
        demo_user.set_password(user_password)
        demo_user.save()

        self.stdout.write(self.style.SUCCESS('Users seeded successfully.'))
