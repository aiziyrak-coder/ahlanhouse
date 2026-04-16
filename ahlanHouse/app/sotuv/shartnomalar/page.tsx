"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartFilterBar } from "@/components/smart-filter-bar";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSignature, Calendar } from "lucide-react";

interface Payment {
  id: number;
  user_fio?: string;
  apartment_info?: string;
  apartment: number;
  payment_type: string;
  total_amount?: string;
  paid_amount: string;
  status: string;
  created_at: string;
}

const PAYMENT_TYPES: Record<string, string> = {
  "": "Barcha turlar",
  naqd: "Naqd",
  muddatli: "Muddatli",
  ipoteka: "Ipoteka",
  band: "Band",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  "": "Barcha holatlar",
  pending: "Kutilmoqda",
  paid: "To'langan",
  overdue: "Muddati o'tgan",
};

export default function SotuvShartnomalarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) clearAuthAndRedirect(router, true);
  }, [router]);

  useEffect(() => {
    const headers = getHeaders();
    if (!headers) return;
    setLoading(true);
    fetch(`${getApiBaseUrl()}/payments/?ordering=-created_at&page_size=1000`, { headers })
      .then((r) => {
        if (r.status === 401) clearAuthAndRedirect(router, true);
        return r.json();
      })
      .then((d) => setPayments(d.results || []))
      .catch(() => toast({ title: "Xatolik", description: "To'lovlar yuklanmadi", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [getHeaders, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = payments;
    if (q) {
      list = list.filter(
        (p) =>
          p.user_fio?.toLowerCase().includes(q) ||
          p.apartment_info?.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }
    if (filterType) list = list.filter((p) => p.payment_type === filterType);
    if (filterPaymentStatus) list = list.filter((p) => p.status === filterPaymentStatus);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((p) => new Date(p.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).setHours(23, 59, 59, 999);
      list = list.filter((p) => new Date(p.created_at).getTime() <= to);
    }
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    if (min != null && !isNaN(min)) list = list.filter((p) => Number(p.paid_amount) >= min);
    if (max != null && !isNaN(max)) list = list.filter((p) => Number(p.paid_amount) <= max);
    return list;
  }, [payments, search, filterType, filterPaymentStatus, dateFrom, dateTo, minAmount, maxAmount]);

  const chips = useMemo(() => {
    const c: { id: string; label: string; value?: string }[] = [];
    if (search.trim()) c.push({ id: "search", label: "Qidiruv", value: search.trim() });
    if (filterType) c.push({ id: "type", label: "Tur", value: PAYMENT_TYPES[filterType] || filterType });
    if (filterPaymentStatus)
      c.push({ id: "pstatus", label: "Holat", value: PAYMENT_STATUS_LABELS[filterPaymentStatus] || filterPaymentStatus });
    if (dateFrom) c.push({ id: "dateFrom", label: "Dan", value: dateFrom });
    if (dateTo) c.push({ id: "dateTo", label: "Gacha", value: dateTo });
    if (minAmount) c.push({ id: "minAmount", label: "Min summa", value: `${minAmount} $` });
    if (maxAmount) c.push({ id: "maxAmount", label: "Maks summa", value: `${maxAmount} $` });
    return c;
  }, [search, filterType, filterPaymentStatus, dateFrom, dateTo, minAmount, maxAmount]);

  const clearAll = () => {
    setSearch("");
    setFilterType("");
    setFilterPaymentStatus("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const removeChip = (id: string) => {
    if (id === "search") setSearch("");
    else if (id === "type") setFilterType("");
    else if (id === "pstatus") setFilterPaymentStatus("");
    else if (id === "dateFrom") setDateFrom("");
    else if (id === "dateTo") setDateTo("");
    else if (id === "minAmount") setMinAmount("");
    else if (id === "maxAmount") setMaxAmount("");
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
  };

  const formatMoney = (v: string | number) => {
    const n = Number(v);
    if (isNaN(n)) return "-";
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " $";
  };

  const totalFilteredSum = useMemo(
    () => filtered.reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0),
    [filtered]
  );

  const setDatePreset = (preset: "bugun" | "hafta" | "oy") => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    if (preset === "bugun") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === "hafta") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const ws = weekStart.toISOString().slice(0, 10);
      setDateFrom(ws);
      setDateTo(todayStr);
    } else {
      setDateFrom(`${y}-${m}-01`);
      setDateTo(todayStr);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="h-7 w-7 text-amber-500" />
          Shartnomalar
        </h1>
        <p className="text-muted-foreground mt-1">
          Mijoz, xonadon, to&apos;lov turi, sana yoki summa bo&apos;yicha filtrlash
        </p>
      </div>

      <SmartFilterBar
        searchPlaceholder="Mijoz F.I.O., xonadon yoki to&apos;lov ID..."
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
      >
        <div className="flex items-center gap-1 rounded-md border p-1 bg-muted/30">
          <Calendar className="h-4 w-4 text-muted-foreground ml-1" />
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDatePreset("bugun")}>Bugun</Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDatePreset("hafta")}>Hafta</Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDatePreset("oy")}>Oy</Button>
        </div>
        <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="To'lov turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha turlar</SelectItem>
            {Object.entries(PAYMENT_TYPES)
              .filter(([k]) => k !== "")
              .map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filterPaymentStatus || "all"} onValueChange={(v) => setFilterPaymentStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Shartnoma holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS)
              .filter(([k]) => k !== "")
              .map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="Dan"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[140px]"
        />
        <Input
          type="date"
          placeholder="Gacha"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[140px]"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-24"
          />
          <Input
            type="number"
            placeholder="Maks $"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="w-24"
          />
        </div>
      </SmartFilterBar>

      <Card>
        <CardHeader>
          <CardTitle>To&apos;lovlar ro&apos;yxati</CardTitle>
          <CardDescription>
            Jami: <span className="font-semibold text-foreground">{filtered.length}</span> ta · To&apos;langan summa: <span className="font-semibold text-emerald-600">{formatMoney(totalFilteredSum)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.slice(0, 100).map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{p.user_fio || `To'lov #${p.id}`}</p>
                  <p className="text-sm text-muted-foreground">{p.apartment_info || `Xonadon #${p.apartment}`}</p>
                </div>
                <div className="text-right text-sm space-y-1">
                  <Badge
                    variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {PAYMENT_STATUS_LABELS[p.status] || p.status}
                  </Badge>
                  <p>{formatMoney(p.paid_amount)} to&apos;langan</p>
                  <p className="text-muted-foreground">{formatDate(p.created_at)} · {p.payment_type}</p>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              {chips.length || search ? "Filtr bo&apos;yicha to&apos;lov topilmadi." : "To&apos;lovlar topilmadi."}
            </p>
          )}
          {filtered.length > 100 && (
            <p className="text-center text-sm text-muted-foreground pt-2">
              Ko&apos;rsatilmoqda: 100 / {filtered.length}. Qidiruvni toraytiring.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
