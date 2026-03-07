import { startDailyReportScheduler, createReportMessage } from './app/lib/telegram/index.js';

// Server ishga tushgandan keyin Telegram xabarlarini yuborishni ishga tushirish
startDailyReportScheduler();

// Server ishga tushgandan keyin test uchun xabar yuborish
console.log('\n=== SERVER STARTED ===');
console.log('Telegram xabarlarini yuborish ishga tushdi');
console.log('Konsolga chiqariladigan xabarlar:');

// Har kuni 12:00 soatda ma'lumotlarni olib xabar yuborish
const scheduleDailyReport = () => {
  const now = new Date();
  const nextReportTime = new Date(now);
  
  // Agar hozirgi vaqt 12:00 dan keyin bo'lsa, keyingi kuni 12:00 soatda ishga tushirish
  if (now.getHours() >= 12) {
    nextReportTime.setDate(nextReportTime.getDate() + 1);
  }
  
  nextReportTime.setHours(12, 0, 0, 0);
  
  const millisecondsUntilNextReport = nextReportTime.getTime() - now.getTime();
  
  // 12:00 soatda ma'lumotlarni olib xabar yuborish
  setTimeout(async () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.ahlan.uz/api/v1').replace(/\/$/, '');
      // API ma'lumotlarini olish (backend da mavjud endpointlar ishlatiladi)
      const [debtors, apartments, payments, expenses] = await Promise.all([
        fetch(`${apiBase}/user-payments/?page_size=1`).catch(() => ({ ok: false, json: () => ({ count: 0 }) })),
        fetch(`${apiBase}/apartments/?page_size=1`).catch(() => ({ ok: false, json: () => ({ results: [] }) })),
        fetch(`${apiBase}/payments/statistics/`).catch(() => ({ ok: false, json: () => ({}) })),
        fetch(`${apiBase}/expenses/?page_size=1`).catch(() => ({ ok: false, json: () => ({ results: [] }) }))
      ]);

      const [debtorsData, apartmentsData, paymentsData, expensesData] = await Promise.all([
        debtors.ok ? debtors.json() : { count: 0 },
        apartments.ok ? apartments.json() : { results: [] },
        payments.ok ? payments.json() : {},
        expenses.ok ? expenses.json() : { results: [] }
      ]);

      // API ma'lumotlarini konsolga chiqarish
      console.log('\n=== DAILY REPORT ===');
      console.log('=== API DATA ===');
      console.log('Debtors:', debtorsData);
      console.log('Apartments:', apartmentsData);
      console.log('Payments:', paymentsData);
      console.log('Expenses:', expensesData);

      const reportData = {
        debtors: debtorsData,
        apartments: apartmentsData,
        payments: paymentsData,
        expenses: expensesData
      };
      
      const reportMessage = createReportMessage(reportData);
      
      // Xabarni konsolga chiqarish
      console.log('\n=== FINAL DAILY REPORT ===');
      console.log(reportMessage);
      console.log('=======================\n');
      
      // Keyingi kuni 12:00 soatda qayta ishga tushirish
      scheduleDailyReport();
      
    } catch (error) {
      console.error('Xatolik yuz berdi:', error);
      // Agar xatolik yuz bersa, keyingi kuni 12:00 soatda qayta ishga tushirish
      scheduleDailyReport();
    }
  }, millisecondsUntilNextReport);
};

// Server ishga tushgandan keyin 12:00 soatda ishga tushirish
scheduleDailyReport();

// Server ishga tushgandan keyin qo'shimcha xabarlar
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const telegramChatIds = (process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '-1003733316489').split(',').map((id) => id.trim()).filter(Boolean);
console.log('\n=== SERVER CONFIGURATION ===');
console.log('Telegram configured:', !!telegramToken, 'Chat IDs count:', telegramChatIds.length);
console.log('==========================\n');
