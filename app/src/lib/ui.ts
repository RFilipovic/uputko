/** Shared class strings so every screen uses the same big, accessible controls. */
const focus =
  "focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none";

export const ui = {
  btnPrimary: `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-lg font-semibold text-primary-foreground transition-colors duration-200 hover:bg-violet-deep disabled:opacity-60 ${focus}`,
  btnSecondary: `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-6 text-lg font-semibold text-foreground transition-colors duration-200 hover:border-primary disabled:opacity-60 ${focus}`,
  btnUrgent: `inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-urgent px-6 text-2xl font-bold text-urgent-foreground ${focus}`,
  btnLink: `inline-flex min-h-12 items-center gap-2 rounded-xl px-1 text-base font-semibold text-link underline-offset-4 hover:underline ${focus}`,
  card: "rounded-3xl border border-border bg-card p-5 shadow-soft",
  label: "text-sm font-medium text-muted-foreground",
  input: `min-h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-lg placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none`,
  skeleton: "animate-pulse rounded-2xl bg-muted",
} as const;
