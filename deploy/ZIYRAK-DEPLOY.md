# Ziyrak ovozli yordamchi — deploy qilishda API kalitlar

Ziyrak **Azure Speech Services** dan foydalanadi: ovozni matnga (STT) va matnni ovozga (TTS, o‘zbekcha Madina).

## Kerak bo‘ladigan API kalitlar

| O‘zgaruvchi | Qayerdan olinadi | Misol |
|-------------|------------------|--------|
| `NEXT_PUBLIC_AZURE_SPEECH_KEY` | Azure Portal → Speech resource → **Keys and endpoint** → Key 1 yoki Key 2 | `a1b2c3...` |
| `NEXT_PUBLIC_AZURE_SPEECH_REGION` | Xuddi shu sahifada **Region** (Location) | `swedencentral`, `eastus` va hokazo |

**Qisqacha:** Azure Portalda **Speech** resursini yarating (yoki mavjudini oching) → **Keys and endpoint** bo‘limida Key va Region ni ko‘chirib oling.

## Serverni ulab qanday o‘rnatiladi (avtomatik)

Kalitlar **GitHubga yuborilmaydi**. Loyihada `deploy/server-ziyrak.env` fayli (`.gitignore` da) mavjud — unda `NEXT_PUBLIC_AZURE_SPEECH_KEY` va `NEXT_PUBLIC_AZURE_SPEECH_REGION` yozilgan. `python deploy/run-deploy-remote.py` ishlaganda bu fayl o‘qiladi va qiymatlar **serverdagi** `ahlanHouse/.env` ga yoziladi, keyin `npm run build` shu kalitlardan foydalanadi.

**Qadamlar:**  
1. Lokal mashinada `deploy/server-ziyrak.env` bor va ichida key/region to‘g‘ri.  
2. `python deploy/run-deploy-remote.py` ni ishlating — pull, backend, frontend build, PM2 restart avtomatik, Ziyrak kalitlari ham serverga yoziladi.

Agar kalitni o‘zgartirmoqchi bo‘lsangiz — faqat lokal `deploy/server-ziyrak.env` ni tahrirlang (GitHubga commit qilmang).

## Xulosa

- **2 ta narsa kerak:** `NEXT_PUBLIC_AZURE_SPEECH_KEY`, `NEXT_PUBLIC_AZURE_SPEECH_REGION`.
- **Qayerda:** serverdagi frontend papkasidagi `.env` (build dan oldin).
- Keylarni yuborganingizdan keyin ularni shu `.env` ga qo‘yib, qayta deploy (build) qilsangiz Ziyrak deploy muhitida ham ishlaydi.
