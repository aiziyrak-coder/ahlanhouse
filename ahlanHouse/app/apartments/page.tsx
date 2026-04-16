"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Home, Calendar, Plus, Trash2, Edit, CreditCard,
    LayoutGrid,
    List,
    Layers,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { sortByKey } from "@/lib/table-sort";
import { toast } from "@/hooks/use-toast";
import { Toaster, toast as hotToast } from "react-hot-toast";

import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
const API_BASE_URL = getApiBaseUrl();
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "-1003733316489";

const ALL_STATUSES = [
  { value: "bosh", label: "Bo'sh" },
  { value: "band", label: "Band" },
  { value: "sotilgan", label: "Sotilgan" },
  { value: "muddatli", label: "Muddatli" },
];
const ALL_ROOM_OPTIONS = [
  { value: "1", label: "1 xona" },
  { value: "2", label: "2 xona" },
  { value: "3", label: "3 xona" },
  { value: "4", label: "4 xona" },
];
const ALL_FLOOR_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}-qavat`,
}));
const ITEMS_PER_PAGE = 24;

interface Document {
  id: number;
  payment: number;
  document_type: string;
  docx_file?: string | null;
  pdf_file?: string | null;
  image?: string | null;
  created_at: string;
}
interface Payment {
  id: number;
  user: number;
  user_fio?: string;
  apartment: number;
  apartment_info?: string;
  payment_type: string;
  total_amount: number | string;
  initial_payment: number | string;
  monthly_payment: number | string;
  paid_amount: number | string;
  created_at: string;
}
interface OverduePayment {
  month: string;
  amount: number;
  due_date: string;
}
interface Apartment {
  id: number;
  room_number: string;
  rooms: number;
  area: number;
  floor: number;
  price: number | string;
  status: string;
  object: number | { id: number; name: string };
  object_name: string;
  reservation_date?: string;
  payment?: Payment | null;
  originalStatus?: string;
  calculatedTotalPaid?: number | null;
  calculatedRemaining?: number | null;
  calculatedTotalAmount?: number | null;
}
interface Client {
  id: number;
  fio: string;
  username?: string;
  phone_number?: string;
  user_type?: string;
}
interface ObjectData {
  id: number;
  name: string;
  total_apartments?: number;
  floors?: number;
  address?: string;
  description?: string;
  image?: string | null;
}

interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const formatCurrency = (amount: number | undefined | null | string) => {
    if (amount == null || isNaN(Number(amount))) return "-";
    return Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace('$', '') + ' $';
};

export default function ApartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId") || searchParams.get("property") || "";
  const roomsParam = searchParams.get("rooms") || "";
  const statusParam = searchParams.get("status") || "";

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [filterStats, setFilterStats] = useState<{ total: number; bosh: number; band: number; sotilgan: number; muddatli?: number } | null>(null);
  const [filters, setFilters] = useState({
    status: statusParam,
    rooms: roomsParam,
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    floor: "",
    search: "",
    property: propertyIdParam,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [apartmentToDelete, setApartmentToDelete] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    room_number: "",
    rooms: "",
    area: "",
    floor: "",
    price: "",
    status: "",
    object: "",
  });
  const [viewMode, setViewMode] = useState<"grid" | "table" | "shaxmat">("grid");
  const [shaxmatSize, setShaxmatSize] = useState<"sm" | "md" | "lg">("md");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSortKey, setTableSortKey] = useState<string | null>(null);
  const [tableSortDir, setTableSortDir] = useState<SortDirection>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [showDebtorsModal, setShowDebtorsModal] = useState(false);
  const [debtors, setDebtors] = useState<Apartment[]>([]);

  const getAuthHeaders = useCallback(() => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const sendTelegramNotification = useCallback(async (message: string) => {
    const headers = getAuthHeaders();
    if (!headers || !(headers as Record<string, string>)["Authorization"] || !TELEGRAM_CHAT_ID) return;
    try {
      const res = await fetch(`${API_BASE_URL}/telegram/send-message/`, {
        method: "POST",
        headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || res.statusText);
      }
    } catch (error) {
      console.error("Telegram xabarnomasini yuborishda xatolik:", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya qilinmagan. Iltimos, tizimga kiring.",
          variant: "destructive",
        });
        router.push("/login");
      } else {
        setAccessToken(token);
        const userTypeFromStorage = localStorage.getItem("user_type");
        const userFioFromStorage = localStorage.getItem("user_fio");

        if (userTypeFromStorage && userFioFromStorage) {
          setCurrentUser({
            user_type: userTypeFromStorage as CurrentUser['user_type'],
            fio: userFioFromStorage,
          });
        } else {
          setCurrentUser(null);
        }
      }
    }
  }, [router]);

  const canPerformSensitiveActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) return false;
    const isRestrictedRole = user.user_type === 'sotuvchi' || user.user_type === 'buxgalter';
    const hasSardorInFio = user.fio.toLowerCase().includes('sardor');
    if (isRestrictedRole || hasSardorInFio) return false;
    return true;
  }, []);

  const fetchProperties = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE_URL}/objects/?page_size=1000`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Obyektlarni olishda xatolik (${response.status})`);
      const data = await response.json();
      setProperties(data.results || []);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  }, [accessToken, getAuthHeaders]);

  const fetchApartments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/apartments/`;
      const queryParams = new URLSearchParams();

      if (filters.property && filters.property !== "all") queryParams.append("object", filters.property);
      else if (propertyIdParam && filters.property !== "all" && !filters.property) queryParams.append("object", propertyIdParam);
      if (filters.rooms && filters.rooms !== "all") queryParams.append("rooms", filters.rooms);
      if (filters.minPrice) queryParams.append("price__gte", filters.minPrice);
      if (filters.maxPrice) queryParams.append("price__lte", filters.maxPrice);
      if (filters.minArea) queryParams.append("area__gte", filters.minArea);
      if (filters.maxArea) queryParams.append("area__lte", filters.maxArea);
      if (filters.floor && filters.floor !== "all") queryParams.append("floor", filters.floor);
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.status && filters.status !== "all" && filters.status !== "") {
        if (filters.status.toLowerCase() === "sotilgan") queryParams.append("status__in", "paid,sotilgan");
        else if (filters.status.toLowerCase() === "muddatli") queryParams.append("status__in", "paid,sotilgan,muddatli,ipoteka,subsidiya,pending");
        else queryParams.append("status", filters.status.toLowerCase());
      }
      queryParams.append("page_size", ITEMS_PER_PAGE.toString());
      queryParams.append("page", currentPage.toString());
      if (queryParams.toString()) url += `?${queryParams.toString()}`;

      const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
      if (response.status === 401) { clearAuthAndRedirect(router); return; }
      if (!response.ok) throw new Error(`Xonadonlarni olishda xatolik (${response.status})`);
      const data = await response.json();
      setFilterStats(data.filter_stats || null);
      setTotalPages(Math.ceil((data.count || 0) / ITEMS_PER_PAGE));
      const detailFetchPromises = (data.results || []).map(async (apartment: any) => {
        let allPayments: Payment[] = [];
        let calculatedTotalPaid: number | null = 0;
        let calculatedRemaining: number | null = null;
        let calculatedTotalAmount: number | null = parseFloat(apartment.price as string) || 0;
        let primaryPayment: Payment | null = null;
        if (apartment.status?.toLowerCase() !== 'bosh') {
          try {
            const paymentUrl = `${API_BASE_URL}/payments/?apartment=${apartment.id}&ordering=created_at&page_size=500`;
            const paymentResponse = await fetch(paymentUrl, { method: "GET", headers: getAuthHeaders() });
            if (paymentResponse.status === 401) { clearAuthAndRedirect(router); return; }
            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              allPayments = paymentData.results || [];
              if (allPayments.length > 0) {
                primaryPayment = allPayments[0];
                const firstPaymentTotal = parseFloat(primaryPayment.total_amount as string);
                if (!isNaN(firstPaymentTotal) && firstPaymentTotal > 0) calculatedTotalAmount = firstPaymentTotal;
                if (primaryPayment.user) {
                  const userResponse = await fetch(`${API_BASE_URL}/users/${primaryPayment.user}/`, { method: 'GET', headers: getAuthHeaders() });
                  if (userResponse.status === 401) { clearAuthAndRedirect(router); return; }
                  if (userResponse.ok) primaryPayment.user_fio = (await userResponse.json()).fio;
                }
                calculatedTotalPaid = allPayments.reduce((sum, p) => sum + (parseFloat(p.paid_amount as string) || 0), 0);
                calculatedRemaining = (calculatedTotalAmount ?? 0) - (calculatedTotalPaid ?? 0);
              }
            }
          } catch (error) { }
        } else {
          calculatedRemaining = calculatedTotalAmount;
        }
        let objectName = apartment.object_name || "Noma'lum obyekt";
        if (!apartment.object_name && apartment.object && properties.length > 0) {
          const objectId = typeof apartment.object === "object" ? apartment.object.id : apartment.object;
          objectName = properties.find(p => p.id === objectId)?.name || objectName;
        }
        return {
          ...apartment,
          price: parseFloat(apartment.price as string) || 0,
          status: apartment.status?.toLowerCase() === 'paid' ? 'sotilgan' : apartment.status,
          originalStatus: apartment.status, object_name: objectName, calculatedTotalPaid, calculatedRemaining,
          calculatedTotalAmount, payment: primaryPayment, reservation_date: apartment.reserved_until,
        };
      });
      let detailedApartments = await Promise.all(detailFetchPromises);
      if (filters.status.toLowerCase() === 'muddatli') detailedApartments = detailedApartments.filter(apt => apt.payment?.payment_type.toLowerCase() === 'muddatli');
      else if (filters.status.toLowerCase() === 'sotilgan') detailedApartments = detailedApartments.filter(apt => apt.status.toLowerCase() === 'sotilgan');
      detailedApartments.sort((a, b) => {
        const aObjectName = a.object_name || '';
        const bObjectName = b.object_name || '';
        if (aObjectName.localeCompare(bObjectName) !== 0) return aObjectName.localeCompare(bObjectName);
        return (parseInt(a.room_number, 10) || 0) - (parseInt(b.room_number, 10) || 0);
      });
      setApartments(detailedApartments);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [accessToken, filters, propertyIdParam, getAuthHeaders, router, properties, currentPage]);

  const confirmDeleteApartment = useCallback(async () => {
    if (!canPerformSensitiveActions(currentUser)) {
      hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", { position: "top-center" });
      setDeleteModalOpen(false); return;
    }
    if (!accessToken || !apartmentToDelete || !currentUser) return;
    const apartmentDetails = apartments.find(apt => apt.id === apartmentToDelete);
    if (!apartmentDetails) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${apartmentToDelete}/`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.status === 401) { clearAuthAndRedirect(router); return; }
      if (!response.ok) throw new Error(`Xonadonni o'chirishda xatolik (${response.status})`);
      
      const message = `<b>❌🏢 Xonadon O'chirildi</b>\n\n` +
                      `<b>Kim tomonidan:</b> ${currentUser.fio}\n` +
                      `<b>O'chirilgan xonadon:</b> №${apartmentDetails.room_number}, ${apartmentDetails.rooms} xona\n` +
                      `<b>Obyekt:</b> ${apartmentDetails.object_name}\n` +
                      `<b>O'chirish vaqtidagi holati:</b> ${apartmentDetails.status}\n` +
                      `<b>Narxi:</b> ${formatCurrency(apartmentDetails.price)}`;
      await sendTelegramNotification(message);

      hotToast.success("Muvaffaqiyatli o'chirildi", { position: "top-right" });
      fetchApartments();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setApartmentToDelete(null);
    }
  }, [accessToken, apartmentToDelete, fetchApartments, getAuthHeaders, currentUser, sendTelegramNotification, apartments, router]);

  const updateApartment = useCallback(async () => {
    if (!canPerformSensitiveActions(currentUser)) {
      hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", { position: "top-center" });
      setEditModalOpen(false); return;
    }
    if (!accessToken || !selectedApartment || !currentUser) return;
    setIsUpdating(true);
    try {
      const payload = {
        room_number: editForm.room_number,
        rooms: parseInt(editForm.rooms),
        area: parseFloat(editForm.area),
        floor: parseInt(editForm.floor),
        price: parseFloat(editForm.price),
        status: editForm.status === 'sotilgan' ? 'paid' : editForm.status,
        object: parseInt(editForm.object),
      };
      const response = await fetch(`${API_BASE_URL}/apartments/${selectedApartment.id}/`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.status === 401) { clearAuthAndRedirect(router); return; }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Xonadonni yangilashda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }

      const changes = [];
      if (selectedApartment.room_number !== payload.room_number) changes.push(`• <b>Xona raqami:</b> <code>${selectedApartment.room_number}</code> → <code>${payload.room_number}</code>`);
      if (selectedApartment.rooms !== payload.rooms) changes.push(`• <b>Xonalar soni:</b> <code>${selectedApartment.rooms}</code> → <code>${payload.rooms}</code>`);
      if (selectedApartment.area !== payload.area) changes.push(`• <b>Maydoni:</b> <code>${selectedApartment.area} m²</code> → <code>${payload.area} m²</code>`);
      if (selectedApartment.floor !== payload.floor) changes.push(`• <b>Qavat:</b> <code>${selectedApartment.floor}</code> → <code>${payload.floor}</code>`);
      if (parseFloat(selectedApartment.price as string) !== payload.price) changes.push(`• <b>Narxi:</b> <code>${formatCurrency(selectedApartment.price)}</code> → <code>${formatCurrency(payload.price)}</code>`);
      if ((selectedApartment.status === 'paid' ? 'sotilgan' : selectedApartment.status) !== editForm.status) changes.push(`• <b>Holati:</b> <code>${selectedApartment.status}</code> → <code>${editForm.status}</code>`);
      const oldObjectId = typeof selectedApartment.object === "object" ? selectedApartment.object.id : selectedApartment.object;
      if (oldObjectId !== payload.object) {
        const oldObjectName = properties.find(p => p.id === oldObjectId)?.name || 'Noma`lum';
        const newObjectName = properties.find(p => p.id === payload.object)?.name || 'Noma`lum';
        changes.push(`• <b>Obyekt:</b> <code>${oldObjectName}</code> → <code>${newObjectName}</code>`);
      }

      if (changes.length > 0) {
        const message = `<b>✏️🏢 Xonadon Tahrirlandi</b>\n\n` +
                        `<b>Kim tomonidan:</b> ${currentUser.fio}\n` +
                        `<b>Obyekt:</b> ${selectedApartment.object_name}\n` +
                        `<b>Xonadon №:</b> ${selectedApartment.room_number}\n\n` +
                        `<b>Quyidagi ma'lumotlar o'zgartirildi:</b>\n` +
                        changes.join('\n');
        await sendTelegramNotification(message);
      }

      toast({ title: "Muvaffaqiyat", description: "Xonadon muvaffaqiyatli yangilandi." });
      setEditModalOpen(false);
      fetchApartments();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  }, [accessToken, selectedApartment, editForm, fetchApartments, getAuthHeaders, currentUser, sendTelegramNotification, properties, router]);

  useEffect(() => { if (accessToken) fetchProperties(); }, [accessToken, fetchProperties]);

  useEffect(() => { if (accessToken && (properties.length > 0 || !propertyIdParam)) fetchApartments(); }, [accessToken, filters, propertyIdParam, fetchApartments, properties, currentPage]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value }));
    setCurrentPage(1);
  };

  const openEditModal = (apartment: Apartment) => {
    if (!canPerformSensitiveActions(currentUser)) {
      hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", { position: "top-center" });
      return;
    }
    setSelectedApartment(apartment);
    setEditForm({
      room_number: apartment.room_number || "",
      rooms: apartment.rooms.toString() || "",
      area: apartment.area.toString() || "",
      floor: apartment.floor.toString() || "",
      price: (apartment.price as number).toString() || "",
      status: apartment.status === 'paid' ? 'sotilgan' : apartment.status || "",
      object: (typeof apartment.object === "object" ? apartment.object.id : apartment.object).toString() || "",
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (name: string, value: string) => {
    setEditForm((prev) => {
      const updatedForm = { ...prev, [name]: value };
      if (name === 'area') {
        const parsedArea = parseFloat(value);
        const objectInfo = properties.find(p => p.id.toString() === updatedForm.object);
        let pricePerSqM = 550;
        if (objectInfo && objectInfo.name.toLowerCase().includes("qorasaroy")) pricePerSqM = 600;
        if (!isNaN(parsedArea)) updatedForm.price = (parsedArea * pricePerSqM).toString();
      }
      return updatedForm;
    });
  };

  const getStatusBadge = (status: string, paymentType?: string) => {
    const lowerStatus = status?.toLowerCase();
    if (paymentType?.toLowerCase() === "muddatli") return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
    switch (lowerStatus) {
      case "bosh": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo'sh</Badge>;
      case "band": return <Badge className="bg-red-500 hover:bg-red-600 text-white">Band</Badge>;
      case "sotilgan": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>;
      case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>;
      case "ipoteka": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>;
      case "subsidiya": return <Badge className="bg-teal-500 hover:bg-teal-600 text-white">Subsidiya</Badge>;
      default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  const getPaymentTypeLabel = (paymentType: string | undefined) => {
    switch (paymentType?.toLowerCase()) {
      case "naqd": return "Naqd (To'liq)";
      case "muddatli": return "Muddatli to'lov";
      case "ipoteka": return "Ipoteka";
      case "subsidiya": return "Subsidiya";
      case "band": return "Band qilish";
      case "barter": return "Barter";
      default: return paymentType || "Noma'lum";
    }
  };

  const toggleViewMode = () => setViewMode((prevMode) => (prevMode === "grid" ? "table" : prevMode === "table" ? "shaxmat" : "grid"));

  /** Xonadonlarni qavat bo‘yicha guruhlash (shaxmat ko‘rinishi uchun) */
  const apartmentsByFloor = useMemo(() => {
    const byFloor = new Map<number, Apartment[]>();
    apartments.forEach((a) => {
      const floorNum = typeof a.floor === "number" ? a.floor : parseInt(String(a.floor ?? ""), 10) || 0;
      if (!byFloor.has(floorNum)) byFloor.set(floorNum, []);
      byFloor.get(floorNum)!.push(a);
    });
    byFloor.forEach((list) =>
      list.sort((x, y) => (parseInt(String(x.room_number), 10) || 0) - (parseInt(String(y.room_number), 10) || 0))
    );
    return Array.from(byFloor.entries()).sort(([a], [b]) => a - b);
  }, [apartments]);

  const apartmentSortGetter = (item: Apartment, key: string) => {
    if (key === "room_number") return parseInt(String(item.room_number || ""), 10) || 0;
    if (key === "floor") return typeof item.floor === "number" ? item.floor : parseInt(String(item.floor ?? ""), 10) || 0;
    if (key === "rooms") return typeof item.rooms === "number" ? item.rooms : parseInt(String(item.rooms ?? ""), 10) || 0;
    if (key === "area") return typeof item.area === "number" ? item.area : parseFloat(String(item.area ?? "")) || 0;
    const total = item.calculatedTotalAmount ?? item.price;
    if (key === "calculatedTotalAmount") return typeof total === "number" ? total : parseFloat(String(total ?? "")) || 0;
    const rem = item.calculatedRemaining ?? 0;
    if (key === "calculatedRemaining") return typeof rem === "number" ? rem : parseFloat(String(rem)) || 0;
    return (item as Record<string, unknown>)[key];
  };
  const sortedApartments = sortByKey(apartments, tableSortKey, tableSortDir, apartmentSortGetter);

  const handleTableSort = useCallback((key: string, dir: SortDirection) => {
    setTableSortKey(dir ? key : null);
    setTableSortDir(dir);
  }, []);

  const renderApartmentTable = (apartmentsToRender: Apartment[]) => {
    const showSensitiveControls = canPerformSensitiveActions(currentUser);
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] text-center">#</TableHead>
                  <SortableTableHead sortKey="object_name" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[100px] min-w-[100px]">Obyekt</SortableTableHead>
                  <SortableTableHead sortKey="room_number" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[70px]">Xona</SortableTableHead>
                  <SortableTableHead sortKey="floor" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[60px]">Qavat</SortableTableHead>
                  <SortableTableHead sortKey="rooms" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[70px]">Xonalar</SortableTableHead>
                  <SortableTableHead sortKey="area" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[90px]">Maydon (m²)</SortableTableHead>
                  <SortableTableHead sortKey="calculatedTotalAmount" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[110px] text-right">Jami Narx ($)</SortableTableHead>
                  <SortableTableHead sortKey="status" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[100px]">Holati</SortableTableHead>
                  <TableHead className="w-[120px]">To'lov Turi</TableHead>
                  <SortableTableHead sortKey="calculatedRemaining" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="w-[110px] text-right">Qoldiq ($)</SortableTableHead>
                  {showSensitiveControls && <TableHead className="w-[100px] text-right">Amallar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartmentsToRender.length === 0 ? (
                  <TableRow><TableCell colSpan={showSensitiveControls ? 11 : 10} className="h-24 text-center">Xonadonlar topilmadi.</TableCell></TableRow>
                ) : (
                  apartmentsToRender.map((apartment, index) => {
                    const remainingAmount = apartment.calculatedRemaining;
                    const displayTotalAmount = apartment.calculatedTotalAmount ?? apartment.price;
                    const isBosh = apartment.status?.toLowerCase() === 'bosh';
                    return (
                      <TableRow key={apartment.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/apartments/${apartment.id}`)}>
                        <TableCell className="text-center font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]" title={apartment.object_name}>{apartment.object_name}</TableCell>
                        <TableCell className="font-medium">{apartment.room_number}</TableCell>
                        <TableCell>{apartment.floor}</TableCell>
                        <TableCell>{apartment.rooms}</TableCell>
                        <TableCell>{apartment.area}</TableCell>
                        <TableCell className="text-right">{formatCurrency(displayTotalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(apartment.status, apartment.payment?.payment_type)}</TableCell>
                        <TableCell>{apartment.payment ? getPaymentTypeLabel(apartment.payment.payment_type) : isBosh ? '–' : '—'}</TableCell>
                        <TableCell className={`text-right ${remainingAmount !== null && remainingAmount < 0 ? 'text-orange-600' : remainingAmount !== null && remainingAmount > 0 ? 'text-red-600' : ''}`}>{isBosh || remainingAmount === null ? '-' : formatCurrency(remainingAmount)}</TableCell>
                        {showSensitiveControls && (
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditModal(apartment); }} title="Tahrirlash" disabled={loading}><Edit className="h-4 w-4 text-yellow-500" /></Button>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setApartmentToDelete(apartment.id); setDeleteModalOpen(true); }} title="O'chirish" disabled={loading}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  return (
    <div className="flex min-h-screen flex-col">
      <Dialog open={showDebtorsModal} onOpenChange={setShowDebtorsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Qarzdorlar ro'yxati</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Umumiy qarzdorlar</div><div className="text-2xl font-bold">{debtors.length}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Umumiy summa</div><div className="text-2xl font-bold text-blue-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedTotalAmount ?? 0), 0))}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">To'langan summa</div><div className="text-2xl font-bold text-green-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedTotalPaid ?? 0), 0))}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Qoldiq summa</div><div className="text-2xl font-bold text-red-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedRemaining ?? 0), 0))}</div></CardContent></Card>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead>Xonadon</TableHead><TableHead>Obyekt</TableHead><TableHead>Mijoz</TableHead>
                  <TableHead>To'lov turi</TableHead><TableHead className="text-right">Jami summa</TableHead>
                  <TableHead className="text-right">To'langan</TableHead><TableHead className="text-right">Qoldiq</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Qarzdorlar topilmadi</TableCell></TableRow>
                ) : (
                  debtors.map((debtor) => (
                    <TableRow key={debtor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setShowDebtorsModal(false); router.push(`/apartments/${debtor.id}`); }}>
                      <TableCell>{debtor.room_number}</TableCell><TableCell>{debtor.object_name}</TableCell>
                      <TableCell>{debtor.payment?.user_fio || '-'}</TableCell><TableCell>{getPaymentTypeLabel(debtor.payment?.payment_type)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(debtor.calculatedTotalAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(debtor.calculatedTotalPaid)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(debtor.calculatedRemaining)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-auto pt-4 border-t"><Button variant="outline" onClick={() => setShowDebtorsModal(false)}>Yopish</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />

      <main className="flex-1 space-y-6">
        <PageHeader
          title="Xonadonlar"
          description="Barcha xonadonlar ro'yxati va filtrlash"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border p-0.5 bg-muted/30">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} title="Kartochka" disabled={loading}>
                  <LayoutGrid className="h-4 w-4 mr-1" /> Kartochka
                </Button>
                <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} title="Jadval" disabled={loading}>
                  <List className="h-4 w-4 mr-1" /> Jadval
                </Button>
                <Button variant={viewMode === "shaxmat" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("shaxmat")} title="Shaxmat (qavatlar)" disabled={loading}>
                  <Layers className="h-4 w-4 mr-1" /> Shaxmat
                </Button>
              </div>
              {viewMode === "shaxmat" && (
                <div className="flex items-center gap-1 rounded-lg border px-2 py-1 bg-muted/30">
                  <span className="text-xs text-muted-foreground mr-1">O‘lcham:</span>
                  <Button variant={shaxmatSize === "sm" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setShaxmatSize("sm")} title="Kichik">
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={shaxmatSize === "md" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setShaxmatSize("md")} title="O‘rta">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={shaxmatSize === "lg" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setShaxmatSize("lg")} title="Katta">
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={() => {
                const debtorsList = apartments.filter(apt => (apt.calculatedRemaining ?? 0) > 0 && apt.status?.toLowerCase() !== 'bosh').sort((a, b) => (b.calculatedRemaining ?? 0) - (a.calculatedRemaining ?? 0));
                setDebtors(debtorsList); setShowDebtorsModal(true);
              }} disabled={loading}>Qarzdorlar</Button>
              <Link href="/apartments/add"><Button disabled={loading}><Plus className="mr-2 h-4 w-4" /> Yaratish</Button></Link>
            </div>
          }
        />

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <div className="space-y-1.5"><Label htmlFor="property">Obyekt</Label><Select value={filters.property || "all"} onValueChange={(value) => handleFilterChange("property", value)}><SelectTrigger id="property"><SelectValue /></SelectTrigger><SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="rooms">Xonalar</Label><Select value={filters.rooms || "all"} onValueChange={(value) => handleFilterChange("rooms", value)}><SelectTrigger id="rooms"><SelectValue /></SelectTrigger><SelectContent>{ALL_ROOM_OPTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="floor">Qavat</Label><Select value={filters.floor || "all"} onValueChange={(value) => handleFilterChange("floor", value)}><SelectTrigger id="floor"><SelectValue /></SelectTrigger><SelectContent>{ALL_FLOOR_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="status">Holati</Label><Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}><SelectTrigger id="status"><SelectValue /></SelectTrigger><SelectContent>{ALL_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="search">Qidiruv</Label><Input id="search" placeholder="Xona, mijoz..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {filterStats != null && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Umumiy xonadonlar statistikasi (filtr bo&apos;yicha)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="rounded-lg px-3 py-2 text-sm font-medium bg-emerald-100 text-emerald-800">Bo&apos;sh: {filterStats.bosh}</div>
                <div className="rounded-lg px-3 py-2 text-sm font-medium bg-amber-100 text-amber-800">Band qilingan: {filterStats.band}</div>
                <div className="rounded-lg px-3 py-2 text-sm font-medium bg-slate-200 text-slate-800">Sotilgan: {filterStats.sotilgan}</div>
                <div className="rounded-lg px-3 py-2 text-sm font-medium bg-orange-100 text-orange-800">Muddatli: {filterStats.muddatli ?? 0}</div>
                <div className="rounded-lg px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-800 border border-gray-200">Umumiy: {filterStats.total} ta</div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          viewMode === "shaxmat" ? (
            <div className="space-y-6">
              {[1, 2, 3].map((f) => (
                <Card key={f}><CardContent className="p-4"><h3 className="text-sm font-semibold text-muted-foreground mb-3">{f}-qavat</h3><div className="grid grid-cols-6 md:grid-cols-8 gap-2">{Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="aspect-square rounded-lg" />))}</div></CardContent></Card>
              ))}</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (<Card key={i} className="apartment-card-height"><CardContent className="p-4 space-y-3"><div className="flex justify-between"><Skeleton className="h-6 w-20" /><Skeleton className="h-5 w-16" /></div><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /><div className="mt-4 pt-3 border-t"><Skeleton className="h-9 w-full" /></div></CardContent></Card>))}</div>
          ) : (
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow>{Array.from({ length: 11 }).map((_, i) => (<TableHead key={i}><Skeleton className="h-4 w-full" /></TableHead>))}</TableRow></TableHeader><TableBody>{Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 11 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>))}</TableBody></Table></CardContent></Card>
          )
        ) : apartments.length === 0 ? (
          <EmptyState
            icon={<Home className="h-7 w-7" />}
            title="Filtrlarga mos xonadonlar yo'q"
            description="Boshqa filtrlarni tanlang yoki yangi xonadon qo'shing."
            action={<Button asChild><Link href="/apartments/add"><Plus className="mr-2 h-4 w-4" /> Xonadon qo'shish</Link></Button>}
            className="min-h-[280px]"
          />
        ) : viewMode === "shaxmat" ? (
          <div className="space-y-6">
            {apartmentsByFloor.map(([floorNum, floorApartments]) => {
              const gridCols = shaxmatSize === "sm" ? "grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12" : shaxmatSize === "lg" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10";
              const cellPadding = shaxmatSize === "sm" ? "p-1.5" : shaxmatSize === "lg" ? "p-4" : "p-2.5";
              const textSize = shaxmatSize === "sm" ? "text-xs" : shaxmatSize === "lg" ? "text-base" : "text-sm";
              return (
                <Card key={floorNum}>
                  <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      {floorNum}-qavat
                      <span className="text-sm font-normal text-muted-foreground">({floorApartments.length} xonadon)</span>
                    </h2>
                    <div className={`grid ${gridCols} gap-2`}>
                      {floorApartments.map((apartment) => {
                        const isBosh = apartment.status?.toLowerCase() === "bosh";
                        const showSensitiveControls = canPerformSensitiveActions(currentUser);
                        return (
                          <div
                            key={apartment.id}
                            onClick={() => router.push(`/apartments/${apartment.id}`)}
                            className={`${cellPadding} rounded-lg border-2 bg-card hover:bg-muted/50 cursor-pointer transition-all min-h-[3rem] flex flex-col justify-center ${textSize}`}
                          >
                            <div className="font-semibold truncate">№{apartment.room_number}</div>
                            <div className="text-muted-foreground truncate">{apartment.rooms} xona · {apartment.area} m²</div>
                            <div className="mt-0.5">{getStatusBadge(apartment.status, apartment.payment?.payment_type)}</div>
                            {shaxmatSize !== "sm" && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {apartment.status === "bosh" && (
                                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/apartments/${apartment.id}/reserve`); }}>Band/Sotish</Button>
                                )}
                                {showSensitiveControls && (
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); openEditModal(apartment); }}><Edit className="h-3 w-3" /></Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Oldingi</Button>
                <span>Sahifa {currentPage} / {totalPages}</span>
                <Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Keyingi</Button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {apartments.map((apartment) => {
                const isBosh = apartment.status?.toLowerCase() === 'bosh';
                const showSensitiveControls = canPerformSensitiveActions(currentUser);
                return (
                  <Card key={apartment.id} className="overflow-hidden transition-shadow cursor-pointer apartment-card-height flex flex-col" onClick={() => router.push(`/apartments/${apartment.id}`)}>
                    <CardContent className="p-4 space-y-2 flex flex-col h-full min-h-0">
                      <div className="flex justify-between items-start mb-2 shrink-0"><div className="min-w-0"><h3 className="text-lg font-semibold truncate">№ {apartment.room_number || "—"}</h3><p className="text-xs text-muted-foreground truncate" title={apartment.object_name}>{apartment.object_name}</p></div>{getStatusBadge(apartment.status, apartment.payment?.payment_type)}</div>
                      <div className="space-y-2 text-sm text-foreground flex-1 min-h-0 overflow-hidden flex flex-col">
                        <div className="flex items-center shrink-0"><Home className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{apartment.rooms} xona, {apartment.area} m², {apartment.floor}-qavat</span></div>
                        {!isBosh && apartment.calculatedRemaining !== null && (
                          <div className="space-y-2 text-xs border-t pt-2 mt-2 shrink-0">
                            {apartment.payment && (<div className="flex items-center"><CreditCard className="mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="text-muted-foreground truncate">{getPaymentTypeLabel(apartment.payment.payment_type)}</span></div>)}
                            {apartment.payment?.user_fio && (<div className="flex items-center min-w-0"><span className="text-muted-foreground shrink-0">Mijoz:</span><span className="ml-1 font-medium truncate">{apartment.payment.user_fio}</span></div>)}
                            <div className="grid grid-cols-2 gap-1">
                              <div>Jami:</div><div className="text-right font-medium truncate">{formatCurrency(apartment.calculatedTotalAmount)}</div>
                              <div>To'langan:</div><div className="text-right font-medium text-green-600 truncate">{formatCurrency(apartment.calculatedTotalPaid)}</div>
                              <div>Qoldiq:</div><div className={`text-right font-medium truncate ${apartment.calculatedRemaining < 0 ? 'text-orange-600' : 'text-red-600'}`}>{formatCurrency(apartment.calculatedRemaining)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="pt-3 border-t shrink-0">
                        {showSensitiveControls && (<div className="flex space-x-2"><Button size="sm" variant="outline" className="flex-1 border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400 dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/50" onClick={(e) => { e.stopPropagation(); openEditModal(apartment); }}><Edit className="mr-1 h-3.5 w-3.5" /> Tahrir</Button><Button size="sm" variant="destructive" className="flex-1" onClick={(e) => { e.stopPropagation(); setApartmentToDelete(apartment.id); setDeleteModalOpen(true); }}><Trash2 className="mr-1 h-3.5 w-3.5" /> O'chir</Button></div>)}
                        {apartment.status === "bosh" && (<Button size="sm" variant="outline" className={`w-full btn-band-sotish ${showSensitiveControls ? 'mt-2' : ''}`} onClick={(e) => { e.stopPropagation(); router.push(`/apartments/${apartment.id}/reserve`); }}>Band qilish / Sotish</Button>)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {totalPages > 1 && (<div className="flex justify-between items-center mt-6 pt-4 border-t"><Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Oldingi</Button><span>Sahifa {currentPage} / {totalPages}</span><Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Keyingi</Button></div>)}
          </div>
        ) : (
          <div className="space-y-4">
            {renderApartmentTable(sortedApartments)}
            {totalPages > 1 && (<div className="flex justify-between items-center mt-4"><Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Oldingi</Button><span>Sahifa {currentPage} / {totalPages}</span><Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Keyingi</Button></div>)}
          </div>
        )}
      </main>

      {selectedApartment && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Xonadonni tahrirlash</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_room_number" className="text-right">Xona raqami</Label><Input id="edit_room_number" value={editForm.room_number} onChange={(e) => handleEditFormChange("room_number", e.target.value)} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_rooms" className="text-right">Xonalar soni</Label><Select value={editForm.rooms} onValueChange={(v) => handleEditFormChange("rooms", v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{ALL_ROOM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_area" className="text-right">Maydoni (m²)</Label><Input id="edit_area" type="number" value={editForm.area} onChange={(e) => handleEditFormChange("area", e.target.value)} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_floor" className="text-right">Qavat</Label><Select value={editForm.floor} onValueChange={(v) => handleEditFormChange("floor", v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{ALL_FLOOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_price" className="text-right">Narxi ($)</Label><Input id="edit_price" type="number" value={editForm.price} onChange={(e) => handleEditFormChange("price", e.target.value)} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_status" className="text-right">Holati</Label><Select value={editForm.status} onValueChange={(v) => handleEditFormChange("status", v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_object" className="text-right">Obyekt</Label><Select value={editForm.object} onValueChange={(v) => handleEditFormChange("object", v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditModalOpen(false)}>Bekor qilish</Button><Button onClick={updateApartment} disabled={loading || isUpdating}>{isUpdating ? "Saqlanmoqda..." : "Saqlash"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Xonadonni o'chirish</DialogTitle></DialogHeader>
          <div className="py-4"><p>Haqiqatan ham ushbu xonadonni o'chirmoqchimisiz?</p></div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Bekor qilish</Button><Button variant="destructive" onClick={confirmDeleteApartment} disabled={loading || isDeleting}>{isDeleting ? "O'chirilmoqda..." : "O'chirish"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}