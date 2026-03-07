# Ahlan House CRM

Loyiha tarkibi:
- **ahlanApi** — Django REST API (backend)
- **ahlanHouse** — Next.js frontend

---

## GitHub orqali ishlash

**Repozitoriy:** https://github.com/aiziyrak-coder/ahlan

### Lokalda o'zgarishlardan keyin
```bash
git add .
git commit -m "Qisqacha tavsif"
git push origin main
```

### Serverna birinchi marta o'rnatish (yoki qayta clone)
```bash
# 1. Eski papkani o'chirish (agar bor bo'lsa)
# rm -rf ahlan   # Linux/Mac
# rmdir /s ahlan   # Windows

# 2. GitHub dan clone
git clone https://github.com/aiziyrak-coder/ahlan.git
cd ahlan
```

### Backend (Django) ishga tushirish
```bash
cd ahlanApi
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env ni tahrirlang: DJANGO_SECRET_KEY, DJANGO_DEBUG=False, DJANGO_ALLOWED_HOSTS=...
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend (Next.js) ishga tushirish
```bash
cd ahlanHouse
npm install
cp .env.example .env
# .env da NEXT_PUBLIC_API_URL va Telegram o'zgaruvchilarini to'ldiring
npm run build
npm start
# yoki ishlab chiqish: npm run dev
```

### Serverna yangi o'zgarishlarni olish
```bash
cd ahlan
git pull origin main
# Keyin backend/frontend ni qayta ishga tushiring
```
