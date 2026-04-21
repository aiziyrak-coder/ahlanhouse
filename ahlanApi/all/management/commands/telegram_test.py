"""
Telegram bot ulanishini tekshirish (alohida "bot process" yo'q — har safar API chaqiriladi).

Ishlatish (serverda, venv bilan):
  export TELEGRAM_BOT_TOKEN='...'   # yoki ahlanApi/.env da
  python manage.py telegram_test -1003733316489

chat_id: guruh uchun odatda -100... bilan boshlanadi; bot guruhga admin sifatida qo'shilgan bo'lishi kerak.
"""
import os

import requests
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "TELEGRAM_BOT_TOKEN va chat_id orqali Telegramga test xabar yuboradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "chat_id",
            nargs="?",
            default=(
                os.environ.get("TELEGRAM_TEST_CHAT_ID", "").strip()
                or os.environ.get("NEXT_PUBLIC_TELEGRAM_CHAT_ID", "").strip()
            ),
            help="Guruh yoki shaxsiy chat id (masalan -1003733316489)",
        )

    def handle(self, *args, **options):
        token = (getattr(settings, "TELEGRAM_BOT_TOKEN", None) or "").strip()
        chat_id = (options.get("chat_id") or "").strip()

        if not token:
            self.stderr.write(
                self.style.ERROR(
                    "TELEGRAM_BOT_TOKEN yo'q. ahlanApi/.env ga qo'shing yoki Gunicorn systemd "
                    "EnvironmentFile da export qiling, keyin backendni qayta ishga tushiring."
                )
            )
            return
        if not chat_id:
            self.stderr.write(
                self.style.ERROR(
                    "chat_id kerak. Masalan:\n"
                    "  python manage.py telegram_test -1003733316489\n"
                    "yoki TELEGRAM_TEST_CHAT_ID muhit o'zgaruvchisi."
                )
            )
            return

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        try:
            r = requests.post(
                url,
                json={"chat_id": chat_id, "text": "Ahlan House — Telegram test: ulanish OK."},
                timeout=20,
            )
            data = r.json()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Tarmoq xatosi: {e}"))
            return

        if isinstance(data, dict) and data.get("ok"):
            self.stdout.write(self.style.SUCCESS("OK: xabar Telegramga yetib bordi."))
            return

        desc = (data or {}).get("description", str(data)) if isinstance(data, dict) else str(data)
        code = (data or {}).get("error_code") if isinstance(data, dict) else None
        self.stderr.write(self.style.ERROR(f"Telegram rad etdi: {desc}" + (f" (kod {code})" if code else "")))
        self.stderr.write(
            "Tekshiring: 1) Bot guruhga qo'shilganmi 2) chat_id to'g'rimi 3) token BotFather dagi botga tegishlimi."
        )
