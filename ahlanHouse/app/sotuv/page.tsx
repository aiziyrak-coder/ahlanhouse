"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  Building,
  Home,
  Users,
  Glasses,
  FileSignature,
  Loader2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Calculator,
  TrendingUp,
  Wallet,
  CalendarClock,
} from "lucide-react";

interface SalesStats {
  totalObjects: number;
  totalApartments: number;
  availableApartments: number;
  soldApartments: number;
  reservedApartments: number;
  totalClients: number;
  pendingPaymentsUsd: number;
  paymentsDueTodayUsd: number;
}

export default function SotuvDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalesStats>({
    totalObjects: 0,
    totalApartments: 0,
    availableApartments: 0,
    soldApartments: 0,
    reservedApartments: 0,
    totalClients: 0,
    pendingPaymentsUsd: 0,
    paymentsDueTodayUsd: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      clearAuthAndRedirect(router, true);
      return;
    }
  }, [router]);

  const loadStats = useCallback(async (opts?: { silent?: boolean }) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    if (!opts?.silent) setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const statsRes = await fetch(`${apiBase}/payments/statistics/`, { headers });
      if (statsRes.status === 401) {
        clearAuthAndRedirect(router, true);
        return;
      }
      if (!statsRes.ok) throw new Error("Statistika");
      const s = await statsRes.json();
      setStats({
        totalObjects: s.total_objects ?? 0,
        totalApartments: s.total_apartments ?? 0,
        availableApartments: s.free_apartments ?? 0,
        soldApartments: s.sold_apartments ?? 0,
        reservedApartments: s.reserved_apartments ?? 0,
        totalClients: s.clients ?? 0,
        pendingPaymentsUsd: Number(s.pending_payments) || 0,
        paymentsDueTodayUsd: Number(s.payments_due_today) || 0,
      });
    } catch {
      toast({ title: "Xatolik", description: "Statistika yuklanmadi", variant: "destructive" });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      await loadStats({ silent: true });
      toast({ title: "Yangilandi", description: "Ko&apos;rsatkichlar yangilandi" });
    } finally {
      setRefreshing(false);
    }
  };

  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " $";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sotuv bo&apos;limi</h1>
          <p className="mt-1 text-muted-foreground max-w-2xl">
            CRM vositalari: tez qidiruv, muddatli kalkulyator, mijozlar, 3D taqdimot va shartnomalar — bitta
            ma&apos;lumotlar bazasi bilan boshqaruv paneli bilan bog&apos;langan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshStats()} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bugun to&apos;lash kerak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CalendarClock className="h-6 w-6 shrink-0" />
              {fmtUsd(stats.paymentsDueTodayUsd)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Kutilayotgan rejadagi summa (taxminan)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kutilayotgan to&apos;lovlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Wallet className="h-6 w-6 shrink-0" />
              {fmtUsd(stats.pendingPaymentsUsd)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Butun portfel bo&apos;yicha</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bo&apos;sh uylar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              {stats.availableApartments}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ta mijozga taklif qilish mumkin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mijozlar bazasi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              {stats.totalClients}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ro&apos;yxatdagi mijozlar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/sotuv/qidiruv">
          <Card className="h-full transition-all hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Tez qidiruv</CardTitle>
              <Search className="h-5 w-5 text-violet-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uylar va mijozlarni bir joyda qidiring — mijoz oldida telefonda tez javob.
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
                Ochish <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sotuv/kalkulyator">
          <Card className="h-full transition-all hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Muddatli kalkulyator</CardTitle>
              <Calculator className="h-5 w-5 text-violet-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Oylik to&apos;lovni taxminan hisoblang — raqobatchi CRM&apos;lardagi kabi tez hisob-kitob.
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
                Ochish <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sotuv/obyektlar">
          <Card className="h-full transition-all hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Obyektlar va 3D</CardTitle>
              <Building className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalObjects}</p>
              <p className="text-xs text-muted-foreground mt-1">obyekt</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sotuv/uylar">
          <Card className="h-full transition-all hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Uylar</CardTitle>
              <Home className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalApartments}</p>
              <p className="text-xs text-muted-foreground mt-1">
                jami · bo&apos;sh {stats.availableApartments} · sotilgan {stats.soldApartments} · band{" "}
                {stats.reservedApartments}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sotuv/mijozlar">
          <Card className="h-full transition-all hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Mijozlar</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalClients}</p>
              <p className="text-xs text-muted-foreground mt-1">WhatsApp va qaydlar bilan</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sotuv/shartnomalar">
          <Card className="h-full transition-all hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Shartnomalar</CardTitle>
              <FileSignature className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Filtrlar va holatlar <ArrowRight className="h-4 w-4" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-transparent dark:border-violet-800 dark:from-violet-950/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <CardTitle>3D taqdimot</CardTitle>
          </div>
          <CardDescription>
            Mijozga xonadonni 3D / AR bilan ko&apos;rsating. Uylar sahifasida qavat bo&apos;yicha tanlash va taqqoslash
            mavjud.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="bg-violet-600 hover:bg-violet-700">
            <Link href="/sotuv/obyektlar">
              <Glasses className="mr-2 h-4 w-4" />
              Obyektlar va 3D
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sotuv/uylar">Uylar va taqqoslash</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
