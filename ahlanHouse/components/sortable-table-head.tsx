"use client";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Ustun identifikatori (sort key) */
  sortKey: string;
  /** Joriy saralash ustuni */
  currentSortKey: string | null;
  /** Joriy yo'nalish */
  currentDir: SortDirection;
  /** Ustun bosilganda chaqiriladi: (key, newDir) */
  onSort: (key: string, dir: SortDirection) => void;
  /** Ustun matni */
  children: React.ReactNode;
  /** Saralashni o'chirish (faqat ko'rsatish) */
  disableSort?: boolean;
}

export function SortableTableHead({
  sortKey,
  currentSortKey,
  currentDir,
  onSort,
  children,
  disableSort = false,
  className,
  ...props
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;

  const handleClick = () => {
    if (disableSort) return;
    if (currentSortKey !== sortKey) {
      onSort(sortKey, "asc");
    } else if (currentDir === "asc") {
      onSort(sortKey, "desc");
    } else {
      onSort(sortKey, null);
    }
  };

  return (
    <TableHead
      role={disableSort ? undefined : "button"}
      tabIndex={disableSort ? undefined : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!disableSort && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-muted/60",
        isActive && "text-foreground font-semibold",
        !disableSort && "cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {!disableSort && (
          <span className="inline-flex text-muted-foreground">
            {!isActive && <ArrowUpDown className="h-4 w-4" />}
            {isActive && currentDir === "asc" && <ArrowUp className="h-4 w-4" />}
            {isActive && currentDir === "desc" && <ArrowDown className="h-4 w-4" />}
          </span>
        )}
      </div>
    </TableHead>
  );
}
