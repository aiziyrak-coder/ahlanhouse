"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  value?: string;
}

interface SmartFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  chips?: FilterChip[];
  onRemoveChip?: (id: string) => void;
  onClearAll?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Unified smart filter bar: search + optional dropdowns + active filter chips + clear all.
 */
export function SmartFilterBar({
  searchPlaceholder = "Qidirish...",
  searchValue,
  onSearchChange,
  chips = [],
  onRemoveChip,
  onClearAll,
  children,
  className,
}: SmartFilterBarProps) {
  const hasActiveFilters = searchValue.trim() !== "" || chips.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {children}
        {hasActiveFilters && onClearAll && (
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll} className="shrink-0">
            <X className="mr-1 h-4 w-4" />
            Tozalash
          </Button>
        )}
      </div>
      {chips.length > 0 && onRemoveChip && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {chip.label}
              {chip.value != null && chip.value !== "" && (
                <span className="text-muted-foreground">: {chip.value}</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveChip(chip.id)}
                className="rounded-full hover:bg-primary/20 p-0.5"
                aria-label={`${chip.label} filterni olib tashlash`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
