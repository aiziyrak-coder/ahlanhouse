#!/bin/bash
# Serverda yangilash: git pull, frontend build, restart
# Ishga tushirish: cd /var/www/ahlan && bash scripts/server-update.sh

set -e
cd /var/www/ahlan
echo "=== Git pull ==="
git pull origin main
echo "=== Frontend build ==="
cd ahlanHouse
npm run build
echo "=== Tayyor. Frontendni qayta ishga tushiring: npm start yoki nohup npm start & ==="
# Ixtiyoriy: avtomatik restart (eski processni to'xtatib yangisini ishga tushiradi)
if command -v pkill &>/dev/null; then
  pkill -f "node.*next" 2>/dev/null || true
  sleep 2
  nohup npm start > /tmp/frontend.log 2>&1 &
  echo "Frontend qayta ishga tushirildi (log: /tmp/frontend.log)"
fi
