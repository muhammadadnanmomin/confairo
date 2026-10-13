"use client";

import { type LucideIcon } from "lucide-react";

export interface RoleCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "indigo" | "amber" | "emerald" | "violet";
  stepCount: number;
  isActive: boolean;
  onClick: () => void;
}

const colorMap = {
  indigo: {
    bg: "bg-primary/5",
    bgActive: "bg-primary",
    border: "border-primary/20",
    borderActive: "border-primary",
    iconBg: "bg-primary/10",
    iconBgActive: "bg-primary-foreground/15",
    iconColor: "text-primary",
    iconColorActive: "text-primary-foreground",
    textColor: "text-primary",
    textColorActive: "text-primary-foreground",
    descColor: "text-muted-foreground",
    descColorActive: "text-primary-foreground/80",
    badge: "bg-primary/10 text-primary border border-primary/20",
    badgeActive: "bg-primary-foreground/20 text-primary-foreground",
    glow: "hover:shadow-primary/20",
  },
  amber: {
    bg: "bg-warning-surface/40",
    bgActive: "bg-warning",
    border: "border-warning/20",
    borderActive: "border-warning",
    iconBg: "bg-warning-surface",
    iconBgActive: "bg-warning-foreground/15",
    iconColor: "text-warning",
    iconColorActive: "text-warning-foreground",
    textColor: "text-warning",
    textColorActive: "text-warning-foreground",
    descColor: "text-muted-foreground",
    descColorActive: "text-warning-foreground/80",
    badge: "bg-warning-surface text-warning border border-warning/30",
    badgeActive: "bg-warning-foreground/20 text-warning-foreground",
    glow: "hover:shadow-warning/20",
  },
  emerald: {
    bg: "bg-success-surface/40",
    bgActive: "bg-success",
    border: "border-success/20",
    borderActive: "border-success",
    iconBg: "bg-success-surface",
    iconBgActive: "bg-success-foreground/15",
    iconColor: "text-success",
    iconColorActive: "text-success-foreground",
    textColor: "text-success",
    textColorActive: "text-success-foreground",
    descColor: "text-muted-foreground",
    descColorActive: "text-success-foreground/80",
    badge: "bg-success-surface text-success border border-success/30",
    badgeActive: "bg-success-foreground/20 text-success-foreground",
    glow: "hover:shadow-success/20",
  },
  violet: {
    bg: "bg-accent/40",
    bgActive: "bg-accent-foreground",
    border: "border-accent-foreground/20",
    borderActive: "border-accent-foreground",
    iconBg: "bg-accent",
    iconBgActive: "bg-accent/20",
    iconColor: "text-accent-foreground",
    iconColorActive: "text-accent",
    textColor: "text-accent-foreground",
    textColorActive: "text-accent",
    descColor: "text-muted-foreground",
    descColorActive: "text-accent/80",
    badge: "bg-accent text-accent-foreground border border-accent-foreground/20",
    badgeActive: "bg-accent/20 text-accent",
    glow: "hover:shadow-primary/10",
  },
};

export function RoleCard({
  title,
  description,
  icon: Icon,
  color,
  stepCount,
  isActive,
  onClick,
}: RoleCardProps) {
  const c = colorMap[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full rounded-2xl border-2 p-6 text-left
        transition-all duration-300 ease-out cursor-pointer
        hover:scale-[1.03] hover:shadow-xl ${c.glow}
        ${isActive
          ? `${c.bgActive} ${c.borderActive} shadow-lg`
          : `bg-card ${c.border} hover:${c.bg}`
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
          inline-flex items-center justify-center rounded-xl p-3
          transition-colors duration-300
          ${isActive ? c.iconBgActive : c.iconBg}
        `}
      >
        <Icon
          className={`h-6 w-6 transition-colors duration-300 ${
            isActive ? c.iconColorActive : c.iconColor
          }`}
        />
      </div>

      {/* Title */}
      <h3
        className={`mt-4 text-lg font-bold transition-colors duration-300 ${
          isActive ? c.textColorActive : "text-foreground"
        }`}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={`mt-2 text-sm leading-relaxed transition-colors duration-300 ${
          isActive ? c.descColorActive : c.descColor
        }`}
      >
        {description}
      </p>

      {/* Badge */}
      <div
        className={`
          mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1
          text-xs font-semibold transition-colors duration-300
          ${isActive ? c.badgeActive : c.badge}
        `}
      >
        {stepCount} steps
      </div>

      {/* Active indicator dot */}
      {isActive && (
        <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-card shadow-md ring-2 ring-current">
          <div className={`h-full w-full rounded-full ${c.bgActive}`} />
        </div>
      )}
    </button>
  );
}
