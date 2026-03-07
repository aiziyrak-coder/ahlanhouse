# db.sqlite3 ni serverga yuklash

## 1. Kompyuteringizda qaysi bazadan yuklaysiz?

- **To‘liq ma’lumot ko‘rinadigan baza** — loyihangizda `ahlanApi` papkasidagi **db.sqlite3**.
- Yo‘l (Windows): `D:\ahlan_for_cursor\ahlanApi\db.sqlite3`
- Avval kompyuteringizda dasturni ishga tushirib, ma’lumotlar (uylar, to‘lovlar va h.k.) ko‘rinishini tekshiring. Faqat shu faylni serverga yuklang.

## 2. Serverda aniq qayerga yuklash

- **Aniq yo‘l:** `/var/www/ahlanhouse/ahlanApi/db.sqlite3`
- **WinSCP:** Serverga ulaning (64.226.109.56, root, parol), o‘ng tomonda `/var/www/ahlanhouse/ahlanApi/` papkasini oching. Chap tomondan kompyuteringizdagi `ahlanApi/db.sqlite3` ni shu papkaga **sürükle-yubor** qiling va **mavjud faylni almashtirish** (replace) ni tasdiqlang.

## 3. Yuklagandan keyin majburiy qadam

Baza faylini almashtirgandan keyin **Gunicorn ni qayta ishga tushirish** kerak, aks holda eski baza xotirada qoladi.

Serverda (SSH yoki MobaXterm) bajariladigan buyruqlar:

```bash
pkill -f 'gunicorn.*ahlanApi'
cd /var/www/ahlanhouse/ahlanApi && source venv/bin/activate && nohup gunicorn ahlanApi.wsgi:application --bind 0.0.0.0:8000 --workers 2 --daemon --access-logfile /var/www/gunicorn-access.log --error-logfile /var/www/gunicorn-error.log
```

Yoki loyihada: `python deploy/run-deploy-remote.py` — u pull, migrate, **bazani o‘zgartirmaydi**, faqat Gunicorn ni restart qiladi. Baza yuklashingizni **restart dan oldin** qilishingiz kerak.

## 4. Tekshirish

- Saytda qayta login qiling (Ctrl+F5 bilan yangilab).
- Agar ma’lumotlar yo‘q bo‘lsa: brauzerda **F12 → Network** oching, sahifa yuklanganda qaysi API so‘rovlari ketayotganini va ularning javobini (200/401, body) ko‘ring.
