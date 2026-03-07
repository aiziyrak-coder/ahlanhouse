from rest_framework import serializers
from django.db.models import Count, Q, F, Sum
from django.db.models.functions import Coalesce
from django.db.models import Value
from decimal import Decimal
from .models import Object, Apartment, User, ExpenseType, Supplier, Expense, Payment, Document, UserPayment, SupplierPayment, RoomTypeModel, OrganizationReport


class ObjectSerializer(serializers.ModelSerializer):
    model_3d_url = serializers.SerializerMethodField()
    apartment_stats = serializers.SerializerMethodField()

    class Meta:
        model = Object
        fields = [
            'id', 'name', 'total_apartments', 'floors', 'address', 'description',
            'image', 'model_3d', 'model_3d_url', 'apartment_stats',
        ]

    def get_model_3d_url(self, obj):
        if obj.model_3d:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_3d.url)
            return obj.model_3d.url
        return None

    def get_apartment_stats(self, obj):
        """
        Obyekt bo'yicha xonadonlar statistikasi — ro'yxatdagi haqiqiy holatga mos.
        Sotilgan: status=sotilgan, yoki balance>=price, yoki to'lovlar yig'indisi (total_paid)>=price.
        Band: status=band yoki band to'lovi bor va hali to'lanmagan (sotilgan emas).
        Bo'sh: total_apartments - sotilgan - band.
        """
        total = obj.total_apartments or 0
        # To'lovlar yig'indisi bo'yicha ham sotilganni hisoblash (balance yangilanmagan bo'lsa ham)
        qs = obj.apartments.all().annotate(
            total_paid=Coalesce(Sum('payments__paid_amount'), Value(Decimal('0')))
        )
        # Sotilgan: status sotilgan, yoki balans to'liq, yoki to'lovlar summasiga qarab to'liq to'langan
        sold_filter = (
            Q(status='sotilgan') |
            Q(balance__gte=F('price')) |
            Q(total_paid__gte=F('price'))
        )
        sotilgan = qs.filter(sold_filter).count()
        # Band: sotilgan emas, lekin band qilingan (status=band yoki band to'lovi pending/overdue)
        band_filter = (
            Q(status='band') |
            Q(payments__payment_type='band', payments__status__in=['pending', 'overdue'])
        )
        band = qs.exclude(sold_filter).filter(band_filter).distinct().count()
        bosh = max(0, total - sotilgan - band)
        return {
            'bosh': bosh,
            'band': band,
            'sotilgan': sotilgan,
        }

class ApartmentSerializer(serializers.ModelSerializer):
    object_name = serializers.CharField(source='object.name', read_only=True)
    overdue_payments = serializers.SerializerMethodField()
    model_3d_url = serializers.SerializerMethodField()
    internal_model_3d_url = serializers.SerializerMethodField()

    class Meta:
        model = Apartment
        fields = [
            'id', 'object', 'object_name', 'room_number', 'rooms', 'area', 'floor',
            'price', 'status', 'description', 'secret_code', 'reserved_until',
            'reservation_amount', 'total_payments', 'balance', 'overdue_payments',
            'model_3d', 'model_3d_url', 'segment_id', 'internal_model_3d_url'
        ]

    def get_overdue_payments(self, obj):
        return obj.get_overdue_payments()

    def get_model_3d_url(self, obj):
        if obj.model_3d:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_3d.url)
            return obj.model_3d.url
        return None

    def get_internal_model_3d_url(self, obj):
        """Xonalar soni bo'yicha ichki model (RoomTypeModel)."""
        try:
            rt = RoomTypeModel.objects.filter(room_count=obj.rooms).first()
            if rt and rt.model_3d:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(rt.model_3d.url)
                return rt.model_3d.url
        except Exception:
            pass
        return None

class RoomTypeModelSerializer(serializers.ModelSerializer):
    model_3d_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomTypeModel
        fields = ['id', 'room_count', 'model_3d', 'model_3d_url']

    def get_model_3d_url(self, obj):
        if obj.model_3d:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_3d.url)
            return obj.model_3d.url
        return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'fio', 'address', 'phone_number', 'object_id', 'apartment_id',
            'user_type', 'telegram_chat_id', 'balance', 'kafil_fio', 'kafil_address',
            'kafil_phone_number', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        user = User(**validated_data)
        user.save()
        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if attr == 'password':
                instance.set_password(value)
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance

class ExpenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseType
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    balance_details = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ['id', 'company_name', 'contact_person_name', 'phone_number', 'address', 'description', 'balance', 'balance_details']

    def get_balance_details(self, obj):
        return obj.get_balance_details()

class ExpenseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.company_name', read_only=True)
    expense_type_name = serializers.CharField(source='expense_type.name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'amount', 'date', 'supplier', 'supplier_name', 'comment', 'expense_type',
            'expense_type_name', 'object', 'status', 'image'
        ]

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'payment', 'document_type', 'docx_file', 'pdf_file', 'image', 'created_at']

class PaymentSerializer(serializers.ModelSerializer):
    user_fio = serializers.CharField(source='user.fio', read_only=True)
    apartment_info = serializers.CharField(source='apartment.__str__', read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    overdue_payments = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'user_fio', 'apartment', 'apartment_info', 'payment_type', 'total_amount',
            'initial_payment', 'interest_rate', 'duration_months', 'monthly_payment', 'due_date',
            'paid_amount', 'status', 'additional_info', 'created_at', 'payment_date',
            'reservation_deadline', 'bank_name', 'documents', 'overdue_payments'
        ]

    def get_overdue_payments(self, obj):
        return obj.get_overdue_payments()

class UserPaymentSerializer(serializers.ModelSerializer):
    user_fio = serializers.CharField(source='user.fio', read_only=True)

    class Meta:
        model = UserPayment
        fields = ['id', 'user', 'user_fio', 'amount', 'payment_type', 'date', 'description']

class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.company_name', read_only=True)

    class Meta:
        model = SupplierPayment
        fields = ['id', 'supplier', 'supplier_name', 'amount', 'payment_type', 'date', 'description']


class OrganizationReportSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationReport
        fields = ['id', 'title', 'file', 'file_url', 'created_at']
        read_only_fields = ['title', 'file', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None