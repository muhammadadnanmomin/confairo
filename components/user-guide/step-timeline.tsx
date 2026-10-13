"use client";

import { useState } from "react";
import Link from "next/link";
import { type LucideIcon, ChevronDown, ExternalLink } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

export interface TimelineStep {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: { label: string; variant: "tip" | "important" | "new" };
  link?: { label: string; href: string };
}

interface StepTimelineProps {
  steps: TimelineStep[];
  color: "indigo" | "amber" | "emerald" | "violet";
}

/* ─── Color Maps ────────────────────────────────────────── */

const lineColors = {
  indigo: "from-primary via-primary/30 to-transparent",
  amber: "from-warning via-warning/30 to-transparent",
  emerald: "from-success via-success/30 to-transparent",
  violet: "from-accent-foreground via-accent-foreground/30 to-transparent",
};

const circleColors = {
  indigo: "border-primary text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  amber: "border-warning text-warning group-hover:bg-warning group-hover:text-warning-foreground",
  emerald: "border-success text-success group-hover:bg-success group-hover:text-success-foreground",
  violet: "border-accent-foreground text-accent-foreground group-hover:bg-accent-foreground group-hover:text-accent",
};

const cardHoverColors = {
  indigo: "group-hover:border-primary/20 group-hover:bg-primary/5",
  amber: "group-hover:border-warning/20 group-hover:bg-warning/5",
  emerald: "group-hover:border-success/20 group-hover:bg-success/5",
  violet: "group-hover:border-accent-foreground/20 group-hover:bg-accent/30",
};

const linkColors = {
  indigo: "text-primary hover:text-primary-hover",
  amber: "text-warning hover:text-warning/80",
  emerald: "text-success hover:text-success/80",
  violet: "text-accent-foreground hover:text-primary",
};

const badgeStyles = {
  tip: "bg-success-surface text-success border border-success/30",
  important: "bg-destructive-surface text-destructive border border-destructive/30",
  new: "bg-info-surface text-info border border-info/30",
};

/* ─── Component ─────────────────────────────────────────── */

export function StepTimeline({ steps, color }: StepTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  function toggleStep(idx: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="relative">
      {/* Connector line */}
      <div
        className={`absolute left-[23px] top-0 h-full w-px bg-gradient-to-b ${lineColors[color]} sm:left-[27px]`}
      />

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isOpen = expandedSteps.has(idx);

          return (
            <div key={idx} className="group relative flex gap-4 sm:gap-6">
              {/* Step number circle */}
              <div
                className={`
                  relative z-10 flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-xl border-2 bg-card text-sm font-bold shadow-sm
                  transition-all duration-300 sm:h-14 sm:w-14
                  ${circleColors[color]}
                `}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>

              {/* Content card */}
              <div
                className={`
                  flex-1 rounded-xl border border-border bg-card transition-all duration-300
                  ${cardHoverColors[color]}
                `}
              >
                {/* Header (always visible, toggles) */}
                <button
                  type="button"
                  onClick={() => toggleStep(idx)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <h4 className="text-[0.938rem] font-semibold text-foreground sm:text-base">
                      {step.title}
                    </h4>
                    {step.badge && (
                      <span
                        className={`hidden rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold sm:inline-flex ${badgeStyles[step.badge.variant]}`}
                      >
                        {step.badge.label}
                      </span>
                    )}
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expandable content */}
                <div
                  className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}
                  `}
                >
                  <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>

                    {step.link && (
                      <Link
                        href={step.link.href}
                        className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium transition ${linkColors[color]}`}
                      >
                        {step.link.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
