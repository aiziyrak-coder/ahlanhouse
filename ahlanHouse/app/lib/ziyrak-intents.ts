/**
 * Ziyrak — super kuchli ovozli yordamchi: nuqsonlarsiz platforma boshqaruvi.
 * Matn normalizatsiyasi, keng sinonimlar, kam "tushunmadim", barcha holatlar qoplanadi.
 */

/** Barcha apostrof variantlari (o' g' etc.) — regex uchun bir belgi */
const AP = "['\u2018\u2019`]";

export type ZiyrakQuery =
  | "greeting"
  | "unknown"
  | "help"
  | "current_time"
  | "client_debt"
  | "client_balance"
  | "client_phone"
  | "client_address"
  | "clients_count"
  | "client_purchased_apartment"
  | "supplier_debt"
  | "suppliers_balance"
  | "suppliers_count"
  | "expenses_total"
  | "expenses_recent"
  | "qarzdorlar_summary"
  | "qarzdorlar_list"
  | "top_qarzdor"
  | "payments_stats"
  | "dashboard"
  | "apartments_count"
  | "apartments_free"
  | "apartments_sold_count"
  | "apartments_not_sold_count"
  | "objects_count"
  | "object_apartments"
  | "object_sold_count"
  | "object_bosh_count"
  | "apartment_price"
  | "apartment_status"
  | "total_area"
  | "sold_area"
  | "bosh_apartments_by_rooms"
  | "apartments_by_floor"
  | "apartments_by_floor_and_rooms"
  | "objects_with_rooms_bosh"
  | "objects_with_bosh_on_floor";

export type ZiyrakIntent =
  | {
      type: "navigate";
      path: string;
      label: string;
      filterObjectName?: string;
      openAdd?: boolean;
      openRemaining?: boolean;
      openOverdue?: boolean;
      /** Xonadonlar sahifasi filtri: obyekt nomi (id ga resolve qilinadi) */
      filterApartmentObjectName?: string;
      /** Xonadonlar: xonalar soni "1"|"2"|"3"|"4" */
      filterApartmentRooms?: string;
      /** Xonadonlar: holati "bosh"|"band"|"sotilgan"|"muddatli" */
      filterApartmentStatus?: string;
    }
  | { type: "open"; page: "client" | "supplier" | "apartment" | "object"; entity: string }
  | { type: "action"; action: "add_balance"; entity: string; amount: number }
  | { type: "action"; action: "go_back" }
  | { type: "action"; action: "refresh" }
  | { type: "action"; action: "logout" }
  | { type: "action"; action: "download_report" }
  | { type: "answer"; query: ZiyrakQuery; entity?: string }
  | null;

const NAV: { pattern: RegExp; path: string; label: string }[] = [
  { pattern: /\b(bosh\s*sahifa|asosiy|bosh\s*menyu|home|dashboard)\b/i, path: "/", label: "Bosh sahifa" },
  { pattern: /\b(sotuv\s+obyektlar|sotuv\s+object)\b/i, path: "/sotuv/obyektlar", label: "Sotuv obyektlar" },
  { pattern: /\b(sotuv\s+uylar|sotuv\s+yonadonlar)\b/i, path: "/sotuv/uylar", label: "Sotuv uylar" },
  { pattern: /\b(sotuv\s+mijozlar|sotuv\s+klientlar)\b/i, path: "/sotuv/mijozlar", label: "Sotuv mijozlar" },
  { pattern: /\b(sotuv\s+shartnomalar|shartnomalar\s+sotuv)\b/i, path: "/sotuv/shartnomalar", label: "Sotuv shartnomalar" },
  { pattern: /\b(virtual\s*tur|virtual\s*tour|3d\s*tur)\b/i, path: "/sotuv/virtual-tur", label: "Virtual tur" },
  { pattern: /\b(sotuv\s+bo['']limi|sotuv\s+sahifa|sotuv)\b/i, path: "/sotuv", label: "Sotuv" },
  { pattern: /\b(yangi\s+obyekt|obyekt\s+qo['']shish\s+sahifasi|obyekt\s+yaratish)\b/i, path: "/properties/add", label: "Yangi obyekt" },
  { pattern: /\b(yangi\s+xonadon|xonadon\s+qo['']shish\s+sahifasi|yonadon\s+yaratish)\b/i, path: "/apartments/add", label: "Yangi xonadon" },
  { pattern: /\b(qarzdorlar|qarz\s*borlar|qarzdor)\b/i, path: "/qarzdorlar", label: "Qarzdorlar" },
  { pattern: /\b(obyektlar|obyekt|object)\b/i, path: "/properties", label: "Obyektlar" },
  { pattern: /\b(xonadonlar|uylar|kvartiralar|apartment)\b/i, path: "/apartments", label: "Xonadonlar" },
  { pattern: /\b(mijozlar|mijoz|klientlar|klient|client)\b/i, path: "/clients", label: "Mijozlar" },
  { pattern: /\b(hujjatlar|hujjat|documents)\b/i, path: "/documents", label: "Hujjatlar" },
  { pattern: new RegExp(`\\b(to${AP}lovlar|tolovlar|to${AP}lov|payment)\\b`, "i"), path: "/payments", label: "To'lovlar" },
  { pattern: /\b(yetkazib\s*beruvchilar|yetkazib\s*beruvchi|ta'minotchi|supplier)\b/i, path: "/suppliers", label: "Yetkazib beruvchilar" },
  { pattern: /\b(xarajatlar|harajatlar|xarajat|expense)\b/i, path: "/expenses", label: "Xarajatlar" },
  { pattern: /\b(hisobot\s*yuklab\s*olish|hisobot|report|reports)\b/i, path: "/reports", label: "Hisobot" },
  { pattern: /\b(sozlamalar|settings|sozlama)\b/i, path: "/settings", label: "Sozlamalar" },
];

/** Matnni barcha tekshiruvlar uchun bir xil qilish */
function normalizeText(s: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019`]/g, "'")
    .trim()
    .toLowerCase();
}

function matchNav(text: string): { path: string; label: string } | null {
  const t = normalizeText(text);
  if (!t) return null;
  for (const { pattern, path, label } of NAV) {
    if (pattern.test(t) && path) return { path, label };
  }
  return null;
}

/** "500 ming", "5 million", "1 milliard" -> number */
function parseAmountFromText(text: string): number | null {
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();
  const match = t.match(/(\d+(?:[.,]\d+)?)\s*(ming|million|milliard|mln|mlrd)?/i);
  if (!match) return null;
  let n = parseFloat(match[1].replace(",", "."));
  const unit = (match[2] || "").toLowerCase();
  if (unit === "ming" || unit === "k") n *= 1e3;
  else if (unit === "million" || unit === "mln" || unit === "m") n *= 1e6;
  else if (unit === "milliard" || unit === "mlrd" || unit === "milliard") n *= 1e9;
  return Math.round(n);
}

/**
 * Parse user utterance -> intent. Hech qachon null qaytarmaydi (faqat bo'sh matn uchun).
 */
export function parseZiyrakIntent(text: string): ZiyrakIntent {
  if (!text || typeof text !== "string") return null;
  const t = normalizeText(text);
  if (!t) return null;

  // ——— Greeting ———
  if (/\b(salom|assalom|hayr|rahmat|yoqmadi|yaxshi|hush\s*kelibsiz)\b/i.test(t) && t.length < 50) {
    return { type: "answer", query: "greeting" };
  }

  // ——— Action: add balance ——— "Ahmadga 500 ming qo'sh", "X ga Y so'm qo'sh"
  const addBalanceMatch = t.match(/([^\d,?.]+?)\s+ga\s+(\d+(?:\s*ming|\s*million|\s*milliard)?)\s*(?:so['']m|sum)?\s*qo['']sh/i)
    || t.match(/(?:mijoz\s+)?([^\d,?.]+?)\s+(?:ga\s+)?(\d+(?:\s*ming|\s*million|\s*milliard)?)\s*qo['']sh/i)
    || t.match(/qo['']sh\s+(\d+(?:\s*ming|\s*million|\s*milliard)?)\s*(?:so['']m)?\s+([^\d,?.]+)/i);
  if (addBalanceMatch) {
    const entity = (addBalanceMatch[1] || addBalanceMatch[2] || "").replace(/\s+(?:ga|uchun)$/i, "").trim();
    const amountStr = (addBalanceMatch[2] || addBalanceMatch[1] || "").replace(/\s+/g, " ");
    const amount = parseAmountFromText(amountStr) ?? parseAmountFromText(text);
    if (entity.length >= 2 && amount && amount > 0) {
      return { type: "action", action: "add_balance", entity, amount };
    }
  }

  // ——— "Sahifasini och" / "ko'rsat" / "sahifaga kir" / "X ga bor" / "X ro'yxati" ———
  if (/\b(sahifasini|sahifasiga|sahifa)\s*(och|kir|ko'rsat)|(och|kir|ko'rsat|bor)\s+(xarajatlar|to'lovlar|tolovlar|qarzdorlar|obyektlar|mijozlar|bosh|hisobot|hujjatlar|sozlamalar|xonadonlar|sotuv|yangi\s+obyekt|yangi\s+xonadon)\b/i.test(t)) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }
  if (/\b(xarajatlar|to'lovlar|tolovlar|qarzdorlar|obyektlar|mijozlar|hisobot|hujjatlar|sozlamalar|xonadonlar|yetkazib\s*beruvchilar)\s+(ro['']yxati|ro['']yxat|bo['']limi|sahifasi|sahifa)\b/i.test(t)
    || /\b(ro['']yxat|bo['']limi)\s+(xarajatlar|to'lovlar|qarzdorlar|obyektlar|mijozlar|hujjatlar|xonadonlar)\b/i.test(t)
    || /\b(xarajatlar|to'lovlar|qarzdorlar|obyektlar|mijozlar|hujjatlar|xonadonlar|hisobot|sozlamalar)\s+ga\s+(bor|o['']t|kir)\b/i.test(t)) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }
  if (/\b(bosh\s*sahifa|asosiy)\s+ga\s+(bor|qayt)\b/i.test(t) || /\bboshga\s*qayt\b/i.test(t) || /\basosiyga\b/i.test(t)) {
    return { type: "navigate", path: "/", label: "Bosh sahifa" };
  }
  if (/^(xarajatlar|to'lovlar|tolovlar|qarzdorlar|obyektlar|mijozlar|bosh\s*sahifa|hisobot|hujjatlar|sozlamalar|xonadonlar|sotuv|yangi\s+obyekt|yangi\s+xonadon|sotuv\s+obyektlar|sotuv\s+uylar|sotuv\s+mijozlar|sotuv\s+shartnomalar|virtual\s*tur)\s+(och|kir|ko'rsat|bor)$/i.test(t)) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }
  if (/\b(och|kir|ko'rsat|bor)\s*$/i.test(t) || /^\s*(och|kir|ko'rsat|bor)\s+/i.test(t)) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }

  // ——— "To'lov qo'sh" ———
  if (/\b(to['']lov|tolov)(lar)?\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\bqo['']sh(ib\s*qo['']y)?\s+(to['']lov|tolov)/i.test(t)) {
    return { type: "navigate", path: "/payments", label: "To'lovlar", openAdd: true };
  }
  // ——— To'lovlar: qoldiq tafsilotlari ———
  if (/\b(qoldiq\s*tafsilotlari|qoldiq\s*tafsilot|jami\s*qoldiq|qoldiq\s*modal)\b/i.test(t) || /\btafsilotlari\s*qoldiq\b/i.test(t)) {
    return { type: "navigate", path: "/payments", label: "To'lovlar", openRemaining: true };
  }
  // ——— To'lovlar: muddati o'tgan tafsilotlari ———
  if (/\b(muddati\s*o['']tgan\s*tafsilotlari|muddati\s*o['']tgan|kechikkan\s*to['']lovlar|overdue)\b/i.test(t) || /\btafsilotlari\s*muddati\s*o['']tgan\b/i.test(t)) {
    return { type: "navigate", path: "/payments", label: "To'lovlar", openOverdue: true };
  }
  // ——— "Xarajat qo'sh" / "xarajat qo'shib qo'y" ———
  if (/\b(xarajat|harajat)(lar)?\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\bqo['']sh(ib\s*qo['']y)?\s+(xarajat|harajat)/i.test(t)) {
    return { type: "navigate", path: "/expenses", label: "Xarajatlar", openAdd: true };
  }
  // ——— "Mijoz qo'sh" / "Yangi mijoz" ———
  if (/\b(mijoz|klient)(lar)?\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\bqo['']sh(ib\s*qo['']y)?\s+(mijoz|klient)/i.test(t) || /\byangi\s+mijoz\b/i.test(t)) {
    return { type: "navigate", path: "/clients", label: "Mijozlar", openAdd: true };
  }
  // ——— "Obyekt qo'sh" / "Yangi obyekt" ———
  if (/\b(obyekt|object)(lar)?\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\byangi\s+obyekt\b/i.test(t)) {
    return { type: "navigate", path: "/properties/add", label: "Yangi obyekt" };
  }
  // ——— "Xonadon qo'sh" / "Yangi xonadon" ———
  if (/\b(xonadon|uy|kvartira)(lar)?\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\byangi\s+xonadon\b/i.test(t)) {
    return { type: "navigate", path: "/apartments/add", label: "Yangi xonadon" };
  }
  // ——— "Yetkazib beruvchi qo'sh" ———
  if (/\byetkazib\s*beruvchi\s*qo['']sh(ib\s*qo['']y)?/i.test(t) || /\bqo['']sh(ib\s*qo['']y)?\s+yetkazib\s*beruvchi/i.test(t) || /\byangi\s+yetkazib\s*beruvchi\b/i.test(t)) {
    return { type: "navigate", path: "/suppliers", label: "Yetkazib beruvchilar", openAdd: true };
  }
  // ——— Hisobot yuklab olish ———
  if (/\bhisobot\s*(yuklab\s*ol|yuklash|download|yuklab\s*ber)/i.test(t) || /\b(yuklab\s*ol|yuklash)\s+hisobot/i.test(t) || /\bjoriy\s*holat(ni)?\s*yuklab\s*ol/i.test(t) || /\breport\s*(yuklab\s*ol|download)/i.test(t)) {
    return { type: "action", action: "download_report" };
  }
  // ——— Orqaga ———
  if (/\borqaga\b/i.test(t) || /\boldingi\s*sahifa\b/i.test(t) || /\bback\b/i.test(t) || /\bkeyingi\s*sahifa\b/i.test(t)) {
    return { type: "action", action: "go_back" };
  }
  // ——— Sahifani yangilash ———
  if (/\byangilash\b/i.test(t) || /\byangila\b/i.test(t) || /\brefresh\b/i.test(t) || /\bqayta\s*yukla\b/i.test(t) || /\bqayta\s*och\b/i.test(t)) {
    return { type: "action", action: "refresh" };
  }
  // ——— Chiqish / Logout ———
  if (/\bchiqish\b/i.test(t) || /\btizimdan\s*chiq\b/i.test(t) || /\blogout\b/i.test(t) || /\bhisobdan\s*chiq\b/i.test(t) || /\bchiq\b/i.test(t) && t.length < 15) {
    return { type: "action", action: "logout" };
  }
  // ——— Yordam / Nima qila olaman ———
  if (/\byordam\b/i.test(t) || /\bnima\s*qila\s*olaman\b/i.test(t) || /\bqanday\s*buyruqlar\b/i.test(t) || /\bbuyruqlar\s*ro['']yxati\b/i.test(t)
    || /\bkomandalar\b/i.test(t) || /\bnima\s*qilish\s*mumkin\b/i.test(t) || /\bqanday\s*ishlaydi\b/i.test(t)
    || /\bqanday\s*ishlash\b/i.test(t) || /\bqanday\s*foydalan\b/i.test(t) || /\bbuyruqlar\b/i.test(t) && t.length < 25
    || (/\bnima\b/i.test(t) && t.length < 14 && !/\b(qarz|mijoz|obyekt|xonadon|qancha|necha)\b/i.test(t))) {
    return { type: "answer", query: "help" };
  }
  // ——— Vaqt / Sana ———
  if (/\bvaqt\s*(qancha|necha)\b/i.test(t) || /\bsoat\s*necha\b/i.test(t) || /\bbugun\s*(qanday\s*sana|sana\s*qanday|nima\s*sana)\b/i.test(t)
    || /\bsana\s*(qanday|necha)\b/i.test(t) || /\bhozir\s*vaqt\b/i.test(t) || /\bbugun\s*qaysi\s*kun\b/i.test(t)
    || /^(hozir|vaqt|sana|soat|bugun|qaysi\s*sana)$/i.test(t)) {
    return { type: "answer", query: "current_time" };
  }

  // ——— Filter by object: "Assalom Quqon obyekti bo'yicha ko'rsat" / "faqat X buyicha xarajatlar" ———
  const filterByObjectExpenses = t.match(/(.+?)\s+obyekt(?:i)?\s+bo['']yicha\s+(?:xarajatlar|harajatlar)?\s*(ko['']rsat)?/i)
    || t.match(/faqat\s+(.+?)\s+(?:buyicha|bo['']yicha)\s*(?:xarajatlar)?\s*(ko['']rsat)?/i)
    || t.match(/(?:xarajatlar|harajatlar)\s+(.+?)\s+(?:obyekti?\s+)?bo['']yicha\s*ko['']rsat/i);
  if (filterByObjectExpenses) {
    const objectName = filterByObjectExpenses[1].trim();
    if (objectName.length >= 2) return { type: "navigate", path: "/expenses", label: "Xarajatlar", filterObjectName: objectName };
  }
  const filterByObjectPayments = t.match(/(.+?)\s+obyekt(?:i)?\s+bo['']yicha\s+(?:to['']lovlar)?\s*(ko['']rsat)?/i)
    || t.match(/faqat\s+(.+?)\s+(?:buyicha|bo['']yicha)\s*(?:to['']lovlar)?\s*(ko['']rsat)?/i);
  if (filterByObjectPayments) {
    const objectName = filterByObjectPayments[1].trim();
    if (objectName.length >= 2) return { type: "navigate", path: "/payments", label: "To'lovlar", filterObjectName: objectName };
  }

  // ——— Xonadonlar filtri: "X obyektidagi xonadonlar", "X obyektidagi N xonali bo'sh xonadonlarni ko'rsat" ———
  const aptFilterObjRoomsBosh = t.match(/(.+?)\s+obyekt(?:i|da)?\s+(?:dagi|idagi)?\s*(\d+)\s*(?:xonali|honali)\s+bo['']sh\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/(.+?)\s+da\s+(\d+)\s*(?:xonali|honali)\s+bo['']sh\s+(?:xonadon|uy)(lar)?\s*ko['']rsat/i)
    || t.match(/faqat\s+(.+?)\s+obyekt(?:i|da)?\s+(\d+)\s*(?:xonali|honali)\s+bo['']sh/i)
    || t.match(/(.+?)\s+obyekt(?:i|da)?\s+(\d+)\s*(?:xonali|honali)\s+bo['']sh\s+uy(lar)?/i);
  if (aptFilterObjRoomsBosh) {
    const objName = (aptFilterObjRoomsBosh[1] ?? "").trim();
    const rooms = aptFilterObjRoomsBosh[2];
    if (objName.length >= 2 && rooms && ["1","2","3","4"].includes(rooms)) {
      return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentObjectName: objName, filterApartmentRooms: rooms, filterApartmentStatus: "bosh" };
    }
  }
  const aptFilterObjBosh = t.match(/(.+?)\s+obyekt(?:i|da)?\s+(?:dagi|idagi)?\s+bo['']sh\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/faqat\s+(.+?)\s+obyekt(?:i|da)?\s+bo['']sh\s+xonadon/i);
  if (aptFilterObjBosh) {
    const objName = (aptFilterObjBosh[1] ?? "").trim();
    if (objName.length >= 2) return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentObjectName: objName, filterApartmentStatus: "bosh" };
  }
  const aptFilterObjRooms = t.match(/(.+?)\s+obyekt(?:i|da)?\s+(?:dagi|idagi)?\s*(\d+)\s*(?:xonali|honali)\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/faqat\s+(.+?)\s+obyekt(?:i|da)?\s+(\d+)\s*(?:xonali|honali)/i)
    || t.match(/(.+?)\s+da\s+(\d+)\s*(?:xonali|honali)\s+(?:xonadon|uy)(lar)?/i);
  if (aptFilterObjRooms) {
    const objName = (aptFilterObjRooms[1] ?? "").trim();
    const rooms = aptFilterObjRooms[2];
    if (objName.length >= 2 && rooms && ["1","2","3","4"].includes(rooms)) {
      return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentObjectName: objName, filterApartmentRooms: rooms };
    }
  }
  const aptFilterObjOnly = t.match(/(.+?)\s+obyekt(?:i|da)?\s+(?:dagi|idagi)?\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/(?:xonadon|uy)(lar)?\s+(.+?)\s+obyekt(?:i|da)?\s+bo['']yicha\s*ko['']rsat/i)
    || t.match(/faqat\s+(.+?)\s+obyekt(?:i|da)?\s+(?:xonadon|uy)(lar)?/i)
    || t.match(/(.+?)\s+obyekti\s+(?:xonadonlar|uylar)\s*ko['']rsat/i);
  if (aptFilterObjOnly) {
    const objName = (aptFilterObjOnly[1] ?? "").trim();
    if (objName.length >= 2 && !/\d+/.test(objName)) return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentObjectName: objName };
  }
  if (/\bbo['']sh\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i.test(t) || /\bfaqat\s+bo['']sh\s+(?:xonadon|uy)(lar)?/i.test(t) || /\b(?:xonadon|uy)(lar)?\s+faqat\s+bo['']sh\s*ko['']rsat/i.test(t)) {
    return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentStatus: "bosh" };
  }
  if (/\b(band|sotilgan|muddatli)\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i.test(t) || /\bfaqat\s+(band|sotilgan|muddatli)\s+(?:xonadon|uy)(lar)?/i.test(t)) {
    const statusMatch = t.match(/\b(band|sotilgan|muddatli)\b/i);
    const statusVal = statusMatch ? statusMatch[1].toLowerCase() : null;
    if (statusVal) return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentStatus: statusVal };
  }
  const aptFilterRoomsBosh = t.match(/(\d+)\s*(?:xonali|honali)\s+bo['']sh\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/bo['']sh\s+(\d+)\s*(?:xonali|honali)\s+(?:xonadon|uy)(lar)?/i);
  if (aptFilterRoomsBosh) {
    const rooms = aptFilterRoomsBosh[1];
    if (rooms && ["1","2","3","4"].includes(rooms)) return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentRooms: rooms, filterApartmentStatus: "bosh" };
  }
  const aptFilterRoomsOnly = t.match(/(\d+)\s*(?:xonali|honali)\s+(?:xonadon|uy)(lar)?\s*(ko['']rsat)?/i)
    || t.match(/faqat\s+(\d+)\s*(?:xonali|honali)\s+(?:xonadon|uy)(lar)?/i);
  if (aptFilterRoomsOnly) {
    const rooms = aptFilterRoomsOnly[1];
    if (rooms && ["1","2","3","4"].includes(rooms)) return { type: "navigate", path: "/apartments", label: "Xonadonlar", filterApartmentRooms: rooms };
  }

  // ——— Open by name ——— "Ahmad mijoz sahifasini och", "X yetkazib beruvchini och"
  const openClientMatch = t.match(/([^,?.]+?)\s+(?:mijoz|klient)\s+(?:sahifasini|sahifasiga)\s*(?:och|kir)/i)
    || t.match(/(?:och|ko['']rsat)\s+([^,?.]+?)\s+(?:mijoz|klient)/i);
  if (openClientMatch) {
    const entity = openClientMatch[1].trim();
    if (entity.length >= 2) return { type: "open", page: "client", entity };
  }
  const openSupplierMatch = t.match(/([^,?.]+?)\s+yetkazib\s*beruvchi\s*(?:sahifasini|sahifasiga)\s*(?:och|kir)/i)
    || t.match(/(?:och|ko['']rsat)\s+([^,?.]+?)\s+yetkazib\s*beruvchi/i);
  if (openSupplierMatch) {
    const entity = openSupplierMatch[1].trim();
    if (entity.length >= 2) return { type: "open", page: "supplier", entity };
  }
  const openObjectMatch = t.match(/([^,?.]+?)\s+obyekt\s*(?:sahifasini|sahifasiga)\s*(?:och|kir)/i)
    || t.match(/(?:och|ko['']rsat)\s+([^,?.]+?)\s+obyekt/i);
  if (openObjectMatch) {
    const entity = openObjectMatch[1].trim();
    if (entity.length >= 2) return { type: "open", page: "object", entity };
  }
  const openAptMatch = t.match(/([^,?.]+?)\s+xonadon\s*(?:sahifasini|sahifasiga)\s*(?:och|kir)/i)
    || t.match(/(?:och|ko['']rsat)\s+([^,?.]+?)\s+xonadon/i)
    || t.match(/([^,?.]+?)\s+room\s*(?:och|kir)/i);
  if (openAptMatch) {
    const entity = openAptMatch[1].trim();
    if (entity.length >= 2) return { type: "open", page: "apartment", entity };
  }

  // ——— Client queries (mijoz nomi bilan — birinchi tekshirish, keyin umumiy "qarz" emas) ———
  // "Norid aka qaysi uyni sotib olgan" / "X qaysi uyni sotib olgan"
  const clientAptMatch = t.match(/(.+?)\s+qaysi\s+(uy|xonadon|kvartira)(ni)?\s+sotib\s+olgan/i)
    || t.match(/(.+?)\s+ning\s+uyi\s+qaysi/i)
    || t.match(/(.+?)\s+ning\s+xonadoni\s+qaysi/i)
    || t.match(/(.+?)\s+qaysi\s+uyni\s+sotib\s+olgan/i)
    || t.match(/(.+?)\s+sotib\s+olgan\s+uy\s+qaysi/i)
    || t.match(/(.+?)\s+qaysi\s+(uy|xonadon)\s+olgan/i)
    || t.match(/(.+?)\s+olgan\s+uy\s+qaysi/i)
    || t.match(/(.+?)\s+qaysi\s+uy\s+(sotib\s+olgan|olgan)/i);
  if (clientAptMatch) {
    const entity = clientAptMatch[1].replace(/\s+(aka|opa|mijoz|klient)$/i, "").trim();
    if (entity.length >= 2) return { type: "answer", query: "client_purchased_apartment", entity };
  }
  // "X ning qarzi bormi", "X da qarz bormi", "X qarzi bor bo'lsa qancha", "X ning qarzi qancha"
  const clientDebtMatch = t.match(/([^,?.]+?)\s+(ning\s+)?qarzi\s+(bormi|bor\s+bo['']lsa|qancha)/i)
    || t.match(/([^,?.]+?)\s+da\s+qarz\s+(bormi|bor\s+bo['']lsa|qancha)?/i)
    || t.match(/([^,?.]+?)\s+qarzi\s+(bormi|qancha|bor)/i)
    || t.match(/(?:mijoz|klient)\s+([^,?.]+?)(?:\s+ning|\s+qarzi|$)/i)
    || t.match(/([^,?.]+?)\s+ning\s+qarzi\s+qancha/i)
    || t.match(/qancha\s+qarz\s+(?:bor\s+)?([^,?.]+)/i)
    || t.match(/([^,?.]+?)\s+qarz\s+(qancha|bormi)/i);
  if (clientDebtMatch) {
    const entity = (clientDebtMatch[1] ?? "").replace(/\s+(?:ning|dan|uchun)$/i, "").trim();
    if (entity.length >= 2) return { type: "answer", query: "client_debt", entity };
  }
  if (/\b([^,?.]+?)\s+ning\s+telefoni\b/i.test(t) || /\b([^,?.]+?)\s+telefon\s+raqam/i.test(t)) {
    const m = t.match(/([^,?.]+?)\s+ning\s+telefoni|([^,?.]+?)\s+telefon/);
    const entity = (m?.[1] || m?.[2] || "").trim();
    if (entity.length >= 2) return { type: "answer", query: "client_phone", entity };
  }
  if (/\b([^,?.]+?)\s+ning\s+manzili\b/i.test(t) || /\b([^,?.]+?)\s+manzil/i.test(t)) {
    const m = t.match(/([^,?.]+?)\s+ning\s+manzili|([^,?.]+?)\s+manzil/);
    const entity = (m?.[1] || m?.[2] || "").trim();
    if (entity.length >= 2) return { type: "answer", query: "client_address", entity };
  }
  if (/\b([^,?.]+?)\s+ning\s+balansi\b/i.test(t) || /\b([^,?.]+?)\s+balans\s+qancha/i.test(t)) {
    const m = t.match(/([^,?.]+?)\s+ning\s+balansi|([^,?.]+?)\s+balans/);
    const entity = (m?.[1] || m?.[2] || "").trim();
    if (entity.length >= 2) return { type: "answer", query: "client_balance", entity };
  }
  if (/\bmijozlar\s+nechta\b/i.test(t) || /\bnechta\s+mijoz\b/i.test(t) || /\bklientlar\s+soni\b/i.test(t)) {
    return { type: "answer", query: "clients_count" };
  }

  // ——— Supplier queries ———
  const supplierMatch = t.match(/(?:yetkazib\s*beruvchi|ta\'minotchi)\s+([^,?.]+?)(?:\s+dan|\s+qarz|$)/i)
    || t.match(/([^,?.]+?)\s+dan\s+qancha\s+qarz/i)
    || t.match(/qancha\s+qarz(?:imiz)?\s+([^,?.]+)/i);
  if (supplierMatch) {
    const entity = supplierMatch[1].replace(/\s+(?:ning|dan|uchun)$/i, "").trim();
    if (entity.length > 0) return { type: "answer", query: "supplier_debt", entity };
  }
  if (/\b(yetkazib\s*beruvchil(?:ar|ardan)|barcha\s*yetkazib)\b.*\bqarz\b/i.test(t)
    || /\bqarz\b.*\b(yetkazib\s*beruvchi)\b/i.test(t)) {
    return { type: "answer", query: "suppliers_balance" };
  }
  if (/\byetkazib\s*beruvchilar\s+nechta\b/i.test(t) || /\bnechta\s+yetkazib\s*beruvchi\b/i.test(t)) {
    return { type: "answer", query: "suppliers_count" };
  }

  // ——— Expenses (only when asking for amount, not "open page") ———
  if (/\b(xarajat|harajat)(lar)?\s*(qancha|necha|jami|umumiy)/i.test(t)
    || /\b(jami|umumiy)\s+(xarajat|harajat)/i.test(t)
    || /\b(xarajat|harajat)\s+(qancha|necha)/i.test(t)) {
    return { type: "answer", query: "expenses_total" };
  }
  if (/\bso['']nggi\s+xarajatlar\b/i.test(t) || /\boxirgi\s+xarajat\b/i.test(t)) {
    return { type: "answer", query: "expenses_recent" };
  }

  // ——— Qarzdorlar: sahifaga ochish yoki ma'lumot ———
  if (/\bqarzdorlar\b/i.test(t) && /\b(sahifasini|sahifasiga|sahifa)\s*(och|kir)?/i.test(t)) {
    return { type: "navigate", path: "/qarzdorlar", label: "Qarzdorlar" };
  }
  // "Eng ko'p qarzdor kim" / "mijozlar ichida eng ko'p qarzdori kim" — javob berish, sahifa ochmaslik
  if (/\beng\s+ko['']p\s+qarz(dor)?\s*(kim|qaysi)?/i.test(t)
    || /\bmijozlar\s+ichida\s+eng\s+ko['']p\s+qarzdor/i.test(t)
    || /\bkimda\s+eng\s+ko['']p\s+qarz\b/i.test(t)
    || /\bbirinchi\s+qarzdor\s*(kim|qaysi)?/i.test(t)
    || /\beng\s+ko['']p\s+qarz\s+kimda\b/i.test(t)) {
    return { type: "answer", query: "top_qarzdor" };
  }
  if (/\bqarzdorlar\s+ro'yxat/i.test(t) || /\bqarzdorlarni\s+(?:ayt|ko'rsat|chiqar|so'ra)/i.test(t)
    || /\bkimda\s+qarz\s+bor/i.test(t) || /\bqarz\s+bor\s+kimlar/i.test(t) || /\bqarzdorlar\s+kimlar/i.test(t)) {
    return { type: "answer", query: "qarzdorlar_list" };
  }
  if (/\b(qarzdorlar|qarzdorlarni|qarz\s*borlar|muddati\s+o['']tgan(?:lar)?|jami\s+qarz|umumiy\s+qarz|qarz\s+jami)\b/i.test(t)
    || /\bqancha\s+qarz\s+(?:bor|muddati\s+o['']tgan)/i.test(t) || /\bqarz\s+qancha\b/i.test(t)
    || /\bqarz(?:dor)?\s*haqida\b/i.test(t) || /\bqarzdorlar\s+qancha\b/i.test(t)) {
    return { type: "answer", query: "qarzdorlar_summary" };
  }

  // ——— Payments / stats ———
  if (/\bto['']lovlar\s+statistikasi\b/i.test(t) || /\bto['']lov\s+statistika\b/i.test(t)) {
    return { type: "answer", query: "payments_stats" };
  }
  if (/\bumumiy\s+statistika\b/i.test(t) || /\bdashboard\b/i.test(t) || /\bqisqacha\b/i.test(t)
    || /\bbosh\s+sahifa\s+raqamlari\b/i.test(t)) {
    return { type: "answer", query: "dashboard" };
  }

  // ——— Apartments / objects (batafsil: sotilgan, bosh, kvadrat, xonali, etaj) ———
  if (/\bxonadonlar\s+nechta\b/i.test(t) || /\bnechta\s+xonadon\b/i.test(t) || /\bumumiy\s+barcha\s+xonadon\b/i.test(t)) {
    return { type: "answer", query: "apartments_count" };
  }
  if (/\bbosh\s+xonadonlar\b/i.test(t) || /\bbo'sh\s+nechta\b/i.test(t)) {
    return { type: "answer", query: "apartments_free" };
  }
  if (/\b(nechta\s+uy\s+sotilgan|sotilgan\s+uy(lar)?\s+nechta|nechta\s+sotilgan|sotilgan\s+nechta|jami\s+sotilgan\s+uy|sotilgan\s+uy(lar)?\s+soni|sotilgan\s+xonadon\s+nechta|nechta\s+sotilgan\s+xonadon)\b/i.test(t)) {
    return { type: "answer", query: "apartments_sold_count" };
  }
  if (/\b(nechta\s+uy\s+sotilmagan|sotilmagan\s+uy(lar)?\s+nechta|sotilmagan\s+nechta|sotilmagan\s+uy\s+bor\s+nechta|jami\s+sotilmagan|bo['']sh\s+uy(lar)?\s+nechta|sotilmagan\s+xonadon\s+nechta)\b/i.test(t)) {
    return { type: "answer", query: "apartments_not_sold_count" };
  }
  const objSoldMatch = t.match(/(.+?)\s+obyekt(?:da)?\s+nechta\s+sotilgan\s+uy/i)
    || t.match(/(.+?)\s+obyekt(?:da)?\s+sotilgan\s+uy(lar)?\s+nechta/i)
    || t.match(/(.+?)\s+da\s+nechta\s+sotilgan\s+uy\s+bor/i);
  if (objSoldMatch) {
    const entity = objSoldMatch[1].replace(/\b(shu|obyekt)\s*/gi, "").trim();
    if (entity.length >= 2) return { type: "answer", query: "object_sold_count", entity };
  }
  const objBoshMatch = t.match(/(.+?)\s+obyekt(?:da)?\s+nechta\s+bosh\s+uy/i)
    || t.match(/(.+?)\s+obyekt(?:da)?\s+bo'sh\s+uy(lar)?\s+nechta/i);
  if (objBoshMatch) {
    const entity = objBoshMatch[1].trim();
    if (entity.length >= 2) return { type: "answer", query: "object_bosh_count", entity };
  }
  if (/\bqancha\s+kvadrat\s+(sotiladigan|sotilgan)\s+uylar/i.test(t) || /\bsotiladigan\s+uylar\s+qancha\s+kvadrat\b/i.test(t)) {
    return { type: "answer", query: "sold_area" };
  }
  if (/\bqancha\s+kvadrat\b/i.test(t) || /\b(jami|barcha)\s+xonadonlar\s+kvadrat\b/i.test(t) || /\bkvadrat\s+umumiy\b/i.test(t)
    || /\bjami\s+kvadrat\b/i.test(t) || /\bumumiy\s+kvadrat\b/i.test(t) || /\bkvadrat\s+(jami|qancha)\b/i.test(t)) {
    return { type: "answer", query: "total_area" };
  }
  const roomsBoshMatch = t.match(/(\d+)\s*(?:xonali|honali)\s+bosh\s+uy(lar)?\s+nechta/i)
    || t.match(/nechta\s+(\d+)\s*(?:xonali|honali)\s+bosh\b/i)
    || t.match(/(\d+)\s*(?:xonali|honali)\s+bosh\s+uy(lar)?\s+bor\b/i);
  if (roomsBoshMatch) {
    const num = parseInt(roomsBoshMatch[1], 10);
    if (num >= 1 && num <= 9) return { type: "answer", query: "bosh_apartments_by_rooms", entity: String(num) };
  }
  const floorMatch = t.match(/(\d+)\s*etaj(da)?\s+nechta\s+xonadon/i)
    || t.match(/(\d+)\s*etaj(da)?\s+xonadon(lar)?\s+nechta/i)
    || t.match(/(\d+)\s*etaj(da)?\s+nechta\s+uy/i)
    || t.match(/nechta\s+xonadon\s+(\d+)\s*etaj/i);
  if (floorMatch) {
    const floorNum = parseInt(floorMatch[1], 10);
    if (floorNum >= 1 && floorNum <= 99) return { type: "answer", query: "apartments_by_floor", entity: String(floorNum) };
  }
  const floorRoomsMatch = t.match(/(\d+)\s*etaj(?:da)?\s+nechta\s+(\d+)\s*(?:xonali|honali)/i)
    || t.match(/(\d+)\s*etaj(?:da)?\s+(\d+)\s*(?:xonali|honali)\s+nechta/i);
  if (floorRoomsMatch) {
    const floorNum = parseInt(floorRoomsMatch[1], 10);
    const roomsNum = parseInt(floorRoomsMatch[3], 10);
    if (floorNum >= 1 && roomsNum >= 1) return { type: "answer", query: "apartments_by_floor_and_rooms", entity: `${floorNum}_${roomsNum}` };
  }
  const qaysiRoomsBoshMatch = t.match(/qaysi\s+obyekt(?:da)?\s+(\d+)\s*(?:xonali|honali)\s+bosh\s+(?:xonadon|uy)\s+bor/i)
    || t.match(/qaysi\s+obyekt(?:da)?\s+(\d+)\s*(?:xonali|honali)\s+bosh\b/i);
  if (qaysiRoomsBoshMatch) {
    const num = parseInt(qaysiRoomsBoshMatch[1], 10);
    if (num >= 1) return { type: "answer", query: "objects_with_rooms_bosh", entity: String(num) };
  }
  const qaysiFloorBoshMatch = t.match(/qaysi\s+obyekt(?:ning)?\s+(\d+)\s*etaj(?:ida)?\s+bosh/i)
    || t.match(/(\d+)\s*etaj(?:ida)?\s+bosh\s+(?:xonadon|uy).*qaysi\s+obyekt/i);
  if (qaysiFloorBoshMatch) {
    const floorNum = parseInt(qaysiFloorBoshMatch[1], 10);
    if (floorNum >= 1) return { type: "answer", query: "objects_with_bosh_on_floor", entity: String(floorNum) };
  }
  if (/\bobyektlar\s+nechta\b/i.test(t) || /\bnechta\s+obyekt\b/i.test(t)) {
    return { type: "answer", query: "objects_count" };
  }
  const objAptMatch = t.match(/([^,?.]+?)\s+obyekt(?:da)?\s+(?:nechta\s+)?xonadon/i)
    || t.match(/([^,?.]+?)\s+xonadonlar\s+soni/i);
  if (objAptMatch) {
    const entity = objAptMatch[1].trim();
    if (entity.length >= 2) return { type: "answer", query: "object_apartments", entity };
  }
  const aptPriceMatch = t.match(/([^,?.]+?)\s+xonadon(?:ning)?\s+narxi/i)
    || t.match(/([^,?.]+?)\s+narx\s+qancha/i);
  if (aptPriceMatch) {
    const entity = aptPriceMatch[1].trim();
    if (entity.length >= 2) return { type: "answer", query: "apartment_price", entity };
  }
  const aptStatusMatch = t.match(/([^,?.]+?)\s+xonadon(?:ning)?\s+holati/i)
    || t.match(/([^,?.]+?)\s+holat\s+qanday/i);
  if (aptStatusMatch) {
    const entity = aptStatusMatch[1].trim();
    if (entity.length >= 2) return { type: "answer", query: "apartment_status", entity };
  }

  // ——— "X haqida" / "X bo'yicha" -> navigate (sahifa ochish) ———
  if (/\b(xarajatlar|to'lovlar|qarzdorlar|obyektlar|mijozlar|xonadonlar|hisobot|hujjatlar|sozlamalar|yetkazib\s*beruvchilar)\s+(haqida|bo['']yicha)\b/i.test(t)
    || /\b(haqida|bo['']yicha)\s+(xarajatlar|to'lovlar|qarzdorlar|obyektlar|mijozlar|xonadonlar)\b/i.test(t)) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }

  // ——— Navigation (bitta so'z yoki "X ga bor", "X ni och") ———
  const isQuestion = /\b(kim|qaysi|necha|qancha|qanday|nimaga)\b/i.test(t);
  if (!isQuestion) {
    const nav = matchNav(t);
    if (nav) return { type: "navigate", path: nav.path, label: nav.label };
  }

  // ——— Super fallback: platforma so'zlari aniq intentga ———
  if (/\bqarz(dor)?\b/i.test(t)) return { type: "answer", query: "qarzdorlar_summary" };
  if (/\b(xarajat|harajat|expense)\b/i.test(t)) return { type: "answer", query: "expenses_total" };
  if (/\b(statistika|raqam|raqamlar|qisqacha|umumiy|jami\s*holat|bosh\s*raqam)\b/i.test(t) && t.length < 55) return { type: "answer", query: "dashboard" };
  if (/\b(mijoz|klient|client)\b/i.test(t) && !/\bning\s+(qarz|balans|telefon|manzil)\b/i.test(t)) return { type: "answer", query: "clients_count" };
  if (/\b(yetkazib\s*beruvchi|ta'minotchi)\b/i.test(t)) return { type: "answer", query: "suppliers_balance" };
  if (/\b(xonadon|uy|kvartira)\b/i.test(t)) return { type: "answer", query: "apartments_count" };
  if (/\bobyekt\b/i.test(t)) return { type: "answer", query: "objects_count" };
  if (/\bto['']lov\b/i.test(t) || /\btolov\b/i.test(t)) return { type: "answer", query: "payments_stats" };
  if (/\bbo['']sh\b/i.test(t) || /\bbosh\s*xonadon\b/i.test(t)) return { type: "answer", query: "apartments_free" };
  if (/\bkimda\s+qarz\b/i.test(t) || /\bqarz\s+kimda\b/i.test(t)) return { type: "answer", query: "qarzdorlar_list" };
  if (/\bso['']nggi\s+xarajat\b/i.test(t) || /\boxirgi\s*xarajat\b/i.test(t)) return { type: "answer", query: "expenses_recent" };
  if (/\bdashboard\b/i.test(t) || /\bqisqacha\s*ayt\b/i.test(t)) return { type: "answer", query: "dashboard" };
  if (/\b(hisobot|report)\b/i.test(t) && t.length < 30) return { type: "navigate", path: "/reports", label: "Hisobot" };
  if (/\b(sozlamalar|sozlama|settings)\b/i.test(t) && t.length < 25) return { type: "navigate", path: "/settings", label: "Sozlamalar" };
  if (/\b(hujjatlar|hujjat|documents)\b/i.test(t) && t.length < 25) return { type: "navigate", path: "/documents", label: "Hujjatlar" };
  if (/\bsotuv\b/i.test(t) && t.length < 20) return { type: "navigate", path: "/sotuv", label: "Sotuv" };
  if (/\b(jami|umumiy)\s*(holat|qancha)?\b/i.test(t) && t.length < 25) return { type: "answer", query: "dashboard" };
  if (/\bnechta\s+(ta\s+)?(mijoz|obyekt|xonadon|uy)\b/i.test(t)) {
    if (/\bmijoz\b/i.test(t)) return { type: "answer", query: "clients_count" };
    if (/\b(obyekt|object)\b/i.test(t)) return { type: "answer", query: "objects_count" };
    return { type: "answer", query: "apartments_count" };
  }
  if (t.length < 25 && /\b(och|ko'rsat|bor|kir|qil|qanday)\b/i.test(t)) {
    const n = matchNav(t);
    if (n) return { type: "navigate", path: n.path, label: n.label };
  }

  return { type: "answer", query: "unknown" };
}

export function isZiyrakWakePhrase(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const t = normalizeText(text);
  if (!t) return false;
  if (t === "ziyrak") return true;
  if (!t.includes("ziyrak")) return false;
  return (
    /\b(salom|assalom|hayr)\b/i.test(t) ||
    /\b(hey|listen|tingla|ayt)\b/i.test(t) ||
    t.length <= 20
  );
}
