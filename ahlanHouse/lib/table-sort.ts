/**
 * Generic table sort: sorts array by key with optional custom getter and numeric/date handling.
 */
export function sortByKey<T>(
  items: T[],
  sortKey: string | null,
  dir: "asc" | "desc" | null,
  getter?: (item: T, key: string) => unknown
): T[] {
  if (!sortKey || !dir || items.length === 0) return items;

  const get = getter ?? ((item: T, key: string) => (item as Record<string, unknown>)[key]);
  const toNum = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? null : n;
  };
  const cmp = (a: T, b: T): number => {
    const va = get(a, sortKey);
    const vb = get(b, sortKey);
    if (va == null && vb == null) return 0;
    if (va == null) return dir === "asc" ? 1 : -1;
    if (vb == null) return dir === "asc" ? -1 : 1;
    if (typeof va === "number" && typeof vb === "number") {
      return dir === "asc" ? va - vb : vb - va;
    }
    const na = toNum(va);
    const nb = toNum(vb);
    if (na !== null && nb !== null) {
      return dir === "asc" ? na - nb : nb - na;
    }
    if (va instanceof Date && vb instanceof Date) {
      return dir === "asc" ? va.getTime() - vb.getTime() : vb.getTime() - va.getTime();
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return dir === "asc" ? -1 : 1;
    if (sa > sb) return dir === "asc" ? 1 : -1;
    return 0;
  };

  return [...items].sort(cmp);
}
