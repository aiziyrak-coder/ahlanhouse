/**
 * Ziyrak — barcha so'rov va amallar uchun API chaqiruqlar.
 * Har bir funksiya getApiBaseUrl va getAuthHeaders oladi, matn (ovoz uchun) qaytaradi.
 */

/** Valyuta: qisqacha (yaxlitlangan) — faqat UI uchun kerak bo'lsa. */
export function formatSum(n: number): string {
  const num = Math.round(n);
  if (num >= 1e9) return `${(n / 1e9).toFixed(1)} milliard dollar`;
  if (num >= 1e6) return `${(n / 1e6).toFixed(1)} million dollar`;
  if (num >= 1e3) return `${(n / 1e3).toFixed(1)} ming dollar`;
  return `${num} dollar`;
}

/**
 * To'liq summa — hech qanday yaxlitlashsiz, barcha raqamlar ovozda aytiladi.
 * Masalan: 3341652 -> "3 million 341 ming 652 dollar"
 */
export function formatSumFull(n: number): string {
  const fixed = Number(n).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const intNum = parseInt(intPart, 10) || 0;
  const decNum = parseInt(decPart, 10) || 0;
  const parts: string[] = [];
  if (intNum >= 1e9) {
    const b = Math.floor(intNum / 1e9);
    parts.push(`${b} milliard`);
  }
  if (intNum >= 1e6) {
    const m = Math.floor((intNum % 1e9) / 1e6);
    if (m > 0) parts.push(`${m} million`);
  }
  if (intNum >= 1e3) {
    const k = Math.floor((intNum % 1e6) / 1e3);
    if (k > 0) parts.push(`${k} ming`);
  }
  const u = intNum % 1000;
  if (u > 0 || parts.length === 0) parts.push(String(u));
  let s = parts.join(" ") + " dollar";
  if (decNum > 0) s += ` ${decNum} sent`;
  return s;
}

type Headers = () => Record<string, string> | null;
type BaseUrl = () => string;

async function getJson(url: string, headers: Headers) {
  const h = headers();
  if (!h) return null;
  const res = await fetch(url, { headers: h });
  if (!res.ok) return null;
  return res.json();
}

async function paginateAll(baseUrl: BaseUrl, path: string, headers: Headers, pageSize = 500): Promise<unknown[]> {
  const sep = path.includes("?") ? "&" : "?";
  const data = await getJson(`${baseUrl()}${path}${sep}page_size=${pageSize}`, headers);
  if (!data) return [];
  const results = (data as { results?: unknown[] }).results ?? (Array.isArray(data) ? data : []);
  return results;
}

function findByName<T extends Record<string, unknown>>(list: T[], nameField: keyof T, name: string): T | null {
  const lower = name.toLowerCase().trim();
  return list.find((x) => String(x[nameField] ?? "").toLowerCase().includes(lower)) ?? null;
}

/** Mijoz qidiruvini normalizatsiya qiladi: "Norid aka" -> "Norid", DB dagi "Noridjon" ham "Norid" ga mos keladi. */
function normalizeClientSearch(name: string): string {
  return name
    .replace(/\s*(aka|opa|mijoz|klient|jon)\s*$/gi, "")
    .trim();
}

/** Mijozni FIO bo'yicha qidiradi — to'liq yoki qisman (aka/opa siz), bitta so'z ham yetadi (Norid -> Noridjon). */
function findClientByName(
  clients: { id: number; fio: string }[],
  searchName: string
): { id: number; fio: string } | null {
  const normalized = normalizeClientSearch(searchName);
  if (!normalized) return null;
  const key = normalized.toLowerCase();
  const keyWords = key.split(/\s+/).filter((w) => w.length > 1);
  const byFio = (fio: string) => fio.toLowerCase();
  let found = clients.find((c) => byFio(c.fio).includes(key)) ?? null;
  if (found) return found;
  if (keyWords.length > 0) {
    const firstWord = keyWords[0];
    found = clients.find((c) => byFio(c.fio).includes(firstWord)) ?? null;
  }
  if (found) return found;
  const byWord = keyWords.length > 0 && keyWords[0].length >= 2
    ? clients.find((c) => byFio(c.fio).split(/\s+/).some((w) => w.startsWith(keyWords[0]) || keyWords[0].startsWith(w)))
    : null;
  return byWord ?? null;
}

// ——— Clients ———
export async function fetchClients(baseUrl: BaseUrl, headers: Headers) {
  const list = await paginateAll(baseUrl, "/users/?user_type=mijoz", headers, 5000);
  return list as { id: number; fio: string; phone_number?: string; address?: string; balance?: string | number }[];
}

export async function fetchClientDebt(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi. Bazada ${clients.length} ta mijoz bor.`;
  const payData = await getJson(`${baseUrl()}/payments/?user=${client.id}&page_size=100`, headers);
  const payments = (payData as { results?: unknown[] })?.results ?? [];
  let totalOverdue = 0;
  for (const p of payments as { overdue_payments?: { total_overdue?: number } }[]) {
    const od = p.overdue_payments?.total_overdue ?? 0;
    totalOverdue += Number(od);
  }
  const balance = Number(client.balance ?? 0);
  if (totalOverdue > 0) return `${client.fio} ning qarzi ${formatSumFull(totalOverdue)}.`;
  return `${client.fio} da qarz yo'q, balansi ${formatSumFull(balance)}.`;
}

export async function fetchClientBalance(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi.`;
  return `${client.fio} balansi ${formatSumFull(Number(client.balance ?? 0))}.`;
}

export async function fetchClientPhone(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi.`;
  const phone = client.phone_number || "Kiritilmagan.";
  return `${client.fio} telefon raqami: ${phone}.`;
}

export async function fetchClientAddress(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi.`;
  const addr = client.address || "Kiritilmagan.";
  return `${client.fio} manzili: ${addr}.`;
}

export async function fetchClientsCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchClients(baseUrl, headers);
  return `Jami mijozlar ${list.length} ta.`;
}

/** Mijoz qaysi uyni (obyekt + xonadon) sotib olgan — "X falon obyektdan falon xonadonni sotib olgan". */
export async function fetchClientPurchasedApartment(
  baseUrl: BaseUrl,
  headers: Headers,
  entity: string
): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi. Bazada ${clients.length} ta mijoz bor.`;
  const h = headers();
  if (!h) return "Tizimga kirish kerak.";
  const payData = await getJson(`${baseUrl()}/payments/?user=${client.id}&page_size=100`, headers);
  const payments = (payData as { results?: { apartment: number }[] })?.results ?? [];
  const apartmentIds = [...new Set(payments.map((p) => p.apartment).filter(Boolean))];
  if (apartmentIds.length === 0) return `${client.fio} hali hech qanday uyni sotib olmagan.`;
  const parts: string[] = [];
  for (const id of apartmentIds) {
    const apt = await getJson(`${baseUrl()}/apartments/${id}/`, headers);
    if (apt && typeof apt === "object" && "object_name" in apt && "room_number" in apt) {
      const o = apt as { object_name?: string; room_number?: string };
      parts.push(`${o.object_name ?? "Obyekt"} ${o.room_number ?? ""} xonadon`.trim());
    }
  }
  if (parts.length === 0) return `${client.fio} to'lovlari bor, lekin xonadon ma'lumoti topilmadi.`;
  const listText = parts.length === 1
    ? parts[0] + "ni sotib olgan."
    : parts.join(", ") + " xonadonlarni sotib olgan.";
  return `${client.fio} ${listText}`;
}

// ——— Suppliers ———
export async function fetchSuppliers(baseUrl: BaseUrl, headers: Headers) {
  const list = await paginateAll(baseUrl, "/suppliers/", headers);
  return list as { id: number; company_name: string; balance?: string | number }[];
}

export async function fetchSupplierDebt(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const list = await fetchSuppliers(baseUrl, headers);
  const s = findByName(list, "company_name", entity);
  if (!s) return `${entity} topilmadi.`;
  return `${s.company_name} ga qarzimiz ${formatSumFull(Number(s.balance ?? 0))}.`;
}

export async function fetchSuppliersBalance(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchSuppliers(baseUrl, headers);
  const total = list.reduce((sum, x) => sum + Number(x.balance ?? 0), 0);
  return `Yetkazib beruvchilarga jami ${formatSumFull(total)} qarz.`;
}

export async function fetchSuppliersCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchSuppliers(baseUrl, headers);
  return `Jami yetkazib beruvchilar ${list.length} ta.`;
}

// ——— Expenses ———
export async function fetchExpensesTotal(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await paginateAll(baseUrl, "/expenses/", headers, 5000);
  const total = list.reduce((s: number, e: { amount?: string | number }) => s + Number(e.amount || 0), 0);
  return `Jami xarajatlar ${formatSumFull(total)}.`;
}

export async function fetchExpensesRecent(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/expenses/?ordering=-date&page_size=5`, headers);
  const list = (data as { results?: unknown[] })?.results ?? [];
  if (list.length === 0) return "So'nggi xarajatlar yo'q.";
  const parts = (list as { amount?: number; date?: string; supplier_name?: string }[]).slice(0, 5)
    .map((e, i) => `${i + 1}. ${formatSumFull(Number(e.amount ?? 0))} — ${e.supplier_name || ""} ${e.date || ""}`);
  return `Oxirgi 5 ta xarajat: ${parts.join(". ")}`;
}

// ——— Payments / stats ———
export async function fetchQarzdorlarSummary(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/payments/statistics/`, headers);
  if (!data) return "Statistika yuklanmadi.";
  const overdue = Number((data as { overdue_payments?: number }).overdue_payments ?? 0);
  return `Muddati o'tgan qarz jami ${formatSumFull(overdue)}.`;
}

/** Qarzdorlar ro'yxati — kimda qancha (apartment + summa). */
export async function fetchQarzdorlarList(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/apartments/overdue_payments_report/`, headers);
  if (!data) return "Qarzdorlar ro'yxati yuklanmadi.";
  const report = (data as { report?: { apartment?: string; object?: string; total_overdue?: number }[] }).report ?? [];
  const total = Number((data as { total_overdue_all?: number }).total_overdue_all ?? 0);
  if (report.length === 0) return `Qarzdorlar yo'q. Jami muddati o'tgan qarz ${formatSumFull(total)}.`;
  const parts = report.slice(0, 8).map((r) => `${r.object ?? ""} ${r.apartment ?? ""}: ${formatSumFull(Number(r.total_overdue ?? 0))}`);
  return `Qarzdorlar: ${parts.join(". ")}. Jami ${formatSumFull(total)}.`;
}

/** Eng ko'p qarzdor — birinchi (qarzi eng katta) mijoz/xonadon. */
export async function fetchTopQarzdor(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/apartments/overdue_payments_report/`, headers);
  if (!data) return "Ma'lumot yuklanmadi.";
  const report = (data as { report?: { apartment?: string; object?: string; total_overdue?: number }[] }).report ?? [];
  if (report.length === 0) return "Qarzdorlar yo'q.";
  const sorted = [...report].sort((a, b) => Number(b.total_overdue ?? 0) - Number(a.total_overdue ?? 0));
  const top = sorted[0];
  const name = `${top.object ?? ""} ${top.apartment ?? ""}`.trim() || "Noma'lum";
  return `Eng ko'p qarzdor: ${name} — ${formatSumFull(Number(top.total_overdue ?? 0))}.`;
}

export async function fetchPaymentsStats(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/payments/statistics/`, headers);
  if (!data) return "Statistika yuklanmadi.";
  const d = data as {
    paid_payments?: number;
    pending_payments?: number;
    overdue_payments?: number;
    total_balance?: number;
  };
  return `To'langan: ${formatSumFull(Number(d.paid_payments ?? 0))}. Kutilmoqda: ${formatSumFull(Number(d.pending_payments ?? 0))}. Muddati o'tgan: ${formatSumFull(Number(d.overdue_payments ?? 0))}. Jami qoldiq: ${formatSumFull(Number(d.total_balance ?? 0))}.`;
}

export async function fetchDashboard(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const data = await getJson(`${baseUrl()}/payments/statistics/`, headers);
  if (!data) return "Statistika yuklanmadi.";
  const d = data as {
    total_apartments?: number;
    free_apartments?: number;
    sold_apartments?: number;
    clients?: number;
    total_balance?: number;
    paid_payments?: number;
    overdue_payments?: number;
  };
  return `Jami xonadonlar ${d.total_apartments ?? 0} ta. Bo'sh: ${d.free_apartments ?? 0}. Sotilgan: ${d.sold_apartments ?? 0}. Mijozlar: ${d.clients ?? 0}. Jami qoldiq: ${formatSumFull(Number(d.total_balance ?? 0))}. Muddati o'tgan qarz: ${formatSumFull(Number(d.overdue_payments ?? 0))}.`;
}

// ——— Objects ———
export async function fetchObjects(baseUrl: BaseUrl, headers: Headers) {
  const list = await paginateAll(baseUrl, "/objects/", headers);
  return list as { id: number; name: string; total_apartments?: number }[];
}

export async function fetchObjectsCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchObjects(baseUrl, headers);
  return `Jami obyektlar ${list.length} ta.`;
}

export async function fetchObjectApartments(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const objects = await fetchObjects(baseUrl, headers);
  const obj = findByName(objects, "name", entity);
  if (!obj) return `${entity} obyekti topilmadi.`;
  return `${obj.name} da ${obj.total_apartments ?? 0} ta xonadon.`;
}

// ——— Apartments (rooms, floor, area, status, object) ———
type ApartmentRow = {
  id: number;
  room_number: string;
  object_name?: string;
  object?: number;
  price?: string | number;
  status?: string;
  rooms?: number;
  floor?: number;
  area?: number;
};

export async function fetchApartments(baseUrl: BaseUrl, headers: Headers, params?: string) {
  const path = params ? `/apartments/?${params}` : "/apartments/";
  const list = await paginateAll(baseUrl, path, headers, 5000);
  return list as ApartmentRow[];
}

export async function fetchApartmentsCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, "page_size=5000");
  return `Jami xonadonlar ${list.length} ta.`;
}

export async function fetchApartmentsFree(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, "status=bosh");
  return `Bo'sh xonadonlar ${list.length} ta.`;
}

const statusLabel: Record<string, string> = {
  bosh: "Bo'sh",
  band: "Band",
  muddatli: "Muddatli",
  sotilgan: "Sotilgan",
};

export async function fetchApartmentPrice(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const list = await fetchApartments(baseUrl, headers);
  const apt = list.find((a) =>
    `${a.object_name ?? ""} ${a.room_number}`.toLowerCase().includes(entity.toLowerCase())
  ) ?? list.find((a) => a.room_number.toLowerCase().includes(entity.toLowerCase()));
  if (!apt) return `${entity} xonadon topilmadi.`;
  return `${apt.object_name ?? ""} ${apt.room_number} narxi ${formatSumFull(Number(apt.price ?? 0))}.`;
}

export async function fetchApartmentStatus(baseUrl: BaseUrl, headers: Headers, entity: string): Promise<string> {
  const list = await fetchApartments(baseUrl, headers);
  const apt = list.find((a) =>
    `${a.object_name ?? ""} ${a.room_number}`.toLowerCase().includes(entity.toLowerCase())
  ) ?? list.find((a) => a.room_number.toLowerCase().includes(entity.toLowerCase()));
  if (!apt) return `${entity} xonadon topilmadi.`;
  const status = statusLabel[apt.status ?? ""] ?? apt.status ?? "Noma'lum";
  return `${apt.object_name ?? ""} ${apt.room_number} holati: ${status}.`;
}

/** X obyektda nechta sotilgan uy */
export async function fetchObjectSoldCount(baseUrl: BaseUrl, headers: Headers, objectName: string): Promise<string> {
  const objects = await fetchObjects(baseUrl, headers);
  const obj = findByName(objects, "name", objectName);
  if (!obj) return `${objectName} obyekti topilmadi.`;
  const list = await fetchApartments(baseUrl, headers, `object=${obj.id}&status=sotilgan`);
  return `${obj.name} obyektida sotilgan uylar ${list.length} ta.`;
}

/** X obyektda nechta bosh uy */
export async function fetchObjectBoshCount(baseUrl: BaseUrl, headers: Headers, objectName: string): Promise<string> {
  const objects = await fetchObjects(baseUrl, headers);
  const obj = findByName(objects, "name", objectName);
  if (!obj) return `${objectName} obyekti topilmadi.`;
  const list = await fetchApartments(baseUrl, headers, `object=${obj.id}&status=bosh`);
  return `${obj.name} obyektida bo'sh uylar ${list.length} ta.`;
}

/** Jami nechta sotilgan uy */
export async function fetchApartmentsSoldCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, "status=sotilgan");
  return `Jami sotilgan uylar ${list.length} ta.`;
}

/** Nechta uy sotilmagan (bosh + band + muddatli) */
export async function fetchApartmentsNotSoldCount(baseUrl: BaseUrl, headers: Headers): Promise<string> {
  const all = await fetchApartments(baseUrl, headers);
  const notSold = all.filter((a) => (a.status ?? "") !== "sotilgan");
  return `Sotilmagan (bo'sh, band, muddatli) uylar ${notSold.length} ta.`;
}

/** Jami kvadrat (barcha yoki sotilgan) — sotiladigan = sotilgan uylar kvadrati */
export async function fetchTotalArea(baseUrl: BaseUrl, headers: Headers, soldOnly: boolean): Promise<string> {
  const params = soldOnly ? "status=sotilgan" : "";
  const list = await fetchApartments(baseUrl, headers, params);
  const total = list.reduce((sum, a) => sum + Number(a.area ?? 0), 0);
  const label = soldOnly ? "Sotilgan uylar jami" : "Barcha xonadonlar jami";
  return `${label} ${total.toFixed(0)} kv.m.`;
}

/** Nechta N xonali bosh uy (masalan 1 xonali bosh) */
export async function fetchBoshApartmentsByRooms(baseUrl: BaseUrl, headers: Headers, roomsNum: number): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, `status=bosh&rooms=${roomsNum}`);
  const xonali = roomsNum === 1 ? "1 xonali" : `${roomsNum} xonali`;
  return `Bo'sh ${xonali} uylar ${list.length} ta.`;
}

/** N etajda nechta xonadon */
export async function fetchApartmentsByFloor(baseUrl: BaseUrl, headers: Headers, floorNum: number): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, `floor=${floorNum}`);
  return `${floorNum} etajda jami ${list.length} ta xonadon.`;
}

/** N etajda nechta M xonali */
export async function fetchApartmentsByFloorAndRooms(
  baseUrl: BaseUrl,
  headers: Headers,
  floorNum: number,
  roomsNum: number
): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, `floor=${floorNum}&rooms=${roomsNum}`);
  return `${floorNum} etajda ${roomsNum} xonali xonadonlar ${list.length} ta.`;
}

/** Qaysi obyektlarda N xonali bosh uy bor */
export async function fetchObjectsWithRoomsBosh(
  baseUrl: BaseUrl,
  headers: Headers,
  roomsNum: number
): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, `status=bosh&rooms=${roomsNum}`);
  const byObject = new Map<string, number>();
  for (const a of list) {
    const name = a.object_name ?? "Noma'lum";
    byObject.set(name, (byObject.get(name) ?? 0) + 1);
  }
  if (byObject.size === 0) return `${roomsNum} xonali bo'sh uylar yo'q.`;
  const parts = Array.from(byObject.entries()).map(([ob, c]) => `${ob}: ${c} ta`);
  return `${roomsNum} xonali bo'sh uylar bor obyektlar: ${parts.join(". ")}.`;
}

/** Qaysi obyektlarning N etajida bosh xonadon bor */
export async function fetchObjectsWithBoshOnFloor(
  baseUrl: BaseUrl,
  headers: Headers,
  floorNum: number
): Promise<string> {
  const list = await fetchApartments(baseUrl, headers, `status=bosh&floor=${floorNum}`);
  const byObject = new Map<string, number>();
  for (const a of list) {
    const name = a.object_name ?? "Noma'lum";
    byObject.set(name, (byObject.get(name) ?? 0) + 1);
  }
  if (byObject.size === 0) return `${floorNum} etajda bosh xonadon yo'q.`;
  const parts = Array.from(byObject.entries()).map(([ob, c]) => `${ob}: ${c} ta`);
  return `${floorNum} etajda bosh xonadon bor obyektlar: ${parts.join(". ")}.`;
}

// ——— Action: download report (generate-full + download) ———
export async function generateAndDownloadReport(
  baseUrl: BaseUrl,
  headers: Headers
): Promise<string> {
  const h = headers();
  if (!h) return "Tizimga kirish kerak.";
  try {
    const res = await fetch(`${baseUrl()}/reports/generate-full/`, { method: "POST", headers: h });
    if (res.status === 401) return "Session tugadi. Iltimos, qayta tizimga kiring.";
    if (!res.ok) return "Hisobot yaratishda xatolik.";
    const report = (await res.json()) as { id: number; title?: string };
    const downloadRes = await fetch(`${baseUrl()}/reports/${report.id}/download/`, { method: "GET", headers: h });
    if (!downloadRes.ok) return "Hisobot faylini yuklab olishda xatolik.";
    const blob = await downloadRes.blob();
    const filename = (report.title ?? "Ahlan_Hisobot").replace(/[^a-zA-Z0-9\-_.]/g, "_") + ".docx";
    const url = typeof window !== "undefined" ? window.URL.createObjectURL(blob) : null;
    if (url && typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    return "Hisobot yuklab olindi va kompyuteringizga saqlandi.";
  } catch {
    return "Hisobot yuklab olishda xatolik.";
  }
}

// ——— Action: add balance ———
export async function addBalanceToClient(
  baseUrl: BaseUrl,
  headers: Headers,
  entity: string,
  amount: number
): Promise<string> {
  const clients = await fetchClients(baseUrl, headers);
  const client = findClientByName(clients, entity);
  if (!client) return `${entity} topilmadi.`;
  const h = headers();
  if (!h) return "Tizimga kirish kerak.";
  const res = await fetch(`${baseUrl()}/users/${client.id}/add_balance/`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) return "Balans qo'shishda xatolik.";
  const data = await res.json().catch(() => ({}));
  const newBalance = (data as { balance?: number }).balance ?? Number(client.balance ?? 0) + amount;
  return `${client.fio} balansiga ${formatSumFull(amount)} qo'shildi. Yangi balans: ${formatSumFull(newBalance)}.`;
}
