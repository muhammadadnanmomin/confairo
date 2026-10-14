"use client";

import * as React from "react";
import Image from "next/image";

interface ThemeLogoProps {
  /** Light-mode logo path */
  lightSrc: string;
  /** Dark-mode logo path (defaults to /logos/Dark_Mode_Transparent_Logo.png) */
  darkSrc?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

/**
 * Theme-aware logo that switches between light and dark variants using CSS.
 *
 * Strategy:
 * - In light mode, the light variant is visible and dark variant is hidden (`dark:hidden`).
 * - In dark mode, the dark variant is visible and light variant is hidden (`hidden dark:block`).
 * - Pure CSS switching executes before paint with zero layout shift, hydration delay, or flash.
 * - Removed all brightness/inversion filters that distorted logos on opaque backgrounds.
 */
export function ThemeLogo({
  lightSrc,
  darkSrc,
  alt,
  width,
  height,
  className = "",
  priority = false,
}: ThemeLogoProps) {
  // If no explicit darkSrc provided, default to the transparent dark-mode asset
  const resolvedDarkSrc =
    darkSrc ||
    (lightSrc.includes("Symbol")
      ? lightSrc
      : "/logos/Dark_Mode_Transparent_Logo.png");

  return (
    <span className="relative inline-flex items-center">
      <Image
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} dark:hidden`}
        priority={priority}
      />
      <Image
        src={resolvedDarkSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} hidden dark:block`}
        priority={priority}
      />
    </span>
  );
}
