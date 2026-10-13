import { cn } from "@/lib/utils";
import type { BlogCategoryValue } from "@/lib/blog/types";

interface CategoryContentProps {
  content: string;
  category: BlogCategoryValue;
}

/**
 * CategoryContent — Wraps BlogContent with category-specific prose styling.
 * Each category gets distinct blockquote, heading, code, and list styles.
 */
export function CategoryContent({ content, category }: CategoryContentProps) {
  return (
    <article
      className={cn(
        // Base prose styles
        "prose max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:scroll-mt-24",
        "prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:scroll-mt-24",
        "prose-p:leading-relaxed prose-p:text-muted-foreground",
        "prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground",
        "prose-ul:text-muted-foreground",
        "prose-blockquote:not-italic",
        // Category-specific overrides
        categoryStyles[category]
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// ─── Per-category prose overrides ───────────────────────────────────────────

const categoryStyles: Record<BlogCategoryValue, string> = {
  // AI — Futuristic, gradient accents, neon highlights
  ai: [
    "prose-a:text-accent-foreground hover:prose-a:text-primary",
    "prose-blockquote:border-accent-foreground/30 prose-blockquote:bg-accent/30 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:pr-4",
    "prose-blockquote:text-foreground",
    "prose-li:marker:text-accent-foreground/60",
    "prose-code:text-accent-foreground prose-code:bg-accent prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
    "prose-pre:bg-foreground prose-pre:border prose-pre:border-accent-foreground/20",
    "prose-h2:bg-gradient-to-r prose-h2:from-accent-foreground prose-h2:to-primary prose-h2:bg-clip-text prose-h2:text-transparent",
  ].join(" "),

  // Conferences — Structured, step-like, indigo accents
  conferences: [
    "prose-a:text-primary hover:prose-a:text-primary-hover",
    "prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:pr-4",
    "prose-blockquote:text-foreground",
    "prose-li:marker:text-primary/60",
    "prose-h2:border-l-4 prose-h2:border-primary prose-h2:pl-4",
    "prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
  ].join(" "),

  // Research — Academic, serif headings, citation-style blockquotes
  research: [
    "prose-a:text-info hover:prose-a:text-info-foreground",
    "prose-blockquote:border-info/30 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:pr-4 prose-blockquote:italic",
    "prose-blockquote:text-foreground",
    "prose-li:marker:text-info/60",
    "prose-h2:font-serif",
    "prose-h3:font-serif",
    "prose-code:text-info prose-code:bg-info-surface prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
  ].join(" "),

  // Productivity — Minimal, warm amber, clean
  productivity: [
    "prose-a:text-warning hover:prose-a:text-warning-foreground",
    "prose-blockquote:border-warning/30 prose-blockquote:bg-warning-surface/50 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:pr-4",
    "prose-blockquote:text-foreground",
    "prose-li:marker:text-warning/60",
    "prose-h2:text-foreground",
    "prose-code:text-warning prose-code:bg-warning-surface prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
    "prose-strong:text-foreground",
  ].join(" "),

  // Tech — Developer blog, dark code blocks, emerald accents
  tech: [
    "prose-a:text-success hover:prose-a:text-success-foreground",
    "prose-blockquote:border-success/40 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:pr-4",
    "prose-blockquote:text-foreground",
    "prose-li:marker:text-success/60",
    "prose-h2:text-foreground",
    "prose-code:text-success prose-code:bg-success-surface prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
    "prose-pre:bg-foreground prose-pre:border prose-pre:border-success/20",
  ].join(" "),
};
