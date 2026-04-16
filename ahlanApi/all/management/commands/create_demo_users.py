"""
Demo foydalanuvchilar: +998907863888/3888 (sotuvchi) va +998937017777/ahadjon (admin).
Ishga tushirish: python manage.py create_demo_users
"""
from django.core.management.base import BaseCommand
from all.models import User


def ensure_user(phone: str, password: str, fio: str, user_type: str = "sotuvchi"):
    user, created = User.objects.get_or_create(
        phone_number=phone,
        defaults={"fio": fio, "user_type": user_type},
    )
    user.set_password(password)
    user.fio = fio
    user.user_type = user_type
    user.save()
    return created


class Command(BaseCommand):
    help = "Demo foydalanuvchilarni yaratadi/yangilaydi: +998907863888/3888, +998937017777/ahadjon"

    def handle(self, *args, **options):
        ensure_user("+998907863888", "3888", "Demo sotuvchi", "sotuvchi")
        self.stdout.write(self.style.SUCCESS("Demo: +998907863888 / 3888"))
        ensure_user("+998937017777", "ahadjon", "Admin (demo)", "admin")
        self.stdout.write(self.style.SUCCESS("Demo: +998937017777 / ahadjon"))
