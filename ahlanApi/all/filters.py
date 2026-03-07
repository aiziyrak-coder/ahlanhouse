"""
Custom filters for API. PaymentFilter supports comma-separated payment_type
(e.g. payment_type=naqd,muddatli,band) so frontend role-based filters work.
"""
import django_filters
from .models import Payment


class PaymentFilter(django_filters.FilterSet):
    """Filter payments. payment_type accepts comma-separated values (e.g. naqd,muddatli,band)."""
    payment_type = django_filters.CharFilter(method="filter_payment_type")

    class Meta:
        model = Payment
        fields = ["user", "apartment", "created_at", "status"]

    def filter_payment_type(self, queryset, name, value):
        if not value:
            return queryset
        values = [v.strip() for v in value.split(",") if v.strip()]
        if not values:
            return queryset
        return queryset.filter(payment_type__in=values)
