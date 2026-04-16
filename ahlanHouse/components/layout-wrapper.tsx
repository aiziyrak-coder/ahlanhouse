"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SalesShell } from "@/components/sales-shell";
import { AppFooter } from "@/components/app-footer";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isSotuvLogin = pathname === "/sotuv/login";
  const isSotuv = pathname?.startsWith("/sotuv");

  if (isLogin || isSotuvLogin) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col">
        <div className="flex-1 min-h-0">{children}</div>
        <AppFooter />
      </div>
    );
  }

  if (isSotuv) {
    return <SalesShell>{children}</SalesShell>;
  }

  return <AppShell>{children}</AppShell>;
}
