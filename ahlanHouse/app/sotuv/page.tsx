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
} from "lucide-react";

interface SalesStats {
  totalObjects: number;
  totalApartments: number;
  availableApartments: number;
  soldApartments: number;
  reservedApartments: number;
  totalClients: number;
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

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const apiBase = getApiBaseUrl();

        const [objectsRes, apartmentsRes, clientsRes] = await Promise.all([
          fetch(`${apiBase}/objects/?page_size=1000`, { headers }),
          fetch(`${apiBase}/apartments/?page_size=10000`, { headers }),
          fetch(`${apiBase}/users/?user_type=mijoz&page_size=1000`, { headers }),
        ]);

        if (objectsRes.status === 401 || apartmentsRes.status === 401 || clientsRes.status === 401) {
          clearAuthAndRedirect(router, true);
          return;
        }

        const objectsData = await objectsRes.json().catch(() => ({}));
        const apartmentsData = await apartmentsRes.json().catch(() => ({}));
        const clientsData = await clientsRes.json().catch(() => ({}));

        const objectsList = objectsData.results || [];
        const apartments = apartmentsData.results || [];
        const clientsList = clientsData.results || [];
        const available = apartments.filter(
          (a: { status: string }) => !["sotilgan", "paid", "band"].includes((a.status || "").toLowerCase())
        );
        const sold = apartments.filter((a: { status: string }) => ["sotilgan", "paid"].includes((a.status || "").toLowerCase()));
        const reserved = apartments.filter((a: { status: string }) => (a.status || "").toLowerCase() === "band");

        setStats({
          totalObjects: objectsData.count ?? objectsList.length,
          totalApartments: apartments.length,
          availableApartments: available.length,
          soldApartments: sold.length,
          reservedApartments: reserved.length,
          totalClients: clientsData.count ?? clientsList.length,
        });
      } catch (e) {
        toast({ title: "Xatolik", description: "Ma'lumotlar yuklanmadi", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getAuthHeaders, router]);

  const refreshStats = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setRefreshing(true);
    try {
      const apiBase = getApiBaseUrl();
      const [objectsRes, apartmentsRes, clientsRes] = await Promise.all([
        fetch(`${apiBase}/objects/?page_size=1000`, { headers }),
        fetch(`${apiBase}/apartments/?page_size=10000`, { headers }),
        fetch(`${apiBase}/users/?user_type=mijoz&page_size=1000`, { headers }),
      ]);
      if (objectsRes.status === 401 || apartmentsRes.status === 401 || clientsRes.status === 401) {
        clearAuthAndRedirect(router, true);
        return;
      }
      const objectsData = await objectsRes.json().catch(() => ({}));
      const apartmentsData = await apartmentsRes.json().catch(() => ({}));
      const clientsData = await clientsRes.json().catch(() => ({}));
      const objectsList = objectsData.results || [];
      const apartments = apartmentsData.results || [];
      const clientsList = clientsData.results || [];
      const available = apartments.filter((a: { status: string }) => !["sotilgan", "paid", "band"].includes((a.status || "").toLowerCase()));
      const sold = apartments.filter((a: { status: string }) => ["sotilgan", "paid"].includes((a.status || "").toLowerCase()));
      const reserved = apartments.filter((a: { status: string }) => (a.status || "").toLowerCase() === "band");
      setStats({
        totalObjects: objectsData.count ?? objectsList.length,
        totalApartments: apartments.length,
        availableApartments: available.length,
        soldApartments: sold.length,
        reservedApartments: reserved.length,
        totalClients: clientsData.count ?? clientsList.length,
      });
      toast({ title: "Yangilandi", description: "Statistika yangilandi" });
    } finally {
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sotuv bo&apos;limi
          </h1>
          <p className="mt-1 text-muted-foreground">
            Mijozlarga uylarni ko&apos;rsatish, 3D/Virtual tur va shartnomalar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshStats} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.availableApartments}</p>
              <p className="text-xs text-muted-foreground mt-1">mavjud · sotilgan: {stats.soldApartments} · band: {stats.reservedApartments}</p>
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
              <p className="text-xs text-muted-foreground mt-1">mijoz</p>
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
                Ko&apos;rish <ArrowRight className="h-4 w-4" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-transparent dark:border-violet-800 dark:from-violet-950/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <CardTitle>3D va Virtual realty</CardTitle>
          </div>
          <CardDescription>
            Mijozlarga uyni 360° va VR rejimida ko&apos;rsating. Obyektlar sahifasida 3D modellarni ko&apos;ring va yuklang.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild className="bg-violet-600 hover:bg-violet-700">
            <Link href="/sotuv/obyektlar">
              <Glasses className="mr-2 h-4 w-4" />
              Obyektlar va 3D tur
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sotuv/uylar">Uylar ro&apos;yxati</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tez kirish</CardTitle>
          <CardDescription>Asosiy platforma ma&apos;lumotlari bilan bir xil — bitta bazada ishlaydi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/sotuv/obyektlar">Obyektlar</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/sotuv/uylar">Uylar</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/sotuv/mijozlar">Mijozlar</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/sotuv/shartnomalar">Shartnomalar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
