"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * ScrollToTop — Floating button that appears after scrolling down.
 * Smoothly scrolls the user back to the top of the page.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 cursor-pointer items-center justify-center
        rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20
        transition-all duration-300 hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
