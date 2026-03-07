"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Snowflake } from "lucide-react";

const KOKAND_LAT = 40.5286;
const KOKAND_LON = 70.9425;
const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${KOKAND_LAT}&longitude=${KOKAND_LON}&current=temperature_2m,weather_code&timezone=Asia/Tashkent`;

function weatherLabel(code: number): string {
  if (code === 0) return "Ochiq";
  if (code <= 3) return "Bulutli";
  if (code <= 49) return "Tuman";
  if (code <= 59) return "Yomgʻir";
  if (code <= 69) return "Yomgʻir";
  if (code <= 79) return "Qor";
  if (code <= 84) return "Yomgʻir";
  if (code <= 99) return "Boʻron";
  return "—";
}

function WeatherIcon({ code }: { code: number }) {
  if (code === 0) return <Sun className="h-3.5 w-3.5 text-amber-500" />;
  if (code <= 3) return <Cloud className="h-3.5 w-3.5 text-slate-500" />;
  if (code <= 69) return <CloudRain className="h-3.5 w-3.5 text-sky-500" />;
  if (code <= 79) return <Snowflake className="h-3.5 w-3.5 text-sky-400" />;
  return <Cloud className="h-3.5 w-3.5 text-slate-500" />;
}

export function LiveWeather() {
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (!cancelled && data?.current) {
          setTemp(data.current.temperature_2m);
          setCode(data.current.weather_code ?? 0);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchWeather();
    const t = setInterval(fetchWeather, 1000 * 60 * 30); // 30 daqiqa
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
        <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Ob-havo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
        <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
      title="Qoʻqon ob-havosi"
    >
      <WeatherIcon code={code} />
      <span className="text-xs font-medium text-foreground">
        Qoʻqon: {temp != null ? `${Math.round(temp)}°C` : "—"} · {weatherLabel(code)}
      </span>
    </div>
  );
}
