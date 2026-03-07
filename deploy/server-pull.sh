#!/bin/bash
# Serverni ichida ishlatish uchun: loyihani GitHub'dan yangilash (git pull)
# Ulanish: ssh root@64.226.109.56  yoki  ssh ubuntu@64.226.109.56
# Parolni so'raganda kiriting, keyin: chmod +x server-pull.sh && ./server-pull.sh

set -e
PROJECT_DIR="/var/www/ahlanhouse"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Papka topilmadi: $PROJECT_DIR"
  echo "Avval master-deploy.sh ni ishga tushiring (yoki to'g'ri yo'lni o'zgartiring)."
  exit 1
fi

cd "$PROJECT_DIR"
echo "Git pull (origin main)..."
git pull origin main

echo "Backend: migrate va static..."
cd "$PROJECT_DIR/ahlanApi"
source venv/bin/activate 2>/dev/null || true
[ -d venv ] && source venv/bin/activate
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear 2>/dev/null || true
deactivate 2>/dev/null || true

echo "Frontend: npm install va build..."
cd "$PROJECT_DIR/ahlanHouse"
npm install
npm run build

echo "Qayta ishga tushirish: Gunicorn + PM2..."
pkill -f "gunicorn.*ahlanApi" 2>/dev/null || true
cd "$PROJECT_DIR/ahlanApi"
source venv/bin/activate
gunicorn ahlanApi.wsgi:application --bind 0.0.0.0:8000 --workers 2 --daemon \
  --access-logfile /var/www/gunicorn-access.log --error-logfile /var/www/gunicorn-error.log
deactivate

cd "$PROJECT_DIR/ahlanHouse"
pm2 restart ahlan-house 2>/dev/null || pm2 start npm --name "ahlan-house" -- start
pm2 save

echo "Tugadi. Yangi kod ishga tushdi."
