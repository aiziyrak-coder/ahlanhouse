#!/usr/bin/env bash
# ahlan.uz / api.ahlan.uz 502 — upstream (3000, 8000) tiklash.
# Ishlatish: sudo bash deploy/fix-502-upstreams.sh
# (loyiha ildizidan yoki /var/www/ahlanhouse dan: bash deploy/fix-502-upstreams.sh)

set -euo pipefail
WWW="${WWW:-/var/www/ahlanhouse}"
BACK="$WWW/ahlanApi"
FRONT="$WWW/ahlanHouse"
LOGDIR="${LOGDIR:-/var/www}"

echo "=== 1. Hozirgi portlar ==="
ss -tlnp 2>/dev/null | grep -E ':3000|:8000' || echo "(3000 yoki 8000 ochiq emas)"

echo "=== 2. PM2 holati ==="
pm2 list 2>/dev/null || true

echo "=== 3. Frontend: .next borligi ==="
if [[ ! -f "$FRONT/.next/BUILD_ID" ]]; then
  echo "XATO: $FRONT/.next/BUILD_ID yo'q — avval: cd $FRONT && npm run build"
  exit 1
fi

echo "=== 4. Gunicorn (API 8000) qayta ishga tushirish ==="
pkill -f 'gunicorn.*ahlanApi' 2>/dev/null || true
sleep 2
cd "$BACK"
# shellcheck source=/dev/null
source venv/bin/activate
export TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
nohup gunicorn ahlanApi.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 2 \
  --chdir "$BACK" \
  --daemon \
  --access-logfile "$LOGDIR/gunicorn-access.log" \
  --error-logfile "$LOGDIR/gunicorn-error.log" \
  >/dev/null 2>&1
sleep 2
if ! ss -tlnp 2>/dev/null | grep -q ':8000'; then
  echo "XATO: 8000 ochilmadi. Oxirgi xato:"
  tail -n 40 "$LOGDIR/gunicorn-error.log" 2>/dev/null || true
  exit 1
fi
echo "OK: 8000 tinglayapti"

echo "=== 5. Next.js (PM2, 3000) ==="
cd "$FRONT"
if pm2 describe ahlan-house >/dev/null 2>&1; then
  pm2 restart ahlan-house --update-env
else
  NODE_ENV=production pm2 start server.js --name ahlan-house
fi
sleep 3
if ! ss -tlnp 2>/dev/null | grep -q ':3000'; then
  echo "XATO: 3000 ochilmadi. PM2 log:"
  pm2 logs ahlan-house --lines 30 --nostream 2>/dev/null || true
  exit 1
fi
echo "OK: 3000 tinglayapti"

echo "=== 6. Lokal tekshiruv ==="
curl -sS -o /dev/null -w "GET http://127.0.0.1:3000/login → HTTP %{http_code}\n" http://127.0.0.1:3000/login || true
curl -sS -o /dev/null -w "GET http://127.0.0.1:8000/ → HTTP %{http_code}\n" http://127.0.0.1:8000/ || true

echo "=== 7. Nginx (ixtiyoriy) ==="
if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx && echo "Nginx reload OK" || echo "nginx -t xato — qo'lda tekshiring"
fi

echo "=== Tugadi. Brauzerda HTTPS ni qayta oching. ==="
