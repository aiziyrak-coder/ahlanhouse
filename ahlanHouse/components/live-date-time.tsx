"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("uz-UZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Placeholder: server va ilk client render bir xil bo‘lishi uchun (hydration xatosiz). */
const PLACEHOLDER_TIME = "00:00:00";
const PLACEHOLDER_DATE = "—";

export function LiveDateTime() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [mounted]);

  const timeStr = mounted && now ? formatTime(now) : PLACEHOLDER_TIME;
  const dateStr = mounted && now ? formatDate(now) : PLACEHOLDER_DATE;

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
      title={dateStr}
    >
      <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium tabular-nums text-foreground">
        {timeStr}
      </span>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {dateStr}
      </span>
    </div>
  );
}
