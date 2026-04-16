"""
Demo foydalanuvchilar: sotuv (+998901112233/ahlan123), +998907863888/3888, admin +998937017777/ahadjon.
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
    help = "Demo foydalanuvchilarni yaratadi/yangilaydi (Sotuv bo'limi: +998901112233/ahlan123, ...)."

    def handle(self, *args, **options):
        ensure_user("+998901112233", "ahlan123", "Sotuv bo'limi (demo)", "sotuvchi")
        self.stdout.write(self.style.SUCCESS("Sotuv bo'limi: +998901112233 / ahlan123"))
        ensure_user("+998907863888", "3888", "Demo sotuvchi", "sotuvchi")
        self.stdout.write(self.style.SUCCESS("Demo: +998907863888 / 3888"))
        ensure_user("+998937017777", "ahadjon", "Admin (demo)", "admin")
        self.stdout.write(self.style.SUCCESS("Demo: +998937017777 / ahadjon"))
