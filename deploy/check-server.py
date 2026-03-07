import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("64.226.109.56", username="root", password="Ahadjon77House", timeout=15)
stdin, stdout, stderr = ssh.exec_command(
    "ls /var/www/ahlanhouse/ahlanHouse/.next/static/chunks/*.css 2>/dev/null"
)
s = stdout.read().decode(errors="replace")
print(s.encode("ascii", errors="replace").decode("ascii"))
ssh.close()
