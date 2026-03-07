from django.contrib import admin
from django.utils import timezone
from .models import Object, Apartment, User, ExpenseType, Supplier, Expense, Payment, Document, UserPayment, SupplierPayment, RoomTypeModel, OrganizationReport


@admin.register(Object)
class ObjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'total_apartments', 'floors', 'address')
    search_fields = ('name', 'address')
    list_filter = ('floors', 'total_apartments')


@admin.register(Apartment)
class ApartmentAdmin(admin.ModelAdmin):
    list_display = (
        'object', 'room_number', 'rooms', 'floor', 'price', 'status', 'reserved_until',
        'total_payments', 'balance', 'total_overdue'
    )
    list_filter = ('status', 'object', 'rooms', 'floor')
    search_fields = ('object__name', 'room_number')
    actions = ['add_balance', 'check_overdue_payments']

    def total_overdue(self, obj):
        return obj.get_overdue_payments()['total_overdue']

    total_overdue.short_description = "Muddati o‘tgan summa"

    def add_balance(self, request, queryset):
        for apartment in queryset:
            apartment.add_balance(1000000)
        self.message_user(request, "Tanlangan xonadonlarga balans qo‘shildi!")

    def check_overdue_payments(self, request, queryset):
        for apartment in queryset:
            overdue_data = apartment.get_overdue_payments()
            if overdue_data['overdue_payments']:
                self.message_user(
                    request,
                    f"{apartment} uchun {len(overdue_data['overdue_payments'])} ta muddati o‘tgan to‘lov topildi, jami: {overdue_data['total_overdue']} so‘m!"
                )
        self.message_user(request, "Muddati o‘tgan to‘lovlar tekshirildi!")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        'username', 'fio', 'email', 'phone_number', 'user_type', 'is_staff',
        'is_active', 'is_superuser', 'balance', 'last_login', 'date_joined'
    )
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'fio', 'email', 'phone_number', 'kafil_fio')

    fieldsets = (
        ("Asosiy ma'lumotlar", {
            'fields': ('username', 'password', 'fio', 'email', 'phone_number', 'user_type')
        }),
        ('Qo‘shimcha ma‘lumotlar', {
            'fields': ('address', 'object_id', 'apartment_id', 'telegram_chat_id', 'balance')
        }),
        ('Kafil ma‘lumotlari', {
            'fields': ('kafil_fio', 'kafil_address', 'kafil_phone_number')
        }),
        ('Huquqlar', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Muhim sanalar', {
            'fields': ('last_login', 'date_joined')
        }),
    )

    readonly_fields = ('last_login', 'date_joined')


@admin.register(ExpenseType)
class ExpenseTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'phone_number', 'balance')
    list_filter = ('balance',)
    search_fields = ('company_name', 'phone_number')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('supplier', 'amount', 'date', 'expense_type', 'status')
    list_filter = ('status', 'expense_type', 'object', 'date')
    search_fields = ('supplier__company_name', 'comment')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'apartment', 'payment_type', 'total_amount', 'initial_payment',
        'monthly_payment', 'due_date', 'paid_amount', 'status', 'created_at',
        'payment_date', 'reservation_deadline', 'bank_name', 'total_overdue'
    )
    list_filter = ('payment_type', 'status', 'created_at', 'payment_date')
    search_fields = ('user__fio', 'apartment__room_number')
    actions = ['process_payment', 'check_overdue_payments']
    readonly_fields = ('total_overdue',)

    def total_overdue(self, obj):
        overdue_data = obj.get_overdue_payments()
        return overdue_data.get('total_overdue', 0) if isinstance(overdue_data, dict) else 0

    total_overdue.short_description = "Muddati o‘tgan summa"

    def process_payment(self, request, queryset):
        for payment in queryset:
            payment.process_payment(amount=1000000)
        self.message_user(request, "Tanlangan to‘lovlar qayta ishlandi!")

    def check_overdue_payments(self, request, queryset):
        for payment in queryset:
            payment.update_status()
            overdue_data = payment.get_overdue_payments()
            if overdue_data.get('overdue_payments'):
                user_name = payment.user.fio if payment.user else "Noma'lum foydalanuvchi"
                self.message_user(
                    request,
                    f"{user_name} uchun {len(overdue_data['overdue_payments'])} ta muddati o‘tgan to‘lov topildi, jami: {overdue_data['total_overdue']} so‘m!"
                )
        self.message_user(request, "Muddati o‘tgan to‘lovlar tekshirildi!")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs

    def changelist_view(self, request, extra_context=None):
        today = timezone.now().date()
        due_payments = Payment.objects.filter(due_date__date=today, status='pending')

        if due_payments.exists():
            extra_context = extra_context or {}
            extra_context['payment_reminder'] = f"Bugun ({today.strftime('%d-%m-%Y')}) {due_payments.count()} ta to‘lov muddati yetdi!"
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('payment', 'document_type', 'created_at')
    list_filter = ('document_type', 'created_at')
    search_fields = ('payment__user__fio',)


@admin.register(UserPayment)
class UserPaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'payment_type', 'date', 'description')
    list_filter = ('payment_type', 'date')
    search_fields = ('user__fio', 'description')


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = ('supplier', 'amount', 'payment_type', 'date', 'description')
    list_filter = ('payment_type', 'date')
    search_fields = ('supplier__company_name', 'description')


@admin.register(RoomTypeModel)
class RoomTypeModelAdmin(admin.ModelAdmin):
    list_display = ('room_count', 'model_3d')
    list_filter = ('room_count',)


@admin.register(OrganizationReport)
class OrganizationReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    list_filter = ('created_at',)
    readonly_fields = ('title', 'file', 'created_at')

