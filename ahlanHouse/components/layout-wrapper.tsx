"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SalesShell } from "@/components/sales-shell";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isSotuvLogin = pathname === "/sotuv/login";
  const isSotuv = pathname?.startsWith("/sotuv");

  if (isLogin || isSotuvLogin) {
    return <>{children}</>;
  }

  if (isSotuv) {
    return <SalesShell>{children}</SalesShell>;
  }

  return <AppShell>{children}</AppShell>;
}
