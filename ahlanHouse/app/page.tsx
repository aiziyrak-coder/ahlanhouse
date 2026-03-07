"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { CreditCard, DollarSign, Home, Loader2, Users, Truck, CalendarCheck, CalendarClock, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { sortByKey } from "@/lib/table-sort";
import { getApiBaseUrl, clearAuthAndRedirect, getErrorMessage } from "@/app/lib/api";
import { PageHeader } from "@/components/page-header";

interface Payment {
  id: number;
  user_fio: string;
  apartment_info: string;
  total_amount: string;
  created_at: string;
  due_date?: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalApartments: 0,
    soldApartments: 0,
    reservedApartments: 0,
    availableApartments: 0,
    totalClients: 0,
    totalSales: 0,
    totalPayments: 0,
    pendingPayments: 0,
    totalSuppliers: 0,
    averagePrice: 0,
    paymentsDueToday: 0,
    paymentsPaidToday: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [modalPayments, setModalPayments] = useState<Payment[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTableSortKey, setModalTableSortKey] = useState<string | null>(null);
  const [modalTableSortDir, setModalTableSortDir] = useState<SortDirection>(null);

  const modalPaymentSortGetter = useCallback((p: Payment, key: string) => {
    if (key === "created_at" || key === "due_date") return (p as Record<string, string>)[key] ? new Date((p as Record<string, string>)[key]).getTime() : 0;
    if (key === "total_amount") return Number((p as Record<string, string>)[key]) || 0;
    return (p as Record<string, unknown>)[key];
  }, []);
  const sortedModalPayments = useMemo(() => sortByKey(modalPayments, modalTableSortKey, modalTableSortDir, modalPaymentSortGetter), [modalPayments, modalTableSortKey, modalTableSortDir, modalPaymentSortGetter]);
  const handleModalTableSort = useCallback((key: string, dir: SortDirection) => { setModalTableSortKey(dir ? key : null); setModalTableSortDir(dir); }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  const getAuthHeaders = useCallback(
    () => ({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  useEffect(() => {
    if (!accessToken) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const apiBase = getApiBaseUrl();
        let url = `${apiBase}/payments/statistics/`;
        if (dateRange.from && dateRange.to) {
          url += `?created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const statsResponse = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            setLoading(false);
            clearAuthAndRedirect(router);
            return;
          }
          throw new Error("Statistikani olishda xatolik");
        }

        const statsData = await statsResponse.json();

        const soldApartmentsUrl = `${apiBase}/apartments/?status__in=paid,sotilgan&page_size=1000`;
        const soldApartmentsResponse = await fetch(
          soldApartmentsUrl,
          { method: "GET", headers: getAuthHeaders() }
        );
        if (!soldApartmentsResponse.ok) {
          if (soldApartmentsResponse.status === 401) {
            setLoading(false);
            clearAuthAndRedirect(router);
            return;
          }
          throw new Error("Sotilgan xonadonlarni olishda xatolik");
        }
        const soldApartmentsData = await soldApartmentsResponse.json();

        const actualSoldCount = (soldApartmentsData.results || []).filter(
          (apt: { status: string }) => apt.status === 'paid' || apt.status === 'sotilgan'
        ).length;

        const suppliersResponse = await fetch(`${apiBase}/suppliers/`, {
          method: "GET", headers: getAuthHeaders(),
        });
        if (!suppliersResponse.ok) {
          if (suppliersResponse.status === 401) {
            setLoading(false);
            clearAuthAndRedirect(router);
            return;
          }
          throw new Error("Yetkazib beruvchilarni olishda xatolik");
        }
        const suppliersData = await suppliersResponse.json();
        const totalSuppliers = suppliersData.count || 0;

        setStats({
          totalProperties: statsData.total_objects || 0,
          totalApartments: statsData.total_apartments || 0,
          soldApartments: actualSoldCount,
          reservedApartments: statsData.reserved_apartments || 0,
          availableApartments: statsData.free_apartments || 0,
          totalClients: statsData.clients || 0,
          totalSales: statsData.total_sales || 0,
          totalPayments: statsData.total_payments || 0,
          pendingPayments: statsData.pending_payments || 0,
          totalSuppliers: totalSuppliers,
          averagePrice: statsData.average_price || 0,
          paymentsDueToday: statsData.payments_due_today || 0,
          paymentsPaidToday: statsData.payments_paid_today || 0,
        });
      } catch (error: unknown) {
        toast({ title: "Xatolik", description: getErrorMessage(error, "Statistikani yuklashda xatolik"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchRecentPayments = async () => {
      try {
        let url = `${getApiBaseUrl()}/payments/?page_size=5`;
        if (dateRange.from && dateRange.to) {
          url += `&created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) {
          if (response.status === 401) {
            clearAuthAndRedirect(router);
            return;
          }
          throw new Error("To'lovlarni olishda xatolik");
        }

        const data = await response.json();
        setRecentPayments(data.results || []);
      } catch (error: unknown) {
        toast({ title: "Xatolik", description: getErrorMessage(error, "To'lovlarni olishda xatolik"), variant: "destructive" });
        setRecentPayments([]);
      }
    };

    fetchRecentPayments();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  const fetchModalPayments = useCallback(
    async (type: "pending") => {
      if (!accessToken) return;
      setModalLoading(true);
      setModalPayments([]);
      try {
        let url = `${getApiBaseUrl()}/payments/?page_size=1000`;
        if (dateRange.from && dateRange.to) {
          url += `&created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }
        if (type === "pending") {
          url += "&status=pending";
        }

        const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) {
          if (response.status === 401) {
            clearAuthAndRedirect(router);
            return;
          }
          throw new Error(`${type} to'lovlarni olishda xatolik`);
        }

        const data = await response.json();
        setModalPayments(data.results || []);
      } catch (error: unknown) {
        toast({ title: "Xatolik", description: getErrorMessage(error, "To'lovlarni olishda xatolik"), variant: "destructive" });
        setModalPayments([]);
      } finally {
        setModalLoading(false);
      }
    },
    [accessToken, dateRange, getAuthHeaders]
  );

  const handleOpenPendingModal = () => {
    setPendingModalOpen(true);
    fetchModalPayments("pending");
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range);
  };

  const formatCurrency = (amount: number | string) => {
    const numericAmount = Number(amount || 0);
    return numericAmount.toLocaleString("us-US", { style: "currency", currency: "USD" });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Ma'lumotlar yuklanmoqda…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boshqaruv paneli"
        description="Tizim ko'rsatkichlari va so'nggi to'lovlar"
        breadcrumbs={false}
        actions={
          <CalendarDateRangePicker
            onDateRangeChange={handleDateRangeChange}
            className="rounded-2xl border border-white/40 shadow-lg shadow-blue-500/5 app-glass"
          />
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="app-glass inline-flex h-11 items-center justify-center rounded-2xl border border-white/40 p-1.5 text-slate-600 shadow-lg shadow-black/5">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-blue-700 data-[state=active]:shadow-md">
            Umumiy ko'rinish
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-blue-700 data-[state=active]:shadow-md">
            Tahlil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="app-glass space-y-6 rounded-2xl border border-white/40 p-6 shadow-lg shadow-blue-500/5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="opacity-0 animate-fade-in-up stagger-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Jami Obyektlar
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-600">
                    <Home className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">
                    Tizimdagi faol obyektlar
                  </p>
                </CardContent>
              </Card>
              <Card className="opacity-0 animate-fade-in-up stagger-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Jami Xonadonlar
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalApartments}</div>
                  <p className="text-xs text-muted-foreground">
                    Jami mavjud xonadonlar
                  </p>
                </CardContent>
              </Card>
              <Card className="opacity-0 animate-fade-in-up stagger-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Jami Sotuvlar
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-violet-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(stats.totalSales)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Umumiy sotuv miqdori
                  </p>
                </CardContent>
              </Card>
              <Card className="opacity-0 animate-fade-in-up stagger-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Kutilayotgan To'lovlar
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(stats.pendingPayments)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To'lov kutilmoqda
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 opacity-0 animate-fade-in-up stagger-5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Tizim ko'rsatkichlari
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Bugungi faoliyat va xonadonlar holati
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CalendarCheck className="h-4 w-4" />
                        <span className="text-xs font-medium">Bugun to'langan</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(stats.paymentsPaidToday)}</p>
                      <p className="text-xs text-muted-foreground">{stats.paymentsPaidToday ? "to'lov" : "—"}</p>
                    </div>
                    <div className="rounded-xl border border-white/40 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <CalendarClock className="h-4 w-4" />
                        <span className="text-xs font-medium">Bugun muddati</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-foreground">{stats.paymentsDueToday ?? 0}</p>
                      <p className="text-xs text-muted-foreground">ta to'lov kutilmoqda</p>
                    </div>
                  </div>
                  <div className="app-glass rounded-xl border border-white/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Xonadonlar holati</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Sotilgan</span>
                        <span className="font-semibold text-emerald-600">{stats.soldApartments}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                          style={{ width: `${stats.totalApartments ? (stats.soldApartments / stats.totalApartments) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Band</span>
                        <span className="font-semibold text-violet-600">{stats.reservedApartments}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-500"
                          style={{ width: `${stats.totalApartments ? (stats.reservedApartments / stats.totalApartments) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Bo'sh</span>
                        <span className="font-semibold text-blue-600">{stats.availableApartments}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${stats.totalApartments ? (stats.availableApartments / stats.totalApartments) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/40 bg-gradient-to-br from-blue-500/10 to-violet-500/5 p-3">
                    <p className="text-xs font-medium text-muted-foreground">O'rtacha narx (xonadon)</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(stats.averagePrice)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3 opacity-0 animate-fade-in-up stagger-6">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">So'nggi To'lovlar</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Oxirgi to'lov operatsiyalari
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-4 rounded-xl border border-white/30 bg-gradient-to-r from-white/50 to-blue-500/5 px-4 py-3 backdrop-blur-sm transition-all hover:from-blue-500/10 hover:to-violet-500/5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-600">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {payment.user_fio}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{payment.apartment_info}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(payment.total_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="app-glass space-y-6 rounded-2xl border border-white/40 p-6 shadow-lg shadow-blue-500/5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Jami sotuvlar</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-violet-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalSales)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Sotilgan xonadonlar</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600">
                    <Home className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.soldApartments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Mijozlar</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Yetkazib beruvchilar</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600">
                    <Truck className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalSuppliers}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col rounded-2xl border border-white/30 shadow-2xl shadow-black/10">
          <DialogHeader>
            <DialogTitle className="text-foreground">Kutilayotgan To'lovlar Ro'yxati</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Quyida filtrlangan kutilayotgan to'lovlar ro'yxati keltirilgan.
            </DialogDescription>
          </DialogHeader>
          <div className="app-glass flex-1 overflow-y-auto rounded-xl border border-white/20 p-2">
            {modalLoading ? (
              <div className="flex items-center justify-center h-[200px] gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
              </div>
            ) : modalPayments.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">Kutilayotgan to'lovlar topilmadi.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <SortableTableHead sortKey="id" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="w-[60px] text-foreground">ID</SortableTableHead>
                    <SortableTableHead sortKey="user_fio" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="text-foreground">Mijoz</SortableTableHead>
                    <SortableTableHead sortKey="apartment_info" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="text-foreground">Xonadon</SortableTableHead>
                    <SortableTableHead sortKey="created_at" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="text-foreground">Sana</SortableTableHead>
                    <SortableTableHead sortKey="due_date" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="text-foreground">Oxirgi muddat</SortableTableHead>
                    <SortableTableHead sortKey="total_amount" currentSortKey={modalTableSortKey} currentDir={modalTableSortDir} onSort={handleModalTableSort} className="text-right w-[150px] text-foreground">Summa</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedModalPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-border">
                      <TableCell className="text-muted-foreground">{payment.id}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.user_fio}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.apartment_info}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(payment.due_date)}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-border font-medium bg-muted/50">
                    <TableCell colSpan={5} className="text-right text-foreground">Jami:</TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatCurrency(modalPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="border-t border-white/20 pt-4">
            <Button variant="outline" onClick={() => setPendingModalOpen(false)} disabled={modalLoading}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}