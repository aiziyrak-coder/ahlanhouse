"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SalesShell } from "@/components/sales-shell";
import { AppFooter } from "@/components/app-footer";

/** Deploy dan keyin eski chunk 404/500 bo'lsa bir marta qattiq yangilash (ChunkLoadError bartaraf). */
function useChunkLoadErrorRecovery() {
  useEffect(() => {
    const key = "chunk-reload-done";
    const tryReload = (msg: string) => {
      if (!msg || typeof msg !== "string") return;
      if (!msg.includes("ChunkLoadError") && !msg.includes("Loading chunk")) return;
      if (typeof window === "undefined" || window.sessionStorage?.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
      window.location.reload();
    };
    const onError = (e: ErrorEvent) => tryReload(e?.message ?? "");
    const onRejection = (e: PromiseRejectionEvent) => tryReload(e?.reason?.message ?? String(e?.reason ?? ""));
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
  const isSotuvLogin = pathname === "/sotuv/login";
  const isSotuv = pathname?.startsWith("/sotuv");

  if (isLogin || isSotuvLogin) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <AppFooter />
      </div>
    );
  }

  if (isSotuv) {
    return <SalesShell>{children}</SalesShell>;
  }

  return <AppShell>{children}</AppShell>;
}
