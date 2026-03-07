"""Backend (Django login) va api.ahlan.uz ni tekshirish."""
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("64.226.109.56", username="root", password="Ahadjon77House", timeout=15)

# Gunicorn ishlayaptimi (8000)
stdin, stdout, stderr = ssh.exec_command("ss -tlnp 2>/dev/null | grep 8000")
port8000 = stdout.read().decode().strip()
print("Port 8000:", port8000[:200] if port8000 else "bo'sh")

# 1) Noto'g'ri parol — 401 (backend javob beradi)
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -w '\\nHTTP_CODE:%{http_code}' -X POST http://127.0.0.1:8000/api/v1/login/ -H 'Content-Type: application/json' -d '{\"phone_number\":\"+998901234567\",\"password\":\"wrong\"}'"
)
out = stdout.read().decode().strip()
print("Backend (wrong pass):", out[:350])

# 2) To'g'ri demo +998907863888 / 3888 — 200 bo'lishi kerak
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -w '\\nHTTP_CODE:%{http_code}' -X POST http://127.0.0.1:8000/api/v1/login/ -H 'Content-Type: application/json' -d '{\"phone_number\":\"+998907863888\",\"password\":\"3888\"}'"
)
out2 = stdout.read().decode().strip()
code = "401"
if "HTTP_CODE:" in out2:
    code = out2.split("HTTP_CODE:")[-1].strip()
print("Backend (demo user +998907863888 / 3888) HTTP:", code, "— access token bor:" if code == "200" and "access" in out2 else "")
if code != "200":
    print("Javob:", out2[:400])

# api.ahlan.uz Nginx config
stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/api.ahlan.uz 2>/dev/null | head -25")
print("Nginx api.ahlan.uz config:\n", stdout.read().decode(errors="replace").strip()[:600])

ssh.close()
