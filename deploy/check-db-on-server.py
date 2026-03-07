#!/usr/bin/env python3
"""Serverni bazadagi yozuvlar sonini tekshirish. db.sqlite3 to'g'ri joyda va ma'lumot bormi."""
import paramiko

HOST = "64.226.109.56"
USER = "root"
PASSWORD = "Ahadjon77House"
BACKEND = "/var/www/ahlanhouse/ahlanApi"

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    return stdout.channel.recv_exit_status(), out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    try:
        db = f"{BACKEND}/db.sqlite3"
        # Baza fayli bormi, hajmi
        code, out, _ = run(ssh, f"ls -la {db} 2>/dev/null || echo 'Fayl yoq'")
        print("db.sqlite3:", out.strip())
        # Django manage.py shell orqali hisoblash
        cmd = f"cd {BACKEND} && source venv/bin/activate && python -c \""
        cmd += "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE','ahlanApi.settings'); django.setup(); "
        cmd += "from all.models import User, Apartment, Object, Payment, Expense; "
        cmd += "print('Foydalanuvchilar:', User.objects.count()); "
        cmd += "print('Uylar:', Apartment.objects.count()); "
        cmd += "print('Obyektlar:', Object.objects.count()); "
        cmd += "print('Payments:', Payment.objects.count()); "
        cmd += "print('Xarajatlar:', Expense.objects.count()); "
        cmd += "\""
        code, out, err = run(ssh, cmd)
        print("\nBazadagi yozuvlar:")
        print(out.strip() if out.strip() else err.strip())
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
