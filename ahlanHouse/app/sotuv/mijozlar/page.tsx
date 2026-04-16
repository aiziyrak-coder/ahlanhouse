"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartFilterBar } from "@/components/smart-filter-bar";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { getClientNote, setClientNote } from "@/app/lib/sotuv-storage";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, Phone, Download, MessageCircle, StickyNote, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Client {
  id: number;
  fio: string;
  phone_number?: string;
  address?: string;
  user_type?: string;
}

function digitsForTel(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("998")) return "+" + d;
  if (d.length === 9) return "+998" + d;
  if (d.length >= 10) return "+" + d;
  return phone.trim();
}

function waMeLink(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 9) return null;
  const n = d.startsWith("998") ? d : d.length === 9 ? "998" + d : d;
  return `https://wa.me/${n}`;
}

export default function SotuvMijozlarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

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
    fetch(`${getApiBaseUrl()}/users/?user_type=mijoz&page_size=2000`, { headers })
      .then((r) => {
        if (r.status === 401) clearAuthAndRedirect(router, true);
        return r.json();
      })
      .then((d) => {
        const list: Client[] = d.results || [];
        setClients(list);
        const map: Record<number, string> = {};
        list.forEach((c) => {
          map[c.id] = getClientNote(c.id);
        });
        setNotes(map);
      })
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
    const headers = ["F.I.O", "Telefon", "Manzil", "Sotuvchi qaydi"];
    const rows = filtered.map((c) => [
      c.fio ?? "",
      c.phone_number ?? "",
      c.address ?? "",
      (notes[c.id] || "").replace(/\r?\n/g, " ").replace(/"/g, '""'),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell)}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mijozlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Eksport", description: `${filtered.length} ta mijoz CSV faylga yuklandi` });
  }, [filtered, notes]);

  const saveNote = (id: number) => {
    setClientNote(id, notes[id] || "");
    toast({ title: "Saqlandi", description: "Qayd brauzeringizda saqlandi (faqat sizning qurilmangizda)." });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mijozlar</h1>
          <p className="text-muted-foreground">
            Jami: <span className="font-semibold text-foreground">{filtered.length}</span> ta · Telefon, WhatsApp, sotuvchi
            qaydi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sotuv/qidiruv">
              <ExternalLink className="h-4 w-4 mr-2" />
              Tez qidiruv
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> CSV eksport
          </Button>
        </div>
      </div>

      <SmartFilterBar
        searchPlaceholder="F.I.O., telefon raqami yoki manzil bo&apos;yicha qidirish..."
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={() => setSearch("")}
        onClearAll={() => setSearch("")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const wa = c.phone_number ? waMeLink(c.phone_number) : null;
          const tel = c.phone_number ? digitsForTel(c.phone_number) : null;
          return (
            <Card key={c.id} className="overflow-hidden border-emerald-100/80 dark:border-emerald-900/40">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base leading-tight truncate">{c.fio}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {c.phone_number && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate">{c.phone_number}</span>
                    </p>
                    {tel && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                        <a href={`tel:${tel}`}>Qo&apos;ng&apos;iroq</a>
                      </Button>
                    )}
                    {wa && (
                      <Button size="sm" className="h-8 text-xs bg-[#25D366] hover:bg-[#20bd5a] text-white" asChild>
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                {c.address && <p className="text-muted-foreground text-xs leading-relaxed">{c.address}</p>}
                <div className="space-y-1.5 pt-1 border-t">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />
                    Sotuvchi qaydi (shu qurilmada)
                  </label>
                  <Textarea
                    placeholder="Mijoz bilan suhbat, qayta aloqa sanasi..."
                    value={notes[c.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="min-h-[72px] text-xs resize-y"
                  />
                  <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={() => saveNote(c.id)}>
                    Qaydni saqlash
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
