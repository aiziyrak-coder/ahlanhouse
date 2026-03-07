#!/bin/bash
# =============================================================================
# Ahlan House — Master Deployment Script (DigitalOcean server)
# MobaXterm yoki SSH orqali serverga ulaning va skriptni ishga tushiring.
# Ishga tushirish: chmod +x master-deploy.sh && ./master-deploy.sh
# =============================================================================

set -e
REPO_URL="https://github.com/aiziyrak-coder/ahlanhouse.git"
WWW_DIR="/var/www"
PROJECT_DIR="$WWW_DIR/ahlanhouse"
BACKEND_DIR="$PROJECT_DIR/ahlanApi"
FRONTEND_DIR="$PROJECT_DIR/ahlanHouse"

echo "=============================================="
echo "  Ahlan House — Master Deploy"
echo "=============================================="

# 1. /var/www/ ichidagi hamma narsani o'chirish
echo "[1/7] /var/www/ tozalanmoqda..."
sudo rm -rf "$WWW_DIR"/*
sudo mkdir -p "$WWW_DIR"
cd "$WWW_DIR"

# 2. GitHub'dan loyihani clone qilish
echo "[2/7] GitHub'dan clone qilinmoqda..."
sudo git clone "$REPO_URL" "$PROJECT_DIR"
sudo chown -R "$USER:$USER" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 3. Backend — virtual muhit va kutubxonalar
echo "[3/7] Backend (Django) sozlanmoqda..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# .env mavjud bo'lmasa, example'dan nusxalash (keyin tahrirlashingiz kerak)
if [ ! -f .env ]; then
  [ -f .env.example ] && cp .env.example .env && echo "    .env yaratildi (.env.example dan). Tahrirlang!"
fi

# Migrate (db.sqlite3 WinSCP orqali qo'yilgan bo'lishi kerak)
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear 2>/dev/null || true

deactivate
cd "$PROJECT_DIR"

# 4. Frontend — npm install va build
echo "[4/7] Frontend (Next.js) build qilinmoqda..."
cd "$FRONTEND_DIR"
npm install
npm run build

# .env mavjud bo'lmasa
if [ ! -f .env ]; then
  [ -f .env.example ] && cp .env.example .env && echo "    .env yaratildi (.env.example dan). Tahrirlang!"
fi

cd "$PROJECT_DIR"

# 5. Eski processlarni to'xtatish (agar bor bo'lsa)
echo "[5/7] Eski processlar to'xtatilmoqda..."
pm2 delete ahlan-house 2>/dev/null || true
pm2 delete ahlan-api 2>/dev/null || true
pkill -f "gunicorn.*ahlanApi" 2>/dev/null || true

# 6. Gunicorn orqali Django ishga tushirish
echo "[6/7] Backend (Gunicorn) ishga tushirilmoqda..."
cd "$BACKEND_DIR"
source venv/bin/activate
gunicorn ahlanApi.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --threads 2 \
  --daemon \
  --access-logfile "$WWW_DIR/gunicorn-access.log" \
  --error-logfile "$WWW_DIR/gunicorn-error.log"
deactivate
cd "$PROJECT_DIR"

# 7. PM2 orqali Next.js ishga tushirish
echo "[7/7] Frontend (PM2) ishga tushirilmoqda..."
cd "$FRONTEND_DIR"
pm2 start npm --name "ahlan-house" -- start
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "=============================================="
echo "  Deploy tugadi."
echo "  Backend:  http://SERVER_IP:8000"
echo "  Frontend: http://SERVER_IP:3000"
echo "  PM2: pm2 status | pm2 logs ahlan-house"
echo "  Gunicorn log: $WWW_DIR/gunicorn-*.log"
echo "=============================================="
