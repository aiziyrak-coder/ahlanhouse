"""Serverda: PM2 restart va Nginx config (X-Forwarded-Proto) yangilash."""
import paramiko

HOST = "64.226.109.56"
USER = "root"
PASSWORD = "Ahadjon77House"

nginx_conf = r"""server {
    server_name ahlan.uz www.ahlan.uz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ahlan.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ahlan.uz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = ahlan.uz) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name ahlan.uz www.ahlan.uz;
    return 404;
}
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)

# PM2 restart
ssh.exec_command("cd /var/www/ahlanhouse/ahlanHouse && pm2 restart ahlan-house")
print("PM2 restart: done")

# Nginx: faqat X-Forwarded-* qo'shilgan bo'lsa yangilaymiz
stdin, stdout, stderr = ssh.exec_command("grep -c X-Forwarded-Proto /etc/nginx/sites-available/ahlan.uz")
n = stdout.read().decode().strip()
if n == "0" or not n:
    sftp = ssh.open_sftp()
    with sftp.file("/etc/nginx/sites-available/ahlan.uz", "w") as f:
        f.write(nginx_conf)
    sftp.close()
    ssh.exec_command("nginx -t && systemctl reload nginx")
    print("Nginx config updated and reloaded")
else:
    print("Nginx already has X-Forwarded-Proto")

ssh.close()
print("Done. Try https://ahlan.uz/login with Ctrl+Shift+R")
