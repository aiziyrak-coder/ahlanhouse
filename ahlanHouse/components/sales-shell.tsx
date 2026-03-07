"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building,
  Home,
  Users,
  FileSignature,
  LogOut,
  Building2,
  Glasses,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { AppFooter } from "@/components/app-footer";

const salesRoutes = [
  { href: "/sotuv", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/sotuv/obyektlar", label: "Obyektlar va 3D", icon: Building },
  { href: "/sotuv/uylar", label: "Uylar", icon: Home },
  { href: "/sotuv/mijozlar", label: "Mijozlar", icon: Users },
  { href: "/sotuv/shartnomalar", label: "Shartnomalar", icon: FileSignature },
];

export function SalesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userFio, setUserFio] = useState<string | null>(null);

  useEffect(() => {
    setUserFio(typeof window !== "undefined" ? localStorage.getItem("user_fio") : null);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("sales_module");
    localStorage.removeItem("user_type");
    localStorage.removeItem("user_fio");
    localStorage.removeItem("userId");
    router.push("/sotuv/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <a href="#main-content" className="skip-link">
        Asosiy kontentga o&apos;tish
      </a>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-emerald-200/50 bg-white/80 px-4 backdrop-blur-xl dark:border-emerald-800/30 dark:bg-slate-900/80 md:px-6">
        <Link href="/sotuv" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">
            Sotuv bo&apos;limi
          </span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {userFio ? <span>{userFio}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
          title="Chiqish"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </header>

      <main id="main-content" className="flex-1 overflow-auto p-6 pb-6" tabIndex={-1}>
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      <div className="flex-shrink-0 mb-20">
        <AppFooter />
      </div>

      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2" aria-label="Sotuv menyu">
        <div className="flex items-end gap-1 rounded-2xl border border-emerald-200/50 bg-white/90 px-2 py-2 shadow-xl shadow-emerald-500/10 backdrop-blur-xl dark:border-emerald-800/30 dark:bg-slate-900/90">
          {salesRoutes.map((route) => {
            const active =
              pathname === route.href ||
              (route.href !== "/sotuv" && pathname.startsWith(route.href));
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl p-2.5 min-w-[2.75rem] transition-all",
                  active
                    ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                )}
                title={route.label}
              >
                <route.icon className="h-6 w-6 shrink-0" />
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
