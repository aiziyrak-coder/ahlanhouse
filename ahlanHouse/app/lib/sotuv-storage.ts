/** Sotuv bo'limi: brauzerda saqlanadigan yordamchi ma'lumotlar (serverga yuborilmaydi). */

const NOTE_PREFIX = "sotuv-client-note:";
const COMPARE_KEY = "sotuv-compare-apartment-ids";

export function getClientNote(clientId: number): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${NOTE_PREFIX}${clientId}`) ?? "";
}

export function setClientNote(clientId: number, text: string): void {
  if (typeof window === "undefined") return;
  const key = `${NOTE_PREFIX}${clientId}`;
  if (!text.trim()) localStorage.removeItem(key);
  else localStorage.setItem(key, text);
}

export function getCompareApartmentIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).slice(0, 4);
  } catch {
    return [];
  }
}

export function setCompareApartmentIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 4)));
}

export function clearCompareApartments(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(COMPARE_KEY);
}

export function toggleCompareApartmentId(id: number, max = 3): number[] {
  const cur = getCompareApartmentIds();
  const i = cur.indexOf(id);
  if (i >= 0) {
    cur.splice(i, 1);
    setCompareApartmentIds(cur);
    return cur;
  }
  if (cur.length >= max) {
    cur.shift();
  }
  cur.push(id);
  setCompareApartmentIds(cur);
  return cur;
}
