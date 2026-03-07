#!/usr/bin/env python3
"""SSH orqali serverga ulanish va deploy/pull qilish. Ishlatish: python deploy/run-deploy-remote.py
Parolni xavfsiz saqlash: set DEPLOY_SSH_PASSWORD=your_password (yoki .env dan o'qishingiz mumkin)
TELEGRAM_BOT_TOKEN: ahlanApi/.env da yoki muhitda (serverda Gunicorn uchun yuboriladi)."""
import os
import sys
import paramiko

# Lokal ahlanApi/.env dan TELEGRAM_BOT_TOKEN o'qish (deploy vaqtida serverga yuboriladi)
def _load_local_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", "ahlanApi", ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip().strip("'\"").strip()
                if k == "TELEGRAM_BOT_TOKEN" and v:
                    os.environ.setdefault("TELEGRAM_BOT_TOKEN", v)
                    break

_load_local_env()

HOST = "64.226.109.56"
USER = os.environ.get("DEPLOY_SSH_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "Ahadjon77House")
REPO = "https://github.com/aiziyrak-coder/ahlanhouse.git"
WWW = "/var/www"
PROJECT = f"{WWW}/ahlanhouse"
BACKEND = f"{PROJECT}/ahlanApi"
FRONTEND = f"{PROJECT}/ahlanHouse"

def run(ssh, cmd, check=True):
    print(f"  $ {cmd[:80]}{'...' if len(cmd) > 80 else ''}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=False)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        try:
            print(out)
        except UnicodeEncodeError:
            print(out.encode("ascii", errors="replace").decode("ascii"))
    if err and code != 0:
        try:
            print(err, file=sys.stderr)
        except UnicodeEncodeError:
            print(err.encode("ascii", errors="replace").decode("ascii"), file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Exit code {code}: {cmd[:60]}")
    return code, out, err

def main():
    print("SSH ulanish...", HOST)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    try:
        # Loyiha bormi?
        _, out, _ = run(ssh, f"[ -d '{PROJECT}' ] && echo YES || echo NO", check=False)
        exists = "YES" in out

        if not exists:
            print("\n[1] Loyiha yo'q — to'liq deploy.")
            run(ssh, f"sudo rm -rf {WWW}/* 2>/dev/null; sudo mkdir -p {WWW}")
            run(ssh, f"sudo git clone {REPO} {PROJECT}")
            run(ssh, f"sudo chown -R $USER:$USER {PROJECT}")
        else:
            print("\n[1] Loyiha bor — git pull.")
            run(ssh, f"cd {PROJECT} && git pull origin main")

        print("\n[2] Backend (Django).")
        run(ssh, f"cd {BACKEND} && python3 -m venv venv 2>/dev/null; true")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && pip install -q -r requirements.txt")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py migrate --noinput")
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py create_sotuv_demo_user", check=False)
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && python manage.py collectstatic --noinput --clear 2>/dev/null; true")

        print("\n[3] Frontend (Next.js).")
        run(ssh, f"cd {FRONTEND} && npm install --legacy-peer-deps", check=True)
        run(ssh, f"cd {FRONTEND} && rm -rf .next node_modules/.cache && npm run build")

        print("\n[4] Gunicorn + PM2 qayta ishga tushirish.")
        run(ssh, f"pkill -f 'gunicorn.*ahlanApi' 2>/dev/null; true", check=False)
        token = (os.environ.get("TELEGRAM_BOT_TOKEN") or "").replace("'", "'\"'\"'")
        export_tg = f"export TELEGRAM_BOT_TOKEN='{token}'; " if token else ""
        run(ssh, f"cd {BACKEND} && source venv/bin/activate && {export_tg}nohup gunicorn ahlanApi.wsgi:application --bind 0.0.0.0:8000 --workers 2 --daemon --access-logfile {WWW}/gunicorn-access.log --error-logfile {WWW}/gunicorn-error.log >/dev/null 2>&1 &", check=False)
        run(ssh, f"cd {FRONTEND} && (pm2 delete ahlan-house 2>/dev/null; true); sleep 1; pm2 start npm --name ahlan-house -- start", check=False)
        run(ssh, "pm2 save 2>/dev/null; true", check=False)

        print("\n[5] Nginx (api.ahlan.uz + ahlan.uz).")
        run(ssh, f"cp {PROJECT}/deploy/nginx-api.ahlan.uz.conf /etc/nginx/sites-available/api.ahlan.uz 2>/dev/null; true", check=False)
        run(ssh, f"cp {PROJECT}/deploy/nginx-ahlan.conf /etc/nginx/sites-available/ahlan 2>/dev/null; true", check=False)
        run(ssh, "ln -sf /etc/nginx/sites-available/ahlan /etc/nginx/sites-enabled/ahlan 2>/dev/null; true", check=False)
        run(ssh, "nginx -t 2>&1 && systemctl reload nginx 2>&1 || true", check=False)

        print("\nTugadi. Backend :8000, Frontend PM2 (ahlan-house). ahlan.uz: _next/static diskdan, HTML no-cache.")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
