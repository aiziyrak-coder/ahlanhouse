#!/usr/bin/env python3
"""Baza (db.sqlite3) yuklaganingizdan keyin serverni backend ni qayta ishga tushirish.
Ishlatish: python deploy/restart-backend-after-db.py"""
import paramiko
import os

HOST = "64.226.109.56"
USER = os.environ.get("DEPLOY_SSH_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "Ahadjon77House")
BACKEND = "/var/www/ahlanhouse/ahlanApi"
WWW = "/var/www"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    try:
        ssh.exec_command("pkill -f 'gunicorn.*ahlanApi' 2>/dev/null; sleep 1")
        ssh.exec_command(
            f"cd {BACKEND} && source venv/bin/activate && nohup gunicorn ahlanApi.wsgi:application "
            f"--bind 0.0.0.0:8000 --workers 2 --daemon "
            f"--access-logfile {WWW}/gunicorn-access.log --error-logfile {WWW}/gunicorn-error.log >/dev/null 2>&1 &"
        )
        print("Gunicorn qayta ishga tushirildi. Endi saytda yangilab (Ctrl+F5) tekshiring.")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
