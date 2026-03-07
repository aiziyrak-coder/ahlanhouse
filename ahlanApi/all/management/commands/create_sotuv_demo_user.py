"""
Sotuv bo'limi demo foydalanuvchi: +998907863888 / 3888
Ishga tushirish: python manage.py create_sotuv_demo_user
"""
from django.core.management.base import BaseCommand
from all.models import User


class Command(BaseCommand):
    help = "Sotuv bo'limi uchun demo foydalanuvchi yaratadi (tel: +998907863888, parol: 3888)"

    def handle(self, *args, **options):
        phone = "+998907863888"
        password = "3888"
        fio = "Sotuv bo'limi (demo)"

        user, created = User.objects.get_or_create(
            phone_number=phone,
            defaults={"fio": fio, "user_type": "sotuvchi"},
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Demo foydalanuvchi yaratildi: {phone}"))
        else:
            user.set_password(password)
            user.fio = fio
            user.user_type = "sotuvchi"
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Demo foydalanuvchi yangilandi: {phone}"))
