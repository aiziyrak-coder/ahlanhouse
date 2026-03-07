"use client";

import Link from "next/link";

const FOOTER_LINK = "https://cdcgroup.uz";

export function AppFooter() {
  return (
    <footer
      className="flex-shrink-0 w-full border-t border-border/50 bg-muted/30 py-2.5 text-center text-xs text-muted-foreground"
      role="contentinfo"
    >
      <div className="container mx-auto px-4">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 leading-relaxed">
          <span className="font-semibold text-foreground/95">Version 1.1</span>
          <span className="select-none text-muted-foreground/60">|</span>
          <span>Ahlan Group LLC</span>
          <span className="tracking-tight">© 2026</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 leading-relaxed">
          <span>Ishlab chiqaruvchi:</span>
          <Link
            href={FOOTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 decoration-primary/60 hover:decoration-primary hover:text-primary/90 transition-colors"
          >
            CDCGroup
          </Link>
          <span className="select-none text-muted-foreground/50">·</span>
          <span>Qo&apos;llab-quvvatlovchi:</span>
          <Link
            href={FOOTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 decoration-primary/60 hover:decoration-primary hover:text-primary/90 transition-colors"
          >
            CraDev Company
          </Link>
        </p>
      </div>
    </footer>
  );
}
