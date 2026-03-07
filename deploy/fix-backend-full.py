#!/usr/bin/env python3
"""
Backend va api.ahlan.uz ni to'liq tekshirish va tuzatish.
Ishlatish: python deploy/fix-backend-full.py
"""
import os
import sys
import time
import paramiko

HOST = "64.226.109.56"
USER = os.environ.get("DEPLOY_SSH_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "Ahadjon77House")
WWW = "/var/www"
PROJECT = f"{WWW}/ahlanhouse"
BACKEND = f"{PROJECT}/ahlanApi"

def run(ssh, cmd, check=False):
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=False)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip())
    if err and code != 0:
        print(err.rstrip(), file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Exit {code}: {cmd[:80]}")
    return code, out, err

def main():
    print("=== SSH ulanish ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=25)
    try:
        print("\n=== 1. /var/www tarkibi ===")
        run(ssh, f"ls -la {WWW}/")

        print("\n=== 2. Port 8000 da kim ishlayapti ===")
        run(ssh, "ss -tlnp 2>/dev/null | grep 8000; lsof -i :8000 2>/dev/null || true")

        print("\n=== 3. Nginx api.ahlan.uz konfigi (to'liq) ===")
        run(ssh, "grep -l 'api.ahlan' /etc/nginx/sites-enabled/* 2>/dev/null; cat /etc/nginx/sites-available/api.ahlan.uz 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null | head -80")

        print("\n=== 4. Gunicorn to'xtatish ===")
        run(ssh, "pkill -9 -f gunicorn 2>/dev/null; sleep 2; ss -tlnp | grep 8000 || echo Port_8000_bosh")

        print("\n=== 5. Loyiha va demo user ===")
        run(ssh, f"cd {PROJECT} && git pull origin main 2>/dev/null || true")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && pip install -q -r requirements.txt 2>/dev/null")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py migrate --noinput 2>/dev/null")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py create_sotuv_demo_user 2>/dev/null")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py collectstatic --noinput --clear 2>/dev/null || true")

        print("\n=== 6. Gunicorn ishga tushirish (faqat ahlanhouse/ahlanApi) ===")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && nohup gunicorn ahlanApi.wsgi:application --bind 0.0.0.0:8000 --workers 2 --daemon --access-logfile {WWW}/gunicorn-access.log --error-logfile {WWW}/gunicorn-error.log --chdir {BACKEND} >/dev/null 2>&1 &")
        time.sleep(3)
        run(ssh, "ss -tlnp | grep 8000")

        print("\n=== 7. Lokal test: POST 127.0.0.1:8000/api/v1/login/ ===")
        run(ssh, f"curl -s -w '\\nHTTP:%{{http_code}}' -X POST http://127.0.0.1:8000/api/v1/login/ -H 'Content-Type: application/json' -d '{{\"phone_number\":\"+998907863888\",\"password\":\"3888\"}}'")

        print("\n=== 8. Tashqi test: POST https://api.ahlan.uz/api/v1/login/ ===")
        run(ssh, "curl -sk -w '\\nHTTP:%{http_code}' -X POST https://api.ahlan.uz/api/v1/login/ -H 'Content-Type: application/json' -d '{\"phone_number\":\"+998907863888\",\"password\":\"3888\"}'")

        print("\n=== 9. Nginx api.ahlan.uz (static path to'g'rilash) ===")
        run(ssh, f"cp {PROJECT}/deploy/nginx-api.ahlan.uz.conf /etc/nginx/sites-available/api.ahlan.uz 2>/dev/null || true", check=False)
        print("\n=== 10. Nginx reload ===")
        run(ssh, "nginx -t 2>&1 && systemctl reload nginx 2>&1 || true")

        print("\n=== Tugadi ===")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
