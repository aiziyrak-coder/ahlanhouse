"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

const routeLabels: Record<string, string> = {
  "/": "Bosh sahifa",
  "/qarzdorlar": "Qarzdorlar",
  "/properties": "Obyektlar",
  "/apartments": "Xonadonlar",
  "/clients": "Mijozlar",
  "/documents": "Hujjatlar",
  "/payments": "To'lovlar",
  "/suppliers": "Yetkazib beruvchilar",
  "/expenses": "Xarajatlar",
  "/reports": "Hisobotlar",
  "/settings": "Sozlamalar",
  "/add": "Qo'shish",
  "/reserve": "Band qilish",
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Bosh sahifa", href: "/" }];
  let path = "";
  for (let i = 0; i < segments.length; i++) {
    path += "/" + segments[i];
    const label = routeLabels[path] ?? routeLabels["/" + segments[i]] ?? segments[i];
    items.push(i === segments.length - 1 ? { label } : { label, href: path });
  }
  return items;
}

export function PageHeader({
  title,
  description,
  breadcrumbs: customBreadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[] | false;
  actions?: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const breadcrumbs = customBreadcrumbs === false ? [] : (customBreadcrumbs ?? getBreadcrumbs(pathname));

  return (
    <header className={cn("mb-6 flex flex-col gap-3 sm:mb-8", className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">{actions}</div>}
      </div>
    </header>
  );
}
