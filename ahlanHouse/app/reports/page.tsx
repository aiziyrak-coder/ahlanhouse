"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, FileDown, Download } from "lucide-react";
import { getApiBaseUrl, clearAuthAndRedirect } from "@/app/lib/api";

interface OrganizationReportItem {
  id: number;
  title: string;
  file: string | null;
  file_url: string | null;
  created_at: string;
}

export default function ReportsPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [downloadedReports, setDownloadedReports] = useState<OrganizationReportItem[]>([]);
  const [reportGenerateLoading, setReportGenerateLoading] = useState(false);
  const [reportsListLoading, setReportsListLoading] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null);
  const router = useRouter();

  const getAuthHeaders = useCallback(() => {
    if (!accessToken) return null;
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAccessToken(token);
    } else {
      toast({
        title: "Kirish talab qilinadi",
        description: "Iltimos, tizimga kiring.",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [router]);

  const fetchReportsList = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setReportsListLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/reports/`, { method: "GET", headers });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Hisobotlar ro'yxati yuklanmadi.");
      const data = await res.json();
      setDownloadedReports(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      toast({
        title: "Xatolik",
        description: e instanceof Error ? e.message : "Hisobotlar yuklanmadi",
        variant: "destructive",
      });
      setDownloadedReports([]);
    } finally {
      setReportsListLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    if (accessToken) fetchReportsList();
  }, [accessToken, fetchReportsList]);

  const handleGenerateAndDownload = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      return;
    }
    setReportGenerateLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/reports/generate-full/`, {
        method: "POST",
        headers,
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server xatosi: ${res.status}`);
      }
      const report: OrganizationReportItem = await res.json();
      const downloadRes = await fetch(
        `${getApiBaseUrl()}/reports/${report.id}/download/`,
        { method: "GET", headers }
      );
      if (!downloadRes.ok) throw new Error("Fayl yuklab olishda xatolik.");
      const blob = await downloadRes.blob();
      const filename =
        report.title.replace(/[^a-zA-Z0-9\-_.]/g, "_") + ".docx";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Muvaffaqiyat", description: "Hisobot yuklab olindi." });
      fetchReportsList();
    } catch (e: unknown) {
      toast({
        title: "Xatolik",
        description:
          e instanceof Error ? e.message : "Hisobot yaratishda xatolik",
        variant: "destructive",
      });
    } finally {
      setReportGenerateLoading(false);
    }
  }, [getAuthHeaders, router, fetchReportsList]);

  const handleDownloadReport = useCallback(
    async (id: number, title: string) => {
      const headers = getAuthHeaders();
      if (!headers) return;
      setDownloadingReportId(id);
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/reports/${id}/download/`,
          { method: "GET", headers }
        );
        if (res.status === 401) {
          clearAuthAndRedirect(router);
          return;
        }
        if (!res.ok) throw new Error("Fayl yuklab olinmadi.");
        const blob = await res.blob();
        const filename =
          title.replace(/[^a-zA-Z0-9\-_.]/g, "_") + ".docx";
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast({ title: "Muvaffaqiyat", description: "Hisobot yuklab olindi." });
      } catch (e: unknown) {
        toast({
          title: "Xatolik",
          description:
            e instanceof Error ? e.message : "Yuklab olishda xatolik",
          variant: "destructive",
        });
      } finally {
        setDownloadingReportId(null);
      }
    },
    [getAuthHeaders, router]
  );

  if (!accessToken) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <main className="flex-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Hisobot yuklab olish
            </CardTitle>
            <CardDescription>
              Tashkilotning joriy holati bo‘yicha to‘liq hisobot (obyektlar,
              xonadonlar, mijozlar, to‘lovlar, xarajatlar, yetkazib beruvchilar,
              qarzdorlar) bitta faylda — Ahlan House hisoboti, joriy sana va
              vaqt bilan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateAndDownload}
              disabled={reportGenerateLoading}
            >
              {reportGenerateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Hisobot tayyorlanmoqda...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Joriy holatni yuklab olish
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yuklab olingan hisobotlar</CardTitle>
            <CardDescription>
              Avval yaratilgan hisobotlar ro‘yxati. Keraklisini qayta yuklab
              olish mumkin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportsListLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Yuklanmoqda...
              </div>
            ) : downloadedReports.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                Hali hech qanday hisobot yuklab olinmagan.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">
                        Hisobot nomi
                      </th>
                      <th className="text-left p-3 font-medium">Sana</th>
                      <th className="text-right p-3 font-medium">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadedReports.map((r, i) => (
                      <tr
                        key={r.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">{r.title}</td>
                        <td className="p-3">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString("uz-UZ")
                            : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingReportId !== null}
                            onClick={() =>
                              handleDownloadReport(r.id, r.title)
                            }
                          >
                            {downloadingReportId === r.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-1 h-4 w-4" />
                            )}
                            {downloadingReportId === r.id ? "Yuklanmoqda..." : "Yuklab olish"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
