from django.db import models
import random
import string
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password
from .managers import CustomUserManager
from decimal import Decimal
from datetime import datetime, timedelta
import calendar
from django.utils import timezone

class Object(models.Model):
    name = models.CharField(max_length=255)
    total_apartments = models.PositiveIntegerField()
    floors = models.PositiveIntegerField()
    address = models.TextField()
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='objects/', blank=True, null=True)
    def _object_3d_upload_to(instance, filename):
        return f'object_3d/object_{instance.id}/{filename}'

    model_3d = models.FileField(
        upload_to=_object_3d_upload_to,
        null=True,
        blank=True,
        help_text='Asosiy obyekt 3D modeli — .glb/.gltf yoki .zip (ichida model + teksturalar)'
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Obyekt"
        verbose_name_plural = "Obyektlar"


class RoomTypeModel(models.Model):
    """Xonalar soni bo'yicha ichki 3D model (1x, 2x, 3x, 4x) — barcha shu xonali xonadonlar uchun bitta model."""
    room_count = models.PositiveIntegerField(unique=True)  # 1, 2, 3, 4

    def _room_type_3d_upload_to(instance, filename):
        return f'room_type_3d/room_{instance.room_count}/{filename}'

    model_3d = models.FileField(upload_to=_room_type_3d_upload_to, null=True, blank=True)

    class Meta:
        verbose_name = "Xona turi 3D model"
        verbose_name_plural = "Xona turlari 3D modellar"

    def __str__(self):
        return f"{self.room_count} xonali ichki model"

class Apartment(models.Model):
    STATUS_CHOICES = (
        ('bosh', 'Bo‘sh'),
        ('band', 'Band qilingan'),
        ('muddatli', 'Muddatli'),
        ('sotilgan', 'Sotilgan')
    )

    object = models.ForeignKey(Object, on_delete=models.CASCADE, related_name='apartments')
    room_number = models.CharField(max_length=100)
    rooms = models.PositiveIntegerField()
    area = models.FloatField()
    floor = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='bosh')
    description = models.TextField(blank=True)
    secret_code = models.CharField(max_length=8, unique=True, editable=False)
    reserved_until = models.DateTimeField(null=True, blank=True)
    reservation_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    def _apartment_3d_upload_to(instance, filename):
        return f'apartment_3d/apartment_{instance.id}/{filename}'

    model_3d = models.FileField(upload_to=_apartment_3d_upload_to, null=True, blank=True, help_text=".glb/.gltf yoki .zip (ixtiyoriy override)")
    segment_id = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Asosiy obyekt modelidagi segment ID (masalan 1_1, 2_3) — xonadon shu segmentga biriktiriladi"
    )

    def save(self, *args, **kwargs):
        if not self.secret_code:
            self.secret_code = ''.join(random.choices(string.digits, k=8))
        if self.status == 'band' and self.reserved_until and timezone.now() >= self.reserved_until:
            self.status = 'bosh'
            self.reserved_until = None
            self.reservation_amount = None
        super().save(*args, **kwargs)
        if self.status in ['muddatli', 'band']:
            self.check_status()

    def add_balance(self, amount):
        if amount < 0:
            raise ValueError("Qo‘shiladigan summa manfiy bo‘lishi mumkin emas!")
        self.balance += Decimal(str(amount))
        self.total_payments += Decimal(str(amount))
        self.save()

    def check_status(self):
        if self.balance >= self.price and self.status in ['muddatli', 'band']:
            self.status = 'sotilgan'
            self.reserved_until = None
            self.reservation_amount = None
            self.save()

    def update_balance(self):
        """
        Xonadon balansini yangilaydi: barcha to‘lovlarning paid_amount summasini hisoblaydi.
        """
        total_paid = Decimal('0')
        for payment in self.payments.all():
            total_paid += payment.paid_amount or Decimal('0')
        self.balance = total_paid
        self.save()

    def update_status(self):
        """
        Xonadon statusini yangilaydi: balans va muddati o‘tgan to‘lovlarga qarab.
        """
        overdue_data = self.get_overdue_payments()
        if overdue_data['total_overdue'] > 0:
            self.status = 'overdue'
        elif self.balance >= self.price:
            self.status = 'paid'
        else:
            self.status = 'pending'
        self.save()

    def get_overdue_payments(self):
        """
        Muddati o‘tgan to‘lovlarni qaytaradi.
        """
        overdue_payments = []
        total_overdue = Decimal('0')
        for payment in self.payments.filter(payment_type='muddatli', status__in=['pending', 'overdue']):
            overdue_data = payment.get_overdue_payments()
            if isinstance(overdue_data, dict) and 'overdue_payments' in overdue_data:
                overdue_payments.extend(overdue_data['overdue_payments'])
                total_overdue += Decimal(str(overdue_data.get('total_overdue', 0)))
        return {
            'overdue_payments': overdue_payments,
            'total_overdue': total_overdue
        }

    def __str__(self):
        return f"{self.object.name} - {self.rooms} xonali"

    class Meta:
        verbose_name = "Xonadon"
        verbose_name_plural = "Xonadonlar"

class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    fio = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    phone_number = models.CharField(max_length=15, unique=True)
    object_id = models.ForeignKey(Object, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    apartment_id = models.ForeignKey(Apartment, on_delete=models.SET_NULL, null=True, blank=True, related_name='owners')
    password = models.CharField(max_length=128)

    USER_TYPES = (
        ('admin', 'Admin'),
        ('sotuvchi', 'Sotuvchi'),
        ('buxgalter', 'Buxgalter'),
        ('mijoz', 'Mijoz'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='mijoz')

    telegram_chat_id = models.CharField(max_length=50, null=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00,
                                 help_text="Foydalanuvchi balansi (so‘mda)")

    kafil_fio = models.CharField(max_length=255, null=True, blank=True)
    kafil_address = models.TextField(null=True, blank=True)
    kafil_phone_number = models.CharField(max_length=15, null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['fio']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.phone_number
        if self.password and not self.password.startswith('pbkdf2_sha256'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def add_balance(self, amount):
        self.balance += Decimal(str(amount))
        self.save()

    def deduct_balance(self, amount):
        if amount < 0:
            raise ValueError("Ayiriladigan summa manfiy bo‘lishi mumkin emas!")
        if self.balance < amount:
            raise ValueError("Balansda yetarli mablag‘ yo‘q!")
        self.balance -= amount
        self.save()

    def __str__(self):
        return self.fio

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

class ExpenseType(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Xarajat turi"
        verbose_name_plural = "Xarajat turlari"

class Supplier(models.Model):
    company_name = models.CharField(max_length=255)
    contact_person_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15, unique=True)
    address = models.TextField()
    description = models.TextField(blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return self.company_name

    def get_expense_details(self):
        expenses = self.expenses.all()
        total_expenses = sum(expense.amount for expense in expenses)
        return {
            'total_expenses': total_expenses,
            'expense_count': expenses.count(),
            'expenses': [{'id': e.id, 'amount': e.amount, 'date': e.date, 'comment': e.comment} for e in expenses]
        }

    def get_payment_details(self):
        payments = self.supplier_payments.all()
        total_payments = sum(payment.amount for payment in payments)
        return {
            'total_payments': total_payments,
            'payment_count': payments.count(),
            'payments': [{'id': p.id, 'amount': p.amount, 'date': p.date, 'description': p.description} for p in payments]
        }

    def get_balance_details(self):
        expense_details = self.get_expense_details()
        payment_details = self.get_payment_details()
        return {
            'current_balance': self.balance,
            'total_expenses': expense_details['total_expenses'],
            'total_payments': payment_details['total_payments'],
            'expense_details': expense_details['expenses'],
            'payment_details': payment_details['payments']
        }

    class Meta:
        verbose_name = "Yetkazib beruvchi"
        verbose_name_plural = "Yetkazib beruvchilar"

class Expense(models.Model):
    STATUS_CHOICES = (
        ('To‘langan', 'To‘langan'),
        ('Kutilmoqda', 'Kutilmoqda'),
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='expenses')
    comment = models.TextField()
    expense_type = models.ForeignKey(ExpenseType, on_delete=models.CASCADE, related_name='expenses')
    object = models.ForeignKey(Object, on_delete=models.CASCADE, related_name='expenses')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Kutilmoqda')
    image = models.ImageField(upload_to='expenses/', null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.pk is None:
            self.supplier.balance += self.amount
            self.supplier.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.supplier.company_name} - self.amount"

    class Meta:
        verbose_name = "Xarajat"
        verbose_name_plural = "Xarajatlar"

class Payment(models.Model):
    PAYMENT_TYPES = (
        ('naqd', 'Naqd pul'),
        ('muddatli', 'Muddatli to‘lov'),
        ('ipoteka', 'Ipoteka'),
        ('subsidiya', 'Subsidiya'),
        ('band', 'Band qilish'),
        ('barter', 'Barter'),
    )
    PAYMENT_STATUS = (
        ('pending', 'Kutilmoqda'),
        ('paid', 'To‘langan'),
        ('overdue', 'Muddati o‘tgan'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='naqd')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    initial_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    interest_rate = models.FloatField(default=0.0, blank=True)
    duration_months = models.PositiveIntegerField(default=0, blank=True)
    monthly_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    due_date = models.PositiveIntegerField(default=1, help_text="Har oy qaysi kunda to‘lov bo‘lishi kerak (1-31)")
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    additional_info = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_date = models.DateTimeField(null=True, blank=True, help_text="Foydalanuvchi to‘lov sanasini kiritadi")
    reservation_deadline = models.DateTimeField(null=True, blank=True)
    bank_name = models.CharField(max_length=255, null=True, blank=True)

    def calculate_monthly_payment(self):
        if self.payment_type == 'muddatli' and self.duration_months > 0:
            remaining_amount = self.total_amount - self.initial_payment
            interest = remaining_amount * (Decimal(str(self.interest_rate)) / Decimal('100'))
            total_with_interest = remaining_amount + interest
            self.monthly_payment = total_with_interest / Decimal(str(self.duration_months))
        elif self.payment_type in ['naqd', 'ipoteka', 'subsidiya', 'barter']:
            self.monthly_payment = Decimal('0')
        else:
            self.monthly_payment = (self.total_amount - self.initial_payment) / Decimal(str(self.duration_months or 1))

    def process_payment(self, amount=None):
        """
        Umumiy to‘lovlarni qayta ishlash funksiyasi.
        """
        if amount is not None and amount < 0:
            raise ValueError("To‘lov summasi manfiy bo‘lishi mumkin emas!")

        payment_amount = Decimal(str(amount or self.initial_payment))
        self.paid_amount += payment_amount
        self.apartment.add_balance(payment_amount)

        if self.payment_type == 'band':
            self.apartment.status = 'band'
            self.apartment.reserved_until = self.reservation_deadline or (timezone.now() + timedelta(days=7))
            self.apartment.reservation_amount = payment_amount
            self.apartment.save()
            self.status = 'pending'
        elif self.payment_type == 'muddatli':
            self.apartment.status = 'muddatli'
            self.status = 'pending'
            if self.paid_amount >= self.total_amount:
                self.status = 'paid'
                self.apartment.status = 'sotilgan'
        elif self.payment_type in ['naqd', 'ipoteka', 'subsidiya', 'barter']:
            self.status = 'paid' if self.paid_amount >= self.total_amount else 'pending'
            self.apartment.status = 'sotilgan' if self.paid_amount >= self.total_amount else 'muddatli'

        self.apartment.check_status()
        self.apartment.save()
        self.save()

    def update_status(self):
        """
        To‘lov statusini yangilash, muddati o‘tganligini tekshirish.
        """
        today = timezone.now()
        if self.payment_type in ['muddatli', 'ipoteka', 'subsidiya'] and self.status != 'paid':
            payment_date = self.payment_date or self.created_at
            payment_day = payment_date.day
            current_day = today.day
            payment_month = payment_date.month
            current_month = today.month
            payment_year = payment_date.year
            current_year = today.year
            if (current_year > payment_year) or (current_year == payment_year and current_month > payment_month) or (current_year == payment_year and current_month == payment_month and current_day > self.due_date):
                self.status = 'overdue'
        elif self.payment_type == 'band' and self.reservation_deadline and today >= self.reservation_deadline:
            self.status = 'overdue'
            self.apartment.status = 'bosh'
            self.apartment.reserved_until = None
            self.apartment.reservation_amount = None
            self.apartment.save()
        self.save()

    def get_overdue_payments(self):
        """
        Muddati o‘tgan to‘lovlarni qaytaradi.
        """
        today = timezone.now()
        overdue_payments = []
        total_overdue = Decimal('0')
        if self.payment_type == 'muddatli' and self.status != 'paid':
            start_date = self.payment_date or self.created_at
            months_passed = (today.year - start_date.year) * 12 + today.month - start_date.month
            expected_payments = months_passed * self.monthly_payment
            if self.paid_amount < expected_payments:
                for i in range(months_passed):
                    payment_month = (start_date.month + i - 1) % 12 + 1
                    payment_year = start_date.year + (start_date.month + i - 1) // 12
                    last_day = calendar.monthrange(payment_year, payment_month)[1]
                    safe_day = min(self.due_date, last_day)
                    due_date = timezone.make_aware(datetime(payment_year, payment_month, safe_day))
                    expected_amount = (i + 1) * self.monthly_payment
                    if due_date < today and self.paid_amount < expected_amount:
                        remaining_amount = min(self.monthly_payment, expected_amount - self.paid_amount)
                        overdue_payments.append({
                            'month': f"{payment_month}/{payment_year}",
                            'amount': remaining_amount,
                            'due_date': due_date
                        })
                        total_overdue += remaining_amount
        return {
            'overdue_payments': overdue_payments,
            'total_overdue': total_overdue
        }

    def close_payment(self, amount):
        if self.payment_type != 'muddatli':
            raise ValueError("Faqat muddatli to‘lovlarni yopish mumkin!")
        self.process_payment(amount)

    def save(self, *args, **kwargs):
        self.total_amount = self.apartment.price
        self.calculate_monthly_payment()
        if self.payment_type == 'band' and not self.reservation_deadline:
            self.reservation_deadline = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
        if self.pk is None and self.initial_payment > 0:
            self.process_payment()

    def __str__(self):
        return f"{self.user.fio} - {self.apartment} - {self.payment_type}"

    class Meta:
        verbose_name = "To‘lov"
        verbose_name_plural = "To‘lovlar"

class Document(models.Model):
    DOCUMENT_TYPES = (
        ('kvitansiya', 'Kvitansiya'),
        ('shartnoma', 'Shartnoma'),
        ('chek', 'Chek'),
        ('boshqa', 'Boshqa'),
    )

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='shartnoma')
    docx_file = models.FileField(upload_to='contracts/docx/', null=True, blank=True)
    pdf_file = models.FileField(upload_to='contracts/pdf/', null=True, blank=True)
    image = models.ImageField(upload_to='documents/images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document_type} № {self.payment.id} - {self.payment.user.fio}"

    class Meta:
        verbose_name = "Hujjat"
        verbose_name_plural = "Hujjatlar"

class UserPayment(models.Model):
    PAYMENT_TYPES = (
        ('naqd', 'Naqd pul'),
        ('muddatli', 'Muddatli to‘lov'),
        ('ipoteka', 'Ipoteka'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='naqd')
    date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.user.add_balance(self.amount)

    def __str__(self):
        return f"{self.user.fio} - {self.amount} so‘m - {self.payment_type}"

    class Meta:
        verbose_name = "Foydalanuvchi to‘lovi"
        verbose_name_plural = "Foydalanuvchi to‘lovlari"

class SupplierPayment(models.Model):
    PAYMENT_TYPES = (
        ('naqd', 'Naqd pul'),
        ('muddatli', 'Muddatli to‘lov'),
        ('ipoteka', 'Ipoteka'),
    )

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='supplier_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='naqd')
    date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.supplier.balance -= self.amount
        self.supplier.save()

    def __str__(self):
        return f"{self.supplier.company_name} - {self.amount} so‘m - {self.payment_type}"

    class Meta:
        verbose_name = "Yetkazib beruvchi to‘lovi"
        verbose_name_plural = "Yetkazib beruvchi to‘lovlari"


class OrganizationReport(models.Model):
    """Tashkilot to'liq hisoboti — bitta PDF/DOCX fayl, yuklab olinganlar ro'yxati uchun."""
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tashkilot hisoboti"
        verbose_name_plural = "Tashkilot hisobotlari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
