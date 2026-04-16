"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { Loader2, Search, Home, Users, ArrowLeft } from "lucide-react";

interface ApartmentRow {
  id: number;
  object?: number;
  room_number: string;
  object_name?: string;
  rooms: number;
  floor: number;
  area: number;
  price: string;
  status: string;
}

interface ClientRow {
  id: number;
  fio: string;
  phone_number?: string;
  address?: string;
}

export default function SotuvQidiruvPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"apartments" | "clients">("apartments");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState<ApartmentRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);

  const headers = useCallback(() => {
    const t = localStorage.getItem("access_token");
    if (!t) return null;
    return { Accept: "application/json", Authorization: `Bearer ${t}` };
  }, []);

  const loadAll = useCallback(async () => {
    const h = headers();
    if (!h) {
      clearAuthAndRedirect(router, true);
      return;
    }
    setLoading(true);
    try {
      const api = getApiBaseUrl();
      const [aRes, cRes] = await Promise.all([
        fetch(`${api}/apartments/?page_size=5000`, { headers: h }),
        fetch(`${api}/users/?user_type=mijoz&page_size=2000`, { headers: h }),
      ]);
      if (aRes.status === 401 || cRes.status === 401) {
        clearAuthAndRedirect(router, true);
        return;
      }
      const aJson = await aRes.json().catch(() => ({}));
      const cJson = await cRes.json().catch(() => ({}));
      setApartments(aJson.results || []);
      setClients(cJson.results || []);
    } finally {
      setLoading(false);
    }
  }, [headers, router]);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      clearAuthAndRedirect(router, true);
      return;
    }
    void loadAll();
  }, [loadAll, router]);

  const q = query.trim().toLowerCase();

  const aptHits = useMemo(() => {
    if (!q) return apartments.slice(0, 40);
    return apartments
      .filter(
        (a) =>
          a.room_number?.toLowerCase().includes(q) ||
          a.object_name?.toLowerCase().includes(q) ||
          String(a.floor).includes(q) ||
          String(a.rooms).includes(q) ||
          String(a.area).includes(q) ||
          String(a.price).includes(q) ||
          (a.status || "").toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [apartments, q]);

  const clientHits = useMemo(() => {
    if (!q) return clients.slice(0, 40);
    return clients
      .filter(
        (c) =>
          c.fio?.toLowerCase().includes(q) ||
          c.phone_number?.replace(/\s/g, "").toLowerCase().includes(q.replace(/\s/g, "")) ||
          c.address?.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [clients, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
            <Link href="/sotuv" aria-label="Orqaga">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Search className="h-7 w-7 text-emerald-600" />
              Tez qidiruv
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Barcha uylar va mijozlar orasidan bir joyda qidiring; natijani uylar sahifasida ochish uchun havola bor.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ma'lumotni yangilash"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qidiruv so&apos;zi</CardTitle>
          <CardDescription>Kamida 1 belgi yozing — natijalar filtrlanadi (brauzerda).</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Masalan: 12-xona, obyekt nomi, telefon, F.I.O..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xl"
          />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "apartments" | "clients")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="apartments" className="gap-2">
            <Home className="h-4 w-4" />
            Uylar ({aptHits.length})
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Mijozlar ({clientHits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apartments" className="mt-4 space-y-2">
          {loading && apartments.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            </div>
          ) : aptHits.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {q ? "Hech narsa topilmadi." : "Uylar yuklanmoqda yoki ro&apos;yxat bo&apos;sh."}
            </p>
          ) : (
            aptHits.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">
                    №{a.room_number} · {a.object_name || "Obyekt"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.rooms} xona · {a.area} m² · {a.floor}-qavat ·{" "}
                    {Number(a.price).toLocaleString("en-US")} $
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "bosh" ? "default" : "secondary"}>{a.status}</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={a.object != null ? `/sotuv/uylar?object=${a.object}` : "/sotuv/uylar"}>
                      Uylar sahifasida ochish
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-2">
          {clientHits.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {q ? "Mijoz topilmadi." : "Mijozlar yuklanmoqda..."}
            </p>
          ) : (
            clientHits.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/40">
                <div>
                  <p className="font-medium">{c.fio}</p>
                  <p className="text-sm text-muted-foreground">{c.phone_number || "—"}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/sotuv/mijozlar">Mijozlar ro&apos;yxatiga</Link>
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
