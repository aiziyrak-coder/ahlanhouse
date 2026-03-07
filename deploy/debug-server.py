"""Serverda /login HTML va CSS ni tekshirish."""
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("64.226.109.56", username="root", password="Ahadjon77House", timeout=15)

# HTML dan Demo va logo bor-yo'qligi
stdin, stdout, stderr = ssh.exec_command(
    "curl -s http://127.0.0.1:3000/login 2>/dev/null | head -c 4000"
)
html = stdout.read().decode(errors="replace")
has_demo = "Demo kirish" in html or "demo" in html.lower()
has_logo = "logo" in html.lower() or "/logo.png" in html
# CSS link
import re
css_match = re.search(r'href="(/_next/static/[^"]+\.css)"', html)
css_path = css_match.group(1) if css_match else None

print("HTML da 'Demo kirish':", has_demo)
print("HTML da logo/logo.png:", has_logo)
print("Birinchi CSS link:", css_path)

if css_path:
    stdin, stdout, stderr = ssh.exec_command(
        f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3000{css_path}"
    )
    code = stdout.read().decode().strip()
    print("CSS HTTP status:", code)
    # Fayl diskda bormi
    fn = css_path.split("?")[0].replace("/_next/static/", ".next/static/")
    stdin, stdout, stderr = ssh.exec_command(
        f"ls -la /var/www/ahlanhouse/ahlanHouse/{fn} 2>&1"
    )
    print("CSS fayl diskda:", stdout.read().decode(errors="replace").strip()[:200])

# Diskdagi barcha CSS chunk lar
stdin, stdout, stderr = ssh.exec_command(
    "ls /var/www/ahlanhouse/ahlanHouse/.next/static/chunks/*.css 2>/dev/null | head -10"
)
print("Diskdagi CSS fayllar:", stdout.read().decode(errors="replace").strip())

# Port 3000 da kim tinglayapti
stdin, stdout, stderr = ssh.exec_command(
    "ss -tlnp 2>/dev/null | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000"
)
print("Port 3000:", stdout.read().decode(errors="replace").strip()[:300])

# PM2 qaysi papkada ishlayapti
stdin, stdout, stderr = ssh.exec_command(
    "pm2 show ahlan-house 2>/dev/null | grep -E 'script path|cwd' || true"
)
print(stdout.read().decode(errors="replace").encode("ascii", errors="replace").decode("ascii"))

ssh.close()
