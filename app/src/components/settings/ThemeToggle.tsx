"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { hr } from "@/i18n/hr";

/** Manual light/dark switch; the default follows the system setting. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
  }

  const label = dark ? hr.settings.lightTheme : hr.settings.darkTheme;
  // aria-label is corrected after mount; before that the dark default is fine.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-foreground transition-colors duration-200 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {/* Icons switch by CSS, so they are right before JavaScript loads. */}
      <Sun aria-hidden className="hidden size-5 dark:block" />
      <Moon aria-hidden className="size-5 dark:hidden" />
    </button>
  );
}
