# Ahlan House — GitHub va DigitalOcean deploy qilish

**Server:** `64.226.109.56` (DigitalOcean)

## 1. Git sozlash va GitHub'ga yuborish (lokal kompyuteringizda)

Loyiha papkasida (masalan `D:\ahlan_for_cursor`) quyidagi buyruqlarni bajarishingiz kerak.

### 1.1 Eski .git o‘chirish va yangi repo

**Windows (PowerShell):**
```powershell
cd D:\ahlan_for_cursor
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git branch -M main
```

**Yoki CMD:**
```cmd
cd D:\ahlan_for_cursor
rmdir /s /q .git
git init
git branch -M main
```

### 1.2 .gitignore

Loyihada `.gitignore` allaqachon mavjud. Unda quyidagilar bor (GitHub'ga yuborilmaydi):

- `node_modules/`
- `.next/`
- `venv/`, `.venv/`, `env/`
- `__pycache__/`
- `db.sqlite3`, `*.sqlite3`, `*.db`
- `.env`, `.env.local`
- `media/`, `staticfiles/`

### 1.3 Birinchi commit va GitHub'ga push

```bash
git add .
git status
git commit -m "Initial commit: Ahlan House CRM"
git remote add origin https://github.com/aiziyrak-coder/ahlanhouse.git
git push -u origin main
```

Agar repo allaqachon mavjud va ichida boshqa commit'lar bo‘lsa, avval `git pull origin main --allow-unrelated-histories` qilib, keyin `git push origin main` qilishingiz mumkin. Yoki repo bo‘sh bo‘lsa, yuqoridagi ketma-ketlik yetarli.

---

## 2. Serverda deploy (DigitalOcean + MobaXterm)

### 2.1 Tayyorgarlik

Serverni ulang (MobaXterm yoki SSH). Quyidagilar o‘rnatilgan bo‘lishi kerak:

- Git
- Python 3
- Node.js (LTS) va npm
- PM2: `npm install -g pm2`

### 2.2 Serverni ulash va pull qilish

**MobaXterm yoki SSH orqali ulanish:**
```bash
ssh root@64.226.109.56
```
(yoki `ubuntu@64.226.109.56` — serverda qaysi foydalanuvchi borligiga qarab). Parol so‘ralsa kiriting.

**Faqat yangi kodni tortish (loyiha allaqachon clone qilingan bo‘lsa):**  
`deploy/server-pull.sh` faylini serverni `~` papkasiga nusxalang, keyin:
```bash
chmod +x ~/server-pull.sh
~/server-pull.sh
```
Skript: `git pull`, backend migrate/build, frontend build, Gunicorn va PM2 ni qayta ishga tushiradi.

**Yoki qo‘lda:**
```bash
cd /var/www/ahlanhouse
git pull origin main
# Keyin backend: cd ahlanApi && source venv/bin/activate && python manage.py migrate && ...
# Frontend: cd ahlanHouse && npm install && npm run build && pm2 restart ahlan-house
```

### 2.3 Master Scriptni ishga tushirish (birinchi marta deploy)

**Birinchi marta:** Loyihani GitHub'ga push qilgach, `deploy/master-deploy.sh` faylini WinSCP orqali serverni istalgan joyiga (masalan foydalanuvchi uy papkasi `~`) nusxalang. Masalan: `C:\...\ahlan_for_cursor\deploy\master-deploy.sh` → serverda `~/master-deploy.sh`.

Keyin MobaXterm (yoki SSH) da:

```bash
chmod +x ~/master-deploy.sh
~/master-deploy.sh
```

Skript quyidagilarni bajaradi:

1. `/var/www/` ichidagi hamma narsani o‘chiradi.
2. `https://github.com/aiziyrak-coder/ahlanhouse.git` dan loyihani clone qiladi.
3. Backend: `ahlanApi` da `venv` yaratadi, `pip install -r requirements.txt`, `migrate`, `collectstatic`.
4. Frontend: `ahlanHouse` da `npm install`, `npm run build`.
5. Eski Gunicorn/PM2 processlarni to‘xtatadi.
6. Gunicorn orqali Django’ni `0.0.0.0:8000` da ishga tushiradi.
7. PM2 orqali Next.js’ni `ahlan-house` nomi bilan ishga tushiradi.

### 2.3 Serverda .env

- **Backend:** `ahlanApi/.env` — `cp ahlanApi/.env.example ahlanApi/.env` qilib, kerakli o‘zgaruvchilarni (masalan `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`) tahrirlang.
- **Frontend:** `ahlanHouse/.env` — `NEXT_PUBLIC_API_URL` va boshqa o‘zgaruvchilarni server manziliga moslang.

---

## 3. Ma’lumotlar bazasi — db.sqlite3 qayerga qo‘yiladi (WinSCP)

Django loyihasi `db.sqlite3` faylini **backend papkasi** ichida kutadi.

**Aniq yo‘l (serverni clone qilgandan keyin):**

```
/var/www/ahlanhouse/ahlanApi/db.sqlite3
```

**WinSCP orqali:**

1. WinSCP da serverni ulang.
2. Chap tomonda lokal kompyuteringizda `db.sqlite3` faylini tanlang (lokal loyihadan: `ahlanApi/db.sqlite3`).
3. O‘ng tomonda serverni oching va papkalarga o‘ting:
   - `var` → `www` → `ahlanhouse` → `ahlanApi`
4. `ahlanApi` papkasiga kirgach, `db.sqlite3` faylini shu papkaga yuklang (drag-and-drop yoki Upload).

**Muhim:**  
- Fayl nomi aniq **db.sqlite3** bo‘lishi kerak.  
- Agar serverda `ahlanhouse` papkasi hali bo‘lmasa, avval `master-deploy.sh` ni ishga tushiring, keyin WinSCP orqali `db.sqlite3` ni `/var/www/ahlanhouse/ahlanApi/` ga yuklang va kerak bo‘lsa `migrate` ni qayta ishga tushiring:  
  `cd /var/www/ahlanhouse/ahlanApi && source venv/bin/activate && python manage.py migrate`

---

## 4. Foydali buyruqlar

| Vazifa              | Buyruq |
|---------------------|--------|
| PM2 ro‘yxat        | `pm2 status` |
| Frontend log        | `pm2 logs ahlan-house` |
| Backend log         | `tail -f /var/www/gunicorn-error.log` |
| Backend qayta ishga tushirish | `cd /var/www/ahlanhouse/ahlanApi && source venv/bin/activate && pkill -f gunicorn; gunicorn ahlanApi.wsgi:application --bind 0.0.0.0:8000 --workers 2 --daemon` |
| Frontend qayta ishga tushirish | `pm2 restart ahlan-house` |

---

## 5. 502 Bad Gateway (ahlan.uz va api.ahlan.uz)

Nginx orqaga ulana olmaganda chiqadi: **127.0.0.1:3000** (Next.js / PM2) yoki **127.0.0.1:8000** (Gunicorn) ishlamayapti yoki build xato.

**Tezkor tiklash (serverda, loyiha ildizidan):**

```bash
cd /var/www/ahlanhouse
sudo bash deploy/fix-502-upstreams.sh
```

**Qo‘lda tekshiruv:**

```bash
ss -tlnp | grep -E '3000|8000'
curl -sI http://127.0.0.1:3000/login | head -1
curl -sI http://127.0.0.1:8000/ | head -1
sudo tail -30 /var/log/nginx/error.log
pm2 logs ahlan-house --lines 40
tail -40 /var/www/gunicorn-error.log
```

Agar **`.next/BUILD_ID` yo‘q** bo‘lsa, frontend build qiling: `cd /var/www/ahlanhouse/ahlanHouse && npm run build && pm2 restart ahlan-house`.

### Nginx: `conflicting server name "ahlan.uz" ... ignored`

` sites-enabled` da **ahlan.uz** uchun **ikki marta** konfig bo‘lsa, Nginx birini e’tiborsiz qiladi — noto‘g‘ri blok tanlanishi mumkin.

```bash
ls -la /etc/nginx/sites-enabled/
# faqat bitta `ahlan` (yoki `ahlan.uz`) qoldiring; dublikatni olib tashlang:
# sudo rm /etc/nginx/sites-enabled/DUBLIKAT_FAYL
sudo nginx -t && sudo systemctl reload nginx
```

### PM2: `Cannot remove headers after they are sent` (server.js:187+)

Bu xabar **oldingi** `server.js` (loader + `bufferAndInjectStripScript`) versiyasidan qolgan log bo‘lishi mumkin. Yangi `server.js` qisqa (~70 qator), bunday patch yo‘q.

Yangi loglarni ko‘rish: `pm2 flush` keyin `pm2 restart ahlan-house`, so‘ng `pm2 logs ahlan-house --lines 30`.

---

## 6. Telegram bot (bildirishnomalar “kelmayapti”)

Loyihada **alohida bot dasturi (PM2) yo‘q**: xabarlar **har safar** Django orqali `https://api.telegram.org/bot.../sendMessage` ga yuboriladi. Shuning uchun:

1. **Serverda** `TELEGRAM_BOT_TOKEN` bo‘lishi kerak: **`/var/www/ahlanhouse/ahlanApi/.env`** fayliga qator qo‘shing (`KEY=value`) — Django ishga tushganda avtomatik o‘qiladi; yoki `systemd` / Gunicorn `Environment=` orqali.
2. Frontend `NEXT_PUBLIC_TELEGRAM_CHAT_ID` (yoki kodda sukut) — **guruh yoki shaxsiy chat id**; bot ushbu chatga **xabar yubora oladigan** bo‘lishi kerak (guruhda bot **admin** yoki kamida a’zo).
3. Token yo‘q bo‘lsa API **`503`** qaytaradi: `Telegram bot token sozlanmagan.`
4. Telegram `{"ok": false}` qaytarsa endi API **`502`** bilan `detail` qaytaradi — brauzerda xato aniq ko‘rinadi.

**Token qo‘shish (`ahlanApi/.env`):**

```bash
nano /var/www/ahlanhouse/ahlanApi/.env
```

Pastga qator qo‘shing (o‘z tokeningiz):

```
TELEGRAM_BOT_TOKEN=123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Saqlang (`Ctrl+O`, Enter, `Ctrl+X`). Keyin test:

```bash
cd /var/www/ahlanhouse/ahlanApi
source venv/bin/activate
python manage.py telegram_test -1003733316489
```

Gunicorn ishlayotgan bo‘lsa, token yangilangach **backendni qayta ishga tushiring** (masalan `pkill -f gunicorn` va qayta `gunicorn ...` yoki `systemctl restart` — sizda qanday bo‘lsa).

Agar `.env`da token bor-yu `telegram_test` baribir «yo‘q» desa: muhitda **bo‘sh** `TELEGRAM_BOT_TOKEN` qolib ketgan bo‘lishi mumkin. Tekshiring: `env | grep TELEGRAM` — chiqsa `unset TELEGRAM_BOT_TOKEN`, so‘ng test. (Kod yangilanishi: bo‘sh muhit o‘zgaruvchisida `.env` qiymati endi ishlatiladi — `git pull`.)

**Tekshiruv (muhit o‘zidan, .envsiz):**

```bash
export TELEGRAM_BOT_TOKEN='123456:ABC-...'
python manage.py telegram_test -1003733316489
```

`OK: xabar Telegramga yetib bordi.` chiqsa — token va chat_id to‘g‘ri. Xato matni (masalan *bot was kicked*, *chat not found*) bo‘yicha Telegram sozlamalarini tuzating, keyin **Gunicornni qayta ishga tushiring** (token yangilangandan keyin).
