"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppFooter } from "@/components/app-footer";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
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
