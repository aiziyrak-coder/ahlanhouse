"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppFooter } from "@/components/app-footer";

/** Deploy dan keyin eski chunk 404 bo'lsa cache-busting reload — yangi HTML va chunk'lar yuklanadi, xato chiqmasin. */
function useChunkLoadErrorRecovery() {
  useEffect(() => {
    const RELOAD_COOLDOWN_MS = 8000;
    const key = "chunk-reload-at";

    const tryReload = (msg: string) => {
      if (!msg || typeof msg !== "string") return;
      const isChunkOr404 =
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("419") ||
        msg.includes("Suspense boundary") ||
        /Failed to load resource.*404/.test(msg) ||
        /_next\/static\//.test(msg);
      if (!isChunkOr404) return;
      const now = Date.now();
      const last = parseInt(sessionStorage?.getItem(key) ?? "0", 10);
      if (now - last < RELOAD_COOLDOWN_MS) return;
      sessionStorage?.setItem(key, String(now));
      const url = new URL(location.href);
      url.searchParams.set("_cb", String(now));
      location.replace(url.pathname + url.search + url.hash);
    };

    const onError = (e: ErrorEvent) => tryReload(e?.message ?? "");
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e?.reason?.message ?? String(e?.reason ?? "");
      tryReload(msg);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  useChunkLoadErrorRecovery();
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col">
        <div className="flex-1 min-h-0">{children}</div>
        <AppFooter />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
