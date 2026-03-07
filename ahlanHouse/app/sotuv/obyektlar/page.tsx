"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Building,
  Building2,
  Glasses,
  Home,
  Upload,
  Trash2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ObjectItem {
  id: number;
  name: string;
  address?: string;
  total_apartments: number;
  floors: number;
  model_3d?: string | null;
  model_3d_url?: string | null;
}

interface Apartment {
  id: number;
  room_number: string;
  object: number;
  object_name?: string;
  status?: string;
  rooms?: number;
  floor?: number;
  model_3d?: string | null;
  model_3d_url?: string | null;
  internal_model_3d_url?: string | null;
  segment_id?: string | null;
}

interface RoomTypeModelItem {
  id: number;
  room_count: number;
  model_3d?: string | null;
  model_3d_url?: string | null;
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

export default function SotuvObyektlarPage() {
  const router = useRouter();
  const viewerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "floors" | "apartments">("name");
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"main" | "internal" | "apartment">("main");
  const [uploadObjectId, setUploadObjectId] = useState("");
  const [uploadRoomTypeId, setUploadRoomTypeId] = useState("");
  const [uploadApartmentId, setUploadApartmentId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [roomTypeModels, setRoomTypeModels] = useState<RoomTypeModelItem[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [patchingSegment, setPatchingSegment] = useState<number | null>(null);
  const [deleting3d, setDeleting3d] = useState<"main" | "internal" | "apartment" | null>(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const fetchData = useCallback(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/sotuv/login");
      return;
    }
    const headers = getHeaders();
    if (!headers) return;
    setLoading(true);
    Promise.all([
      fetch(`${getApiBaseUrl()}/objects/?page_size=1000`, { headers }).then((r) => {
        if (r.status === 401) { clearAuthAndRedirect(router, true); return null; }
        return r.json();
      }),
      fetch(`${getApiBaseUrl()}/apartments/?page_size=5000`, { headers }).then((r) => {
        if (r.status === 401) { clearAuthAndRedirect(router, true); return null; }
        return r.json();
      }),
      fetch(`${getApiBaseUrl()}/room-type-models/`, { headers }).then((r) => {
        if (r.status === 401) { clearAuthAndRedirect(router, true); return null; }
        return r.json();
      }),
    ])
      .then(([objData, aptData, roomData]) => {
        if (objData) setObjects(objData.results || []);
        if (aptData) setApartments(aptData.results || []);
        if (Array.isArray(roomData)) setRoomTypeModels(roomData);
        else if (roomData?.results) setRoomTypeModels(roomData.results);
      })
      .catch(() => {
        toast({ title: "Xatolik", description: "Ma'lumotlar yuklanmadi", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [getHeaders, router]);

  useEffect(() => {
    if (!selectedObjectId || !getHeaders()) return;
    fetch(`${getApiBaseUrl()}/objects/${selectedObjectId}/segments/`, { headers: getHeaders()! })
      .then((r) => {
        if (r.status === 401) { clearAuthAndRedirect(router, true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data) => setSegments(data?.segments ?? []))
      .catch(() => setSegments([]));
  }, [selectedObjectId, getHeaders, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAndSortedObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = objects;
    if (q) {
      list = list.filter(
        (obj) =>
          obj.name?.toLowerCase().includes(q) ||
          obj.address?.toLowerCase().includes(q) ||
          String(obj.total_apartments).includes(q) ||
          String(obj.floors).includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "floors") return (a.floors ?? 0) - (b.floors ?? 0);
      return (a.total_apartments ?? 0) - (b.total_apartments ?? 0);
    });
  }, [objects, search, sortBy]);

  const apartmentsOfObject = useMemo(
    () => (selectedObjectId ? apartments.filter((a) => a.object === selectedObjectId) : []),
    [apartments, selectedObjectId]
  );

  const selectedObject = selectedObjectId ? objects.find((o) => o.id === selectedObjectId) : null;
  const selectedApartment = selectedApartmentId ? apartments.find((a) => a.id === selectedApartmentId) : null;

  const toAbsolute = (url: string | null | undefined) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${getApiRoot()}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const objectMainModelUrl = selectedObject ? toAbsolute(selectedObject.model_3d_url ?? selectedObject.model_3d) : null;
  const apartmentModelUrl = selectedApartment
    ? toAbsolute(selectedApartment.model_3d_url ?? selectedApartment.model_3d ?? selectedApartment.internal_model_3d_url)
    : null;
  const displayModelUrl = selectedApartment ? apartmentModelUrl : objectMainModelUrl;
  const absoluteModelUrl = displayModelUrl;

  const chips = useMemo(() => {
    const c: { id: string; label: string; value?: string }[] = [];
    if (search.trim()) c.push({ id: "search", label: "Qidiruv", value: search.trim() });
    if (sortBy !== "name")
      c.push({ id: "sort", label: "Tartib", value: sortBy === "floors" ? "Qavatlar" : "Xonadonlar" });
    return c;
  }, [search, sortBy]);

  const clearAll = () => {
    setSearch("");
    setSortBy("name");
  };

  const handleSelectObject = (objectId: number) => {
    setSelectedObjectId(objectId);
    setSelectedApartmentId(null);
  };

  const handleSelectApartment = (aptId: number) => {
    setViewerKey((k) => k + 1);
    setSelectedApartmentId(aptId);
  };

  const handleSegmentChange = async (apartmentId: number, segmentId: string) => {
    const headers = getHeaders();
    if (!headers) return;
    setPatchingSegment(apartmentId);
    try {
      const res = await fetch(`${getApiBaseUrl()}/apartments/${apartmentId}/set_segment/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ segment_id: segmentId || null }),
      });
      if (res.status === 401) { clearAuthAndRedirect(router, true); return; }
      if (!res.ok) throw new Error("Saqlanmadi");
      const updated = await res.json();
      setApartments((prev) => prev.map((a) => (a.id === apartmentId ? { ...a, ...updated } : a)));
    } catch {
      toast({ title: "Xatolik", description: "Segment biriktirilmadi", variant: "destructive" });
    } finally {
      setPatchingSegment(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/sotuv/login");
      return;
    }
    if (!uploadFile) {
      toast({ title: "Xatolik", description: "Fayl tanlang", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("model_3d", uploadFile);
      let url: string;
      if (uploadTab === "main" && uploadObjectId) {
        url = `${getApiBaseUrl()}/objects/${uploadObjectId}/upload_3d/`;
      } else if (uploadTab === "internal" && uploadRoomTypeId) {
        url = `${getApiBaseUrl()}/room-type-models/${uploadRoomTypeId}/upload_3d/`;
      } else if (uploadTab === "apartment" && uploadApartmentId) {
        url = `${getApiBaseUrl()}/apartments/${uploadApartmentId}/upload_3d/`;
      } else {
        toast({ title: "Xatolik", description: "Obyekt yoki xona turi yoki xonadon tanlang", variant: "destructive" });
        setUploading(false);
        return;
      }
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.status === 401) { clearAuthAndRedirect(router, true); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Yuklash xatosi: ${res.status}`);
      }
      toast({ title: "Muvaffaqiyat", description: "3D model yuklandi" });
      setUploadFile(null);
      fetchData();
      setViewerKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Xatolik",
        description: e instanceof Error ? e.message : "Yuklash amalga oshmadi",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete3d = async (tab: "main" | "internal" | "apartment", id: string) => {
    if (!id) return;
    const headers = getHeaders();
    if (!headers) return;
    setDeleting3d(tab);
    try {
      let url: string;
      if (tab === "main") url = `${getApiBaseUrl()}/objects/${id}/delete_3d/`;
      else if (tab === "internal") url = `${getApiBaseUrl()}/room-type-models/${id}/delete_3d/`;
      else url = `${getApiBaseUrl()}/apartments/${id}/delete_3d/`;
      const res = await fetch(url, { method: "POST", headers });
      if (res.status === 401) { clearAuthAndRedirect(router, true); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `O'chirish xatosi: ${res.status}`);
      }
      toast({ title: "O'chirildi", description: "3D model o'chirildi" });
      fetchData();
      setViewerKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Xatolik",
        description: e instanceof Error ? e.message : "O'chirish amalga oshmadi",
        variant: "destructive",
      });
    } finally {
      setDeleting3d(null);
    }
  };

  const selectedObjForDelete = objects.find((o) => String(o.id) === uploadObjectId);
  const selectedRtForDelete = roomTypeModels.find((r) => String(r.id) === uploadRoomTypeId);
  const selectedAptForDelete = apartments.find((a) => String(a.id) === uploadApartmentId);
  const canDeleteMain = uploadObjectId && (selectedObjForDelete?.model_3d_url ?? selectedObjForDelete?.model_3d);
  const canDeleteInternal = uploadRoomTypeId && (selectedRtForDelete?.model_3d_url ?? selectedRtForDelete?.model_3d);
  const canDeleteApartment = uploadApartmentId && (selectedAptForDelete?.model_3d_url ?? selectedAptForDelete?.model_3d);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-emerald-500" />
          Obyektlar va 3D / Virtual tur
        </h1>
        <p className="text-muted-foreground">
          Asosiy obyekt modeli bitta yuklanadi (bino tashqisi); dastur uni segmentlarga ajratadi (1_1, 1_2, …). Xonadonlarni segmentga birikting. 1x–4x uchun ichki modellar alohida yuklanadi — barcha shu xonali uylar bitta modeldan foydalanadi.
        </p>
      </div>

      <Script
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.3.0/dist/model-viewer-umd.min.js"
        strategy="lazyOnload"
      />

      <div className="flex h-[calc(100vh-12rem)] min-h-[480px] flex-col md:flex-row gap-0 overflow-hidden rounded-xl border bg-card">
        {/* Chap panel — 3D viewer */}
        <main className="relative order-2 md:order-1 flex flex-1 flex-col min-w-0 bg-black/5 md:min-w-[320px] md:flex-[7]">
          <div className="border-b px-3 py-2 flex items-center gap-2">
            <Glasses className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">3D ko&apos;rinish</h2>
          </div>
          <div className="relative flex-1 min-h-[280px] flex flex-col">
            <AnimatePresence mode="wait">
              {absoluteModelUrl ? (
                <motion.div
                  key={selectedApartment ? `apt-${selectedApartment.id}-${viewerKey}` : `obj-${selectedObjectId}-${viewerKey}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div ref={viewerRef} className="relative flex-1 w-full overflow-hidden rounded-bl-xl min-h-[240px]">
                    {/* @ts-expect-error model-viewer web component */}
                    <model-viewer
                      src={absoluteModelUrl}
                      alt={selectedApartment ? `Xonadon №${selectedApartment.room_number}` : selectedObject ? `Obyekt: ${selectedObject.name}` : "3D"}
                      camera-controls
                      ar
                      auto-rotate
                      shadow-intensity="1"
                      exposure="1.4"
                      environment-image="legacy"
                      className="absolute inset-0 h-full w-full block"
                      style={{ minHeight: 240 }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t bg-card/95 p-2 backdrop-blur sm:p-3">
                    <span className="text-sm font-medium">
                      {selectedApartment
                        ? `№${selectedApartment.room_number}${selectedApartment.object_name ? ` · ${selectedApartment.object_name}` : ""}`
                        : selectedObject
                          ? `Asosiy obyekt: ${selectedObject.name}`
                          : ""}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <a href={absoluteModelUrl} download target="_blank" rel="noopener noreferrer">
                        Yuklab olish
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const el = viewerRef.current?.querySelector("model-viewer");
                        if (el && "ar" in el) (el as unknown as { ar: { activate: () => void } }).ar?.activate?.();
                      }}
                    >
                      AR rejim
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="no-model"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-bl-xl bg-muted/50 p-6 text-center"
                >
                  <Glasses className="h-14 w-14 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    O&apos;ngdan obyektni tanlang — asosiy bino modeli ko&apos;rsatiladi. Xonadonni bosing — ichki model (xona turi bo&apos;yicha).
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Asosiy obyekt modeli bitta yuklanadi; dastur uni segmentlarga (1_1, 1_2, …) ajratadi. Xonadonlarni shu segmentlarga birikting. 1x, 2x, 3x, 4x uchun ichki modellar alohida yuklanadi. Agar model yuklanmasa (KHR_materials… xatosi), .glb/.gltf ni qayta yuklang — tizim metallic-roughness ga o&apos;giradi.
                  </p>
                  {selectedApartment && !absoluteModelUrl && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Bu xonadon uchun ichki model ({(selectedApartment as Apartment).rooms ?? 0}x) yuklanmagan yoki xona turi modeli yo&apos;q.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* O'ng panel — filtrlash, obyektlar, xonadonlar, yuklash */}
        <aside className="flex w-full flex-col border-l bg-muted/30 md:w-[36%] md:min-w-[280px] md:max-w-[420px] order-1 md:order-2 overflow-hidden">
          <div className="border-b bg-background/80 p-3">
            <SmartFilterBar
              searchPlaceholder="Obyekt nomi, manzil, xonadonlar soni..."
              searchValue={search}
              onSearchChange={setSearch}
              chips={chips}
              onRemoveChip={(id) => (id === "search" ? setSearch("") : setSortBy("name"))}
              onClearAll={clearAll}
            >
              <Select value={sortBy} onValueChange={(v: "name" | "floors" | "apartments") => setSortBy(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tartiblash" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom bo&apos;yicha</SelectItem>
                  <SelectItem value="floors">Qavatlar bo&apos;yicha</SelectItem>
                  <SelectItem value="apartments">Xonadonlar soni</SelectItem>
                </SelectContent>
              </Select>
            </SmartFilterBar>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <section>
              <h3 className="flex items-center gap-1.5 mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building className="h-3.5 w-3.5" />
                Obyektlar
              </h3>
              <div className="space-y-1">
                {filteredAndSortedObjects.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => handleSelectObject(obj.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                      selectedObjectId === obj.id
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium"
                        : "border-transparent bg-background/80 hover:border-emerald-300 hover:bg-emerald-500/10"
                    )}
                  >
                    <span>{obj.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({obj.total_apartments} uy · {obj.floors} qavat)
                    </span>
                    {(obj.model_3d_url ?? obj.model_3d) && (
                      <CheckCircle className="ml-1.5 inline-block h-4 w-4 text-emerald-500" title="Asosiy model yuklangan" />
                    )}
                  </button>
                ))}
              </div>
              {filteredAndSortedObjects.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {search || chips.length ? "Filtr bo&apos;yicha obyekt topilmadi." : "Obyektlar yo&apos;q."}
                </p>
              )}
            </section>

            {selectedObjectId != null && (
              <section>
                <h3 className="flex items-center gap-1.5 mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Home className="h-3.5 w-3.5" />
                  Xonadonlar — {selectedObject?.name}
                </h3>
                <div className="space-y-1">
                  {apartmentsOfObject.map((apt) => {
                    const hasModel = !!(apt.model_3d_url || apt.model_3d || apt.internal_model_3d_url);
                    const isSelected = selectedApartmentId === apt.id;
                    return (
                      <div key={apt.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectApartment(apt.id)}
                          className={cn(
                            "flex-1 rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
                            "hover:border-emerald-400 hover:shadow-sm",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50"
                              : "border-border bg-background hover:bg-emerald-500/10"
                          )}
                        >
                          <span className="font-medium">№{apt.room_number}</span>
                          {apt.segment_id && <span className="ml-1 text-xs text-muted-foreground">({apt.segment_id})</span>}
                          {hasModel ? (
                            <CheckCircle className="ml-1.5 inline-block h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">(ichki yo&apos;q)</span>
                          )}
                        </button>
                        <Select
                          value={apt.segment_id ?? "all"}
                          onValueChange={(v) => handleSegmentChange(apt.id, v === "all" ? "" : v)}
                          disabled={patchingSegment === apt.id}
                        >
                          <SelectTrigger className="w-[72px] h-8 text-xs shrink-0">
                            <SelectValue placeholder="Segment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">—</SelectItem>
                            {segments.map((sid) => (
                              <SelectItem key={sid} value={sid}>
                                {sid}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
                {apartmentsOfObject.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">Bu obyektda xonadonlar ro&apos;yxati bo&apos;sh.</p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/sotuv/uylar?object=${selectedObjectId}`}>
                    Barcha uylar <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </section>
            )}
          </div>

          <div className="border-t p-2 bg-background/80">
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-500" />
                3D model yuklash
              </span>
            </button>
            {showUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex gap-1 p-1 border rounded-lg bg-muted/30">
                  {(["main", "internal", "apartment"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setUploadTab(tab)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
                        uploadTab === tab ? "bg-background shadow" : "hover:bg-background/50"
                      )}
                    >
                      {tab === "main" ? "Asosiy obyekt" : tab === "internal" ? "Ichki (1x–4x)" : "Xonadon override"}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleUpload} className="mt-2 space-y-2 p-2">
                  {uploadTab === "main" && (
                    <Select value={uploadObjectId} onValueChange={setUploadObjectId} required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Obyekt tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {objects.map((obj) => (
                          <SelectItem key={obj.id} value={String(obj.id)}>
                            {obj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {uploadTab === "internal" && (
                    <Select value={uploadRoomTypeId} onValueChange={setUploadRoomTypeId} required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Xona turi (1x, 2x, 3x, 4x)" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypeModels.map((rt) => (
                          <SelectItem key={rt.id} value={String(rt.id)}>
                            {rt.room_count} xonali {rt.model_3d_url ? "✓" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {uploadTab === "apartment" && (
                    <Select value={uploadApartmentId} onValueChange={setUploadApartmentId} required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Xonadon tanlang (ixtiyoriy)" />
                      </SelectTrigger>
                      <SelectContent>
                        {apartments.map((apt) => (
                          <SelectItem key={apt.id} value={String(apt.id)}>
                            №{apt.room_number} {apt.object_name ? ` · ${apt.object_name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    type="file"
                    accept=".glb,.gltf,.zip"
                    className="text-xs"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    .glb / .gltf yoki .zip (ichida model + teksturalar)
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full"
                    disabled={
                      uploading ||
                      !uploadFile ||
                      (uploadTab === "main" && !uploadObjectId) ||
                      (uploadTab === "internal" && !uploadRoomTypeId) ||
                      (uploadTab === "apartment" && !uploadApartmentId)
                    }
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yuklash"}
                  </Button>
                </form>
              </motion.div>
            )}

            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                3D model o&apos;chirish
              </p>
              <div className="flex gap-1 p-1 border rounded-lg bg-muted/30 mb-2">
                {(["main", "internal", "apartment"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setUploadTab(tab)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
                      uploadTab === tab ? "bg-background shadow" : "hover:bg-background/50"
                    )}
                  >
                    {tab === "main" ? "Obyekt" : tab === "internal" ? "Ichki" : "Xonadon"}
                  </button>
                ))}
              </div>
              {uploadTab === "main" && (
                <div className="flex gap-2">
                  <Select value={uploadObjectId} onValueChange={setUploadObjectId}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue placeholder="Obyekt tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {objects.map((obj) => (
                        <SelectItem key={obj.id} value={String(obj.id)}>
                          {obj.name} {(obj.model_3d_url ?? obj.model_3d) ? "✓" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    disabled={!canDeleteMain || deleting3d !== null}
                    onClick={() => handleDelete3d("main", uploadObjectId)}
                  >
                    {deleting3d === "main" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {uploadTab === "internal" && (
                <div className="flex gap-2">
                  <Select value={uploadRoomTypeId} onValueChange={setUploadRoomTypeId}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue placeholder="Xona turi" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypeModels.map((rt) => (
                        <SelectItem key={rt.id} value={String(rt.id)}>
                          {rt.room_count} xonali {rt.model_3d_url ? "✓" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    disabled={!canDeleteInternal || deleting3d !== null}
                    onClick={() => handleDelete3d("internal", uploadRoomTypeId)}
                  >
                    {deleting3d === "internal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {uploadTab === "apartment" && (
                <div className="flex gap-2">
                  <Select value={uploadApartmentId} onValueChange={setUploadApartmentId}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue placeholder="Xonadon tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {apartments.map((apt) => (
                        <SelectItem key={apt.id} value={String(apt.id)}>
                          №{apt.room_number} {apt.object_name ? ` · ${apt.object_name}` : ""} {(apt.model_3d_url ?? apt.model_3d) ? "✓" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    disabled={!canDeleteApartment || deleting3d !== null}
                    onClick={() => handleDelete3d("apartment", uploadApartmentId)}
                  >
                    {deleting3d === "apartment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
