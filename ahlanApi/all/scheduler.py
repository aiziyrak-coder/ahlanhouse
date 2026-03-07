from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from all.cron import update_overdue_payments

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")
    scheduler.add_job(
        update_overdue_payments,
        trigger="interval",
        seconds=86400,  # Har 24 soatda (1 kun)
        id="update_overdue_payments",
        replace_existing=True,
    )
    scheduler.start()