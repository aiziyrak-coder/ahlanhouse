"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartFilterBar } from "@/components/smart-filter-bar";
import { getApiBaseUrl, getApiRoot, clearAuthAndRedirect } from "@/app/lib/api";
import { getCompareApartmentIds, toggleCompareApartmentId, clearCompareApartments } from "@/app/lib/sotuv-storage";
import { toast } from "@/hooks/use-toast";
import { Loader2, Layers, X, Glasses, Maximize2, ChevronLeft, ChevronRight, Smartphone, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Apartment {
  id: number;
  room_number: string;
  rooms: number;
  area: number;
  floor: number;
  price: string;
  status: string;
  object: number;
  object_name?: string;
  model_3d?: string | null;
  model_3d_url?: string | null;
  internal_model_3d_url?: string | null;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          "camera-controls"?: boolean;
          ar?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string | number;
        },
        HTMLElement
      >;
    }
  }
}

interface ObjectItem {
  id: number;
  name: string;
}

const STATUS_OPTIONS: Record<string, string> = {
  "": "Barcha holatlar",
  bosh: "Bo'sh",
  band: "Band",
  sotilgan: "Sotilgan",
  paid: "To'langan",
  muddatli: "Muddatli",
};

export default function SotuvUylarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectParam = searchParams.get("object") || "";

  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterObject, setFilterObject] = useState("");
  const [objectParamApplied, setObjectParamApplied] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"floor" | "room" | "price">("floor");
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    setCompareIds(getCompareApartmentIds());
  }, []);

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
    fetch(`${getApiBaseUrl()}/objects/?page_size=1000`, { headers })
      .then((r) => r.json())
      .then((d) => setObjects(d.results || []))
      .catch(() => {});
  }, [getHeaders]);

  // URL dan ?object= ni faqat obyektlar yuklangandan keyin qo‘llash (obyekt mavjud bo‘lsa)
  useEffect(() => {
    if (objectParamApplied || !objectParam || objects.length === 0) return;
    const exists = objects.some((o) => String(o.id) === objectParam);
    if (exists) setFilterObject(objectParam);
    setObjectParamApplied(true);
  }, [objectParam, objects, objectParamApplied]);

  useEffect(() => {
    const headers = getHeaders();
    if (!headers) return;
    setLoading(true);
    let url = `${getApiBaseUrl()}/apartments/?page_size=10000`;
    if (filterObject) url += `&object=${filterObject}`;
    fetch(url, { headers })
      .then((r) => {
        if (r.status === 401) clearAuthAndRedirect(router, true);
        return r.json();
      })
      .then((d) => setApartments(d.results || []))
      .catch(() => toast({ title: "Xatolik", description: "Uylar yuklanmadi", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [getHeaders, filterObject, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = apartments;
    if (q) {
      list = list.filter(
        (a) =>
          a.room_number?.toLowerCase().includes(q) ||
          a.object_name?.toLowerCase().includes(q) ||
          String(a.rooms).includes(q) ||
          String(a.floor).includes(q) ||
          String(a.area).includes(q)
      );
    }
    if (filterStatus) list = list.filter((a) => a.status === filterStatus);
    if (filterRooms) list = list.filter((a) => String(a.rooms) === filterRooms);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min != null && !isNaN(min)) list = list.filter((a) => Number(a.price) >= min);
    if (max != null && !isNaN(max)) list = list.filter((a) => Number(a.price) <= max);
    const sorted = [...list];
    if (sortBy === "floor") sorted.sort((a, b) => a.floor - b.floor || (parseInt(String(a.room_number), 10) || 0) - (parseInt(String(b.room_number), 10) || 0));
    else if (sortBy === "room") sorted.sort((a, b) => (parseInt(String(a.room_number), 10) || 0) - (parseInt(String(b.room_number), 10) || 0));
    else if (sortBy === "price") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    return sorted;
  }, [apartments, search, filterStatus, filterRooms, minPrice, maxPrice, sortBy]);

  /** Qavat bo‘yicha guruhlash — bitta qatorda bitta etaj */
  const byFloor = useMemo(() => {
    const map = new Map<number, Apartment[]>();
    filtered.forEach((a) => {
      const f = a.floor ?? 0;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(a);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  const chips = useMemo(() => {
    const c: { id: string; label: string; value?: string }[] = [];
    if (search.trim()) c.push({ id: "search", label: "Qidiruv", value: search.trim() });
    if (filterObject) {
      const obj = objects.find((o) => String(o.id) === filterObject);
      c.push({ id: "object", label: "Obyekt", value: obj?.name || filterObject });
    }
    if (filterStatus) c.push({ id: "status", label: "Holat", value: STATUS_OPTIONS[filterStatus] || filterStatus });
    if (filterRooms) c.push({ id: "rooms", label: "Xonalar", value: filterRooms });
    if (minPrice) c.push({ id: "minPrice", label: "Min narx", value: `${minPrice} $` });
    if (maxPrice) c.push({ id: "maxPrice", label: "Maks narx", value: `${maxPrice} $` });
    if (sortBy !== "floor") c.push({ id: "sort", label: "Tartib", value: sortBy === "room" ? "Xona raqami" : "Narx" });
    return c;
  }, [search, filterObject, filterStatus, filterRooms, minPrice, maxPrice, objects, sortBy]);

  const clearAll = () => {
    setSearch("");
    setFilterObject("");
    setFilterStatus("");
    setFilterRooms("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("floor");
  };

  const removeChip = (id: string) => {
    if (id === "search") setSearch("");
    else if (id === "object") setFilterObject("");
    else if (id === "status") setFilterStatus("");
    else if (id === "rooms") setFilterRooms("");
    else if (id === "minPrice") setMinPrice("");
    else if (id === "maxPrice") setMaxPrice("");
    else if (id === "sort") setSortBy("floor");
  };

  const formatPrice = (p: string | number) => {
    const n = Number(p);
    if (isNaN(n)) return "-";
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " $";
  };

  const uniqueRooms = useMemo(() => {
    const set = new Set(apartments.map((a) => a.rooms).filter((r) => r != null));
    return Array.from(set).sort((a, b) => a - b);
  }, [apartments]);

  const modelUrl = selectedApartment?.model_3d_url ?? selectedApartment?.model_3d ?? selectedApartment?.internal_model_3d_url ?? null;
  const absoluteModelUrl = modelUrl
    ? modelUrl.startsWith("http")
      ? modelUrl
      : `${getApiRoot()}${modelUrl.startsWith("/") ? "" : "/"}${modelUrl}`
    : null;

  const sameFloorList = useMemo(() => {
    if (!selectedApartment) return [];
    return filtered.filter((a) => a.floor === selectedApartment.floor).sort((a, b) => (parseInt(String(a.room_number), 10) || 0) - (parseInt(String(b.room_number), 10) || 0));
  }, [filtered, selectedApartment]);
  const currentIndex = selectedApartment ? sameFloorList.findIndex((a) => a.id === selectedApartment.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < sameFloorList.length - 1;
  const goPrev = () => { if (hasPrev) { setModelLoading(true); setViewerKey((k) => k + 1); setSelectedApartment(sameFloorList[currentIndex - 1]!); } };
  const goNext = () => { if (hasNext) { setModelLoading(true); setViewerKey((k) => k + 1); setSelectedApartment(sameFloorList[currentIndex + 1]!); } };

  useEffect(() => {
    if (!absoluteModelUrl) setModelLoading(false);
    else {
      const t = setTimeout(() => setModelLoading(false), 3500);
      return () => clearTimeout(t);
    }
  }, [absoluteModelUrl]);

  if (loading && apartments.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-0 rounded-xl border bg-card overflow-hidden">
      <Script src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.3.0/dist/model-viewer-umd.min.js" strategy="lazyOnload" />

      {/* Chap: filtrlash va qavatlar — faqat shu joy scroll */}
      <aside className="w-full md:w-[50%] md:max-w-[520px] flex flex-col min-h-0 overflow-hidden border-r">
        <div className="p-4 border-b bg-muted/30 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">Uylar</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kartani bosing — 3D. Checkbox: taqqoslash (3 tagacha).
              </p>
            </div>
            {compareIds.length > 0 && (
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => setCompareOpen(true)} disabled={compareIds.length < 2}>
                <GitCompare className="h-4 w-4" />
                Taqqoslash ({compareIds.length})
              </Button>
            )}
          </div>
        </div>
        <div className="p-3 border-b shrink-0">
          <SmartFilterBar
        searchPlaceholder="Xona raqami, obyekt nomi, qavat, maydon..."
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
      >
        <Select value={filterObject || "all"} onValueChange={(v) => setFilterObject(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Obyekt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha obyektlar</SelectItem>
            {objects.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            {Object.entries(STATUS_OPTIONS)
              .filter(([k]) => k !== "")
              .map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filterRooms || "all"} onValueChange={(v) => setFilterRooms(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Xonalar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha</SelectItem>
            {uniqueRooms.map((r) => (
              <SelectItem key={r} value={String(r)}>{r} xona</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-24"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Maks $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24"
          />
        </div>
        <Select value={sortBy} onValueChange={(v: "floor" | "room" | "price") => setSortBy(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tartiblash" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="floor">Qavat bo‘yicha</SelectItem>
            <SelectItem value="room">Xona raqami</SelectItem>
            <SelectItem value="price">Narx bo‘yicha</SelectItem>
          </SelectContent>
        </Select>
          </SmartFilterBar>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-3">
          {byFloor.map(([floorNum, list]) => (
            <Card key={floorNum} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold">{floorNum}-qavat</span>
                <span className="text-xs text-muted-foreground">({list.length} xonadon)</span>
              </div>
              <CardContent className="p-2">
                <div className="flex flex-wrap gap-1.5">
                  {list.map((apt) => (
                    <div
                      key={apt.id}
                      className={`flex min-w-0 shrink-0 w-[104px] sm:w-[108px] rounded-md border bg-card overflow-hidden transition-all ${
                        selectedApartment?.id === apt.id ? "ring-2 ring-emerald-500 border-emerald-500/50" : "hover:border-emerald-400/50"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex flex-1 min-w-0 flex-col p-1.5 text-left hover:bg-muted/60 active:scale-[0.98]"
                        onClick={() => {
                          setModelLoading(!!(apt.model_3d_url || apt.model_3d || apt.internal_model_3d_url));
                          setSelectedApartment(apt);
                        }}
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <span className="font-semibold text-[11px] truncate">№{apt.room_number}</span>
                          <Badge variant={apt.status === "bosh" ? "default" : "secondary"} className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                            {STATUS_OPTIONS[apt.status] || apt.status}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {apt.rooms}x · {apt.area} m²
                        </p>
                        <p className="font-semibold text-emerald-600 text-[10px] mt-0.5">{formatPrice(apt.price)}</p>
                      </button>
                      <div
                        className="flex shrink-0 items-start border-l bg-muted/20 px-0.5 py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={compareIds.includes(apt.id)}
                          onCheckedChange={() => setCompareIds(toggleCompareApartmentId(apt.id))}
                          aria-label="Taqqoslashga qo'shish"
                          className="mt-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm space-y-1">
                {apartments.length === 0 ? (
                  <>
                    <p>{filterObject ? "Bu obyektda uylar ro&apos;yxati bo&apos;sh." : "Uylar ro&apos;yxati bo&apos;sh."}</p>
                    <p className="text-xs">Tozalash bosing yoki boshqa filtrlarni tanlang.</p>
                  </>
                ) : (
                  <>
                    <p>Filtr bo&apos;yicha uy topilmadi.</p>
                    <p className="text-xs">Tozalash bosing.</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </aside>

      {/* O'ng: 3D blok — viewportdan chiqmasin */}
      <main className="flex-1 min-h-0 md:min-w-0 flex flex-col bg-muted/20 border-l overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
          {selectedApartment ? (
            <>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm truncate">№{selectedApartment.room_number} · {selectedApartment.object_name || ""}</h2>
                <p className="text-xs text-muted-foreground">{selectedApartment.rooms} xona · {selectedApartment.area} m² · {selectedApartment.floor}-qavat · {formatPrice(selectedApartment.price)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {hasPrev && <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Oldingi"><ChevronLeft className="h-4 w-4" /></Button>}
                {hasNext && <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Keyingi"><ChevronRight className="h-4 w-4" /></Button>}
                {absoluteModelUrl && (
                  <>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => viewerContainerRef.current?.requestFullscreen?.()}> <Maximize2 className="h-3.5 w-3.5 mr-1" /> To&apos;liq ekran</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const el = viewerContainerRef.current?.querySelector("model-viewer"); if (el && "ar" in el) (el as unknown as { ar: { activate: () => void } }).ar?.activate?.(); }}><Smartphone className="h-3.5 w-3.5 mr-1" /> AR</Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedApartment(null)}><X className="h-4 w-4 mr-1" /> Tozalash</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Xonadonni tanlang — 3D model shu yerda ko&apos;rsatiladi</p>
          )}
        </div>
        <div ref={viewerContainerRef} className="flex-1 min-h-0 relative bg-black/95 overflow-hidden">
          {modelLoading && absoluteModelUrl && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            </div>
          )}
          <AnimatePresence mode="wait">
            {selectedApartment && absoluteModelUrl ? (
              <motion.div
                key={`${selectedApartment.id}-${viewerKey}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {/* @ts-expect-error model-viewer web component */}
                <model-viewer
                  src={absoluteModelUrl}
                  alt={`Xonadon №${selectedApartment.room_number}`}
                  camera-controls
                  ar
                  auto-rotate
                  shadow-intensity="1.2"
                  exposure="1.4"
                  environment-image="legacy"
                  className="w-full h-full block"
                  style={{ minHeight: 260 }}
                />
              </motion.div>
            ) : selectedApartment ? (
              <motion.div
                key="no-model"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <Glasses className="h-14 w-14 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Bu xonadon uchun 3D model yuklanmagan</p>
                <p className="text-xs text-muted-foreground">Obyektlar sahifasida yuklang</p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <Glasses className="h-14 w-14 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Chapdan xonadon kartasini bosing</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Xonadonlarni taqqoslash
            </DialogTitle>
            <DialogDescription>
              Mijozga bir vaqtda narx, maydon va holatni ko&apos;rsatish uchun jadval.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Xona</TableHead>
                <TableHead>Obyekt</TableHead>
                <TableHead>Qavat</TableHead>
                <TableHead>Xonalar</TableHead>
                <TableHead>Maydon</TableHead>
                <TableHead className="text-right">Narx</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compareIds
                .map((id) => apartments.find((a) => a.id === id))
                .filter((a): a is Apartment => Boolean(a))
                .map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">№{a.room_number}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{a.object_name || "—"}</TableCell>
                    <TableCell>{a.floor}</TableCell>
                    <TableCell>{a.rooms}</TableCell>
                    <TableCell>{a.area} m²</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatPrice(a.price)}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "bosh" ? "default" : "secondary"} className="text-xs">
                        {STATUS_OPTIONS[a.status] || a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearCompareApartments();
                setCompareIds([]);
                setCompareOpen(false);
              }}
            >
              Tanlovlarni tozalash
            </Button>
            <Button type="button" size="sm" onClick={() => setCompareOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
