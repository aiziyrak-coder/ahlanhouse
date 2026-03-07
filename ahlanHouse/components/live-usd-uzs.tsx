"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";

const API_URL = "https://open.er-api.com/v6/latest/USD";

export function LiveUsdUzs() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRate() {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (!cancelled && data?.rates?.UZS) {
          setRate(Number(data.rates.UZS));
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRate();
    const t = setInterval(fetchRate, 1000 * 60 * 60); // har soat yangilash
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs text-muted-foreground">USD/UZS...</span>
      </div>
    );
  }

  if (error || rate == null) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  }

  const formatted = new Intl.NumberFormat("uz-UZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rate);

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
      title="1 USD = soʻm (bugungi kurs)"
    >
      <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span className="text-xs font-medium text-foreground">
        1 USD = {formatted} soʻm
      </span>
    </div>
  );
}
