"use client";

import { Calendar } from "lucide-react";
import { openDemo } from "./openDemo";

type Variant = "primary" | "secondary" | "ghost" | "nav";

interface BookDemoButtonProps {
  variant?: Variant;
  className?: string;
  /** Optional callback fired before opening Calendly (e.g. close a menu). */
  onBeforeOpen?: () => void;
}

/**
 * BookDemoButton — Self-contained CTA that opens Calendly in a new tab.
 *
 * Variants:
 *  • primary   — gradient fill, hero/CTA-level
 *  • secondary — outline, supporting CTA
 *  • ghost     — minimal, for nav / inline
 *  • nav       — small, intended for the navbar
 */
export function BookDemoButton({
  variant = "primary",
  className = "",
  onBeforeOpen,
}: BookDemoButtonProps) {
  const label =
    variant === "secondary" ? "Book 15-Min Demo" : "Book a Demo";

  const base =
    "inline-flex items-center gap-2 font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer";

  const variants: Record<Variant, string> = {
    primary:
      "rounded-lg bg-gradient-to-r from-primary to-primary-hover px-7 py-3.5 text-base text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5",
    secondary:
      "rounded-lg border border-primary/20 bg-primary/5 px-6 py-3 text-sm text-primary hover:bg-primary/10 hover:border-primary/30",
    ghost:
      "rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-accent",
    nav:
      "rounded-md bg-gradient-to-r from-primary to-primary-hover px-4 py-2 text-sm text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-px",
  };

  const handleClick = () => {
    onBeforeOpen?.();
    openDemo();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${base} cursor-pointer ${variants[variant]} ${className}`}
    >
      <Calendar className="h-4 w-4" />
      {label}
    </button>
  );
}
