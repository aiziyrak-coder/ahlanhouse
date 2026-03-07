# all/cron.py
from django.utils import timezone
from all.models import Payment

def update_overdue_payments():
    payments = Payment.objects.filter(status='pending')
    for payment in payments:
        payment.update_status()