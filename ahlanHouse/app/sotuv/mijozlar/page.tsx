"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartFilterBar } from "@/components/smart-filter-bar";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, Phone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Client {
  id: number;
  fio: string;
  phone_number?: string;
  address?: string;
  user_type?: string;
}

export default function SotuvMijozlarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      clearAuthAndRedirect(router, true);
      return;
    }
    const headers = getHeaders();
    if (!headers) return;
    setLoading(true);
    fetch(`${getApiBaseUrl()}/users/?user_type=mijoz&page_size=1000`, { headers })
      .then((r) => {
        if (r.status === 401) clearAuthAndRedirect(router, true);
        return r.json();
      })
      .then((d) => setClients(d.results || []))
      .catch(() => toast({ title: "Xatolik", description: "Mijozlar yuklanmadi", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [getHeaders, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fio?.toLowerCase().includes(q) ||
        c.phone_number?.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const chips = useMemo(() => {
    if (!search.trim()) return [];
    return [{ id: "search", label: "Qidiruv", value: search.trim() }];
  }, [search]);

  const exportCsv = useCallback(() => {
    const headers = ["F.I.O", "Telefon", "Manzil"];
    const rows = filtered.map((c) => [
      c.fio ?? "",
      c.phone_number ?? "",
      c.address ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mijozlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Eksport", description: `${filtered.length} ta mijoz CSV faylga yuklandi` });
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mijozlar</h1>
          <p className="text-muted-foreground">Jami: <span className="font-semibold text-foreground">{filtered.length}</span> ta · F.I.O., telefon yoki manzil bo&apos;yicha qidiruv</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> CSV eksport
        </Button>
      </div>

      <SmartFilterBar
        searchPlaceholder="F.I.O., telefon raqami yoki manzil bo&apos;yicha qidirish..."
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={() => setSearch("")}
        onClearAll={() => setSearch("")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{c.fio}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {c.phone_number && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {c.phone_number}
                </p>
              )}
              {c.address && <p className="mt-1 text-muted-foreground">{c.address}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "Qidiruv bo&apos;yicha mijoz topilmadi. Qidiruvni tozalang." : "Mijozlar ro&apos;yxati bo&apos;sh."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
