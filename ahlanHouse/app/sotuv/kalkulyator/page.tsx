"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowLeft } from "lucide-react";

/** Muddatli to'lov: annuitet formulasi (oylik teng to'lov). */
function monthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r <= 0) return principal / months;
  const pow = (1 + r) ** months;
  return (principal * r * pow) / (pow - 1);
}

export default function SotuvKalkulyatorPage() {
  const [price, setPrice] = useState("65000");
  const [downPercent, setDownPercent] = useState("25");
  const [months, setMonths] = useState("60");
  const [annualRate, setAnnualRate] = useState("18");

  const result = useMemo(() => {
    const P0 = Number(String(price).replace(/\s/g, "").replace(",", "."));
    const dp = Number(downPercent);
    const n = Math.floor(Number(months));
    const ar = Number(String(annualRate).replace(",", "."));
    if (!Number.isFinite(P0) || P0 <= 0 || !Number.isFinite(n) || n < 1) {
      return { principal: 0, monthly: 0, totalPaid: 0, overpay: 0 };
    }
    const down = P0 * (Number.isFinite(dp) ? Math.min(100, Math.max(0, dp)) / 100 : 0);
    const principal = Math.max(0, P0 - down);
    const rate = Number.isFinite(ar) ? ar : 0;
    const m = monthlyPayment(principal, rate, n);
    const totalPaid = down + m * n;
    const overpay = totalPaid - P0;
    return { principal, monthly: m, totalPaid, overpay, down };
  }, [price, downPercent, months, annualRate]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " $";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/sotuv" aria-label="Orqaga">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-emerald-600" />
            Muddatli kalkulyator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mijozga taxminiy oylik to&apos;lovni tez hisoblang (annuitet, taxminiy stavka).
          </p>
        </div>
      </div>

      <Card className="border-emerald-200/60 dark:border-emerald-800/40">
        <CardHeader>
          <CardTitle>Kiritish</CardTitle>
          <CardDescription>Uy narxi, boshlang&apos;ich foiz, muddat (oy), yillik stavka (%)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="price">Uy narxi ($)</Label>
            <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="down">Boshlang&apos;ich to&apos;lov (%)</Label>
            <Input id="down" inputMode="decimal" value={downPercent} onChange={(e) => setDownPercent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="months">Muddat (oy)</Label>
            <Input id="months" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rate">Yillik foiz stavkasi (%)</Label>
            <Input id="rate" inputMode="decimal" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-950/40 dark:to-slate-900 border-emerald-200/60">
        <CardHeader>
          <CardTitle>Natija</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Boshlang&apos;ich to&apos;lov</span>
            <span className="font-semibold">{fmt(result.down)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Qarz asosiy qismi</span>
            <span className="font-semibold">{fmt(result.principal)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <span className="font-medium">Taxminiy oylik to&apos;lov</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{fmt(result.monthly)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>Jami (boshlang&apos;ich + barcha oylar)</span>
            <span>{fmt(result.totalPaid)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>Bank foizi bilan farq (taxminan)</span>
            <span>{fmt(Math.max(0, result.overpay))}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Bu faqat namoyish hisobi. Haqiqiy shartlar bank va shartnomaga bog&apos;liq.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
