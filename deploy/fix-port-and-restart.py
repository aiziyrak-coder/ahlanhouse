"""Port 3000 ni bo'shatish va PM2 ni qayta ishga tushirish (eski next-server o'lishi uchun)."""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("64.226.109.56", username="root", password="Ahadjon77House", timeout=15)

# Port 3000 ni bo'shatish (eski next-server o'lishi uchun)
ssh.exec_command("pkill -f 'next-server' 2>/dev/null; sleep 2; (lsof -ti:3000 | xargs -r kill -9) 2>/dev/null; sleep 1")
# PM2 da ahlan-house ni o'chirib qayta ishga tushirish
ssh.exec_command("cd /var/www/ahlanhouse/ahlanHouse && pm2 delete ahlan-house 2>/dev/null; sleep 1; pm2 start npm --name ahlan-house -- start")
ssh.exec_command("sleep 3; pm2 save")
# Tekshirish: yangi HTML da yangi CSS link bormi
stdin, stdout, stderr = ssh.exec_command(
    "sleep 2; curl -s http://127.0.0.1:3000/login 2>/dev/null | grep -o 'href=\"[^\"]*\.css\"' | head -1"
)
out = stdout.read().decode(errors="replace").strip()
print("Yangi HTML dagi CSS link:", out[:80] if out else "(yo'q)")
# Bu CSS fayl bormi
if out:
    import re
    m = re.search(r'href="([^"]+)"', out)
    if m:
        path = m.group(1).split("?")[0]
        stdin, stdout, stderr = ssh.exec_command(
            f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3000{path}"
        )
        print("CSS HTTP status:", stdout.read().decode().strip())

ssh.close()
print("Tugadi. Endi https://ahlan.uz/login ni Ctrl+Shift+R bilan yangilang.")
