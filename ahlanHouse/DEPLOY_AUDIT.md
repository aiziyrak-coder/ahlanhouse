# Deploy oldidan umumiy audit — Ahlan Front

**Sana:** 2025  
**Build:** ✅ Muvaffaqiyatli (`npm run build`)

---

## 1. Tuzatilgan muhim nuqsonlar

### 1.1 Login
- **Token to‘liq emas:** Agar JWT da `user_type` yoki `fio` bo‘lmasa, endi foydalanuvchi bosh sahifaga yo‘naltirilmaydi; xato toast ko‘rsatiladi va `return` qilinadi.
- **Debug loglar:** `console.log` / `console.error` (Decoded Token, Saqlangan ma'lumotlar) olib tashlandi.

### 1.2 Sozlamalar (Settings)
- **Token kaliti:** `localStorage.getItem('token')` → `localStorage.getItem('access_token')` (tizim qolgan qismi bilan mos).
- **User ID:** Profil ma’lumotlari `userId` dan olinadi; login paytida JWT dan `user_id` olinib `localStorage.setItem("userId", ...)` qo‘shildi.
- **401 ishlovi:** Sozlamalar profil yuklashda 401 bo‘lsa token o‘chiriladi va `/login` ga yo‘naltiriladi.

### 1.3 Reserve (Band qilish / Shartnoma)
- **401 ishlovi:** Xonadon va mijozlar uchun fetch da 401 bo‘lsa token o‘chiriladi va `/login` ga yo‘naltiriladi.
- **Debug loglar:** Word shartnoma generatsiyasidagi `console.log` lar olib tashlandi.

### 1.4 Obyekt qo‘shish (Properties add)
- **401 ishlovi:** Catch da "Sessiya tugagan" / 401 bo‘lsa token o‘chiriladi va `/login` ga yo‘naltiriladi.
- **Debug loglar:** "Sending request to API", "Muvaffaqiyatli javob" loglari olib tashlandi.

### 1.5 Xonadon qo‘shish (Apartments add)
- **401 ishlovi:** POST javobi 401 bo‘lsa token o‘chiriladi va `/login` ga yo‘naltiriladi.

### 1.6 Chiqish (Logout)
- **To‘liq tozalash:** `access_token`, `refresh_token`, `user_type`, `user_fio`, `userId` barchasi o‘chiriladi va `/login` ga yo‘naltiriladi (`window.location.href = "/login"`).

---

## 2. Tekshirilgan va hozircha o‘zgartirilmagan

- **API URL:** Barcha sahifalar `getApiBaseUrl()` / `getApiRoot()` dan foydalanadi; `.env` da `NEXT_PUBLIC_API_URL` o‘rnatilishi kerak.
- **401 ishlovi:** Asosiy sahifalarda (apartments, payments, expenses, clients, documents, reports, suppliers, properties, qarzdorlar, page.tsx) 401 da `/login` ga yo‘naltirish yoki token o‘chirish mavjud.
- **Middleware:** Route himoyasi yo‘q; har bir sahifa o‘zida `access_token` tekshiradi yoki 401 da login ga yo‘naltiradi. Kelajakda `middleware.ts` orqali himoya qo‘shish mumkin.

---

## 3. Eslatmalar (deploy va keyingi yaxshilashlar)

1. **Login URL:** Hozir `getApiBaseUrl() + '/login/'` ishlatiladi (masalan `https://api.example.com/api/v1/login/`). Agar backend login ni boshqa joyda (masalan `/login/`) xizmat qilsa, `getApiRoot() + '/login/'` ga o‘zgartirish kerak.
2. **Demo parollar:** `create_demo_users` bilan yaratiladigan demo akkauntlar productionda o‘chirilishi yoki faqat test muhitida ishlatilishi tavsiya etiladi.
3. **Telegram:** `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` o‘rnatilgan sahifalar (apartments, expenses, qarzdorlar, suppliers, reserve, payments) xabar yuboradi; token bo‘lmasa so‘rovlar xato bermasligi uchun try/catch da tutilgan.
4. **Lint:** `next lint` loyiha katalogida ishlatilganda “Invalid project directory” xabari chiqishi mumkin; `package.json` dagi `lint` skripti va `next.config` tekshirilsin.
5. **User-nav:** Profil, sozlamalar va bildirishnomalar `/settings` ga yo‘naltiriladi.

---

## 4. Qisqacha

- Build muvaffaqiyatli, kritik auth/sozlamalar/reserve/properties add/apartments add va logout tuzatildi.
- 401 da login ga yo‘naltirish va token tozalash asosiy sahifalarda ishlaydi.
- Deploy dan oldin `.env` da `NEXT_PUBLIC_API_URL` (va kerak bo‘lsa Telegram) o‘rnatilganligini tekshiring.
