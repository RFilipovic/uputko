"use client";

import { useEffect, useState } from "react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

/** Switches the whole app to bigger text; remembered on this device. */
export function TextSizeToggle({ className }: { className?: string }) {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    setLarge(document.documentElement.dataset.text === "large");
  }, []);

  function toggle() {
    const next = !large;
    setLarge(next);
    if (next) document.documentElement.dataset.text = "large";
    else delete document.documentElement.dataset.text;
    try {
      if (next) localStorage.setItem("text", "large");
      else localStorage.removeItem("text");
    } catch {
      // Storage can be blocked (private mode); the toggle still works now.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={large}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        large
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary",
        className,
      )}
    >
      <span aria-hidden className="text-lg leading-none font-bold">
        A<span className="text-sm">A</span>
      </span>
      {hr.settings.largeText}
    </button>
  );
}
