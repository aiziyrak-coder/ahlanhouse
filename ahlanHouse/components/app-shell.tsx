"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building,
  Home,
  Users,
  FileText,
  Settings,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  FileDown,
} from "lucide-react";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { LiveUsdUzs } from "@/components/live-usd-uzs";
import { LiveWeather } from "@/components/live-weather";
import { LiveDateTime } from "@/components/live-date-time";
import { Toaster } from "@/components/ui/toaster";
import { Ziyrak } from "@/components/ziyrak";
import { AppFooter } from "@/components/app-footer";

const routes = [
  { href: "/", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/qarzdorlar", label: "Qarzdorlar", icon: Users },
  { href: "/properties", label: "Obyektlar", icon: Building },
  { href: "/apartments", label: "Xonadonlar", icon: Home },
  { href: "/clients", label: "Mijozlar", icon: Users },
  { href: "/documents", label: "Hujjatlar", icon: FileText },
  { href: "/payments", label: "To'lovlar", icon: CreditCard },
  { href: "/suppliers", label: "Yetkazib beruvchilar", icon: Building },
  { href: "/expenses", label: "Xarajatlar", icon: DollarSign },
  { href: "/reports", label: "Hisobot yuklab olish", icon: FileDown },
  { href: "/settings", label: "Sozlamalar", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <a href="#main-content" className="skip-link">
        Asosiy kontentga o‘tish
      </a>
      {/* Top bar — macOS style: tema, qidiruv, USD/UZS kursi, ob-havo, profil */}
      <header className="header-bar sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-white/20 px-4 backdrop-blur-2xl md:gap-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/25">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">Ahlan House</span>
        </div>
        <div className="flex-1 min-w-0" />
        <div className="hidden items-center gap-2 sm:flex">
          <LiveDateTime />
          <LiveUsdUzs />
          <LiveWeather />
        </div>
        <Search />
        <UserNav />
      </header>

      {/* Main content — pastda dok va footer uchun joy */}
      <main id="main-content" className="content-area flex-1 overflow-auto p-6 pb-28" tabIndex={-1}>
        <div className="app-page">{children}</div>
      </main>

      {/* Footer — eng pastda, bitta ingichka qator */}
      <AppFooter />

      {/* Bottom dock — sidebar footerdan yuqorida, ustma-ust tushmasin */}
      <nav
        className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2"
        aria-label="Bosh menyu"
      >
        <div className="dock-container flex items-end gap-1 rounded-2xl border border-white/40 bg-gradient-to-r from-white/70 via-white/60 to-white/70 px-2 py-2 shadow-xl shadow-blue-500/10 backdrop-blur-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/15">
          {routes.map((route) => {
            const active = pathname === route.href || (route.href !== "/" && pathname.startsWith(route.href));
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "dock-icon flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all duration-200 ease-out min-w-[2.75rem]",
                  active
                    ? "bg-gradient-to-br from-blue-500/25 to-violet-500/20 text-blue-600"
                    : "text-slate-600 hover:bg-blue-500/10 hover:text-blue-600"
                )}
                title={route.label}
              >
                <route.icon className="h-6 w-6 shrink-0" />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Ziyrak — ovozli yordamchi (faqat admin, token bor bo'lsa) */}
      <Ziyrak />

      {/* Hoshiyalar — o‘ng yuqori, silliq animatsiya */}
      <Toaster />
    </div>
  );
}
