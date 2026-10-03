"use client";

import { cn } from "@/lib/utils";
import { blogCategories } from "@/lib/blog/data";
import type { BlogCategoryValue } from "@/lib/blog/types";

interface BlogFilterProps {
  selected: BlogCategoryValue | "all";
  onChange: (value: BlogCategoryValue | "all") => void;
}

/**
 * BlogFilter — Horizontal pill-style category filter tabs.
 */
export function BlogFilter({ selected, onChange }: BlogFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "All" pill */}
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          selected === "all"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted"
        )}
      >
        All
      </button>

      {/* Category pills */}
      {blogCategories.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            selected === cat.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
