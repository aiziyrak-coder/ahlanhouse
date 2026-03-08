"use client";

import Link from "next/link";

const FOOTER_LINK = "https://cdcgroup.uz";

export function AppFooter() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-30 flex h-7 items-center justify-center border-t border-border/40 bg-background/95 py-1 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] text-center text-[11px] text-muted-foreground backdrop-blur-sm"
      role="contentinfo"
    >
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 px-2 leading-none">
        <span className="font-medium text-foreground/90">Version 1.1</span>
        <span className="select-none text-muted-foreground/50">|</span>
        <span>Ahlan Group LLC © 2026</span>
        <span className="select-none text-muted-foreground/40">·</span>
        <span>Ishlab chiqaruvchi:</span>
        <Link
          href={FOOTER_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-1 decoration-primary/50 hover:decoration-primary text-[11px]"
        >
          CDCGroup
        </Link>
        <span className="select-none text-muted-foreground/40">·</span>
        <span>Qo&apos;llab-quvvatlovchi:</span>
        <Link
          href={FOOTER_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-1 decoration-primary/50 hover:decoration-primary text-[11px]"
        >
          CraDev Company
        </Link>
      </p>
    </footer>
  );
}
