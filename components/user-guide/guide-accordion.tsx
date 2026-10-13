"use client";

import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { StepTimeline, type TimelineStep } from "./step-timeline";

/* ─── Types ─────────────────────────────────────────────── */

export interface GuideSection {
  title: string;
  icon: LucideIcon;
  steps: TimelineStep[];
}

interface GuideAccordionProps {
  sections: GuideSection[];
  color: "indigo" | "amber" | "emerald" | "violet";
}

/* ─── Color Maps ────────────────────────────────────────── */

const sectionColors = {
  indigo: {
    activeBg: "bg-primary/5",
    activeBorder: "border-primary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    hoverBg: "hover:bg-primary/5",
  },
  amber: {
    activeBg: "bg-warning-surface/50",
    activeBorder: "border-warning/30",
    iconBg: "bg-warning-surface",
    iconColor: "text-warning",
    hoverBg: "hover:bg-warning/5",
  },
  emerald: {
    activeBg: "bg-success-surface/50",
    activeBorder: "border-success/30",
    iconBg: "bg-success-surface",
    iconColor: "text-success",
    hoverBg: "hover:bg-success/5",
  },
  violet: {
    activeBg: "bg-accent/40",
    activeBorder: "border-accent-foreground/20",
    iconBg: "bg-accent",
    iconColor: "text-accent-foreground",
    hoverBg: "hover:bg-accent/30",
  },
};

/* ─── Component ─────────────────────────────────────────── */

export function GuideAccordion({ sections, color }: GuideAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const c = sectionColors[color];

  function toggle(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const Icon = section.icon;
        const isOpen = openIndex === idx;

        return (
          <div
            key={idx}
            className={`
              rounded-2xl border transition-all duration-300
              ${isOpen ? `${c.activeBg} ${c.activeBorder}` : `bg-card border-border ${c.hoverBg}`}
            `}
          >
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center rounded-lg p-2 ${c.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${c.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-[0.938rem] font-semibold text-foreground sm:text-base">
                    {section.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {section.steps.length} step{section.steps.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expandable body */}
            <div
              className={`
                overflow-hidden transition-all duration-400 ease-in-out
                ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}
              `}
            >
              <div className="border-t border-border px-5 py-6">
                <StepTimeline steps={section.steps} color={color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
