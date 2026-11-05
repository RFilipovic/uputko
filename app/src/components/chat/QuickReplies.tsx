"use client";

/** Big tappable answer chips. */
export function QuickReplies({
  options,
  onPick,
}: {
  options: readonly string[];
  onPick: (text: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {options.map((o) => (
        <li key={o}>
          <button
            type="button"
            onClick={() => onPick(o)}
            className="flex min-h-14 w-full items-center rounded-2xl border-2 border-border bg-card px-5 text-left text-lg font-semibold transition-colors duration-200 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {o}
          </button>
        </li>
      ))}
    </ul>
  );
}
