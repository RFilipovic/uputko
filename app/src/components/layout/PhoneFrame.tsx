import { cn } from "@/lib/utils";

/**
 * Full screen on phones. On large screens the patient app sits in a
 * 390×844 phone-sized frame (good for judges on laptops and the demo video).
 */
export function PhoneFrame({
  children,
  className,
  pinned = false,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * Exactly one screen tall on every device; nothing outside scrolls. The page
   * content scrolls inside (the chat), header and bottom bar stay put.
   */
  pinned?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-center lg:items-center lg:py-8",
        pinned ? "h-dvh overflow-hidden overscroll-none" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "relative flex w-full flex-col bg-background lg:w-[390px] lg:overflow-hidden lg:rounded-[2.75rem] lg:border-[10px] lg:border-ink lg:shadow-2xl dark:lg:border-[#1a2a55]",
          // Pinned: fill the screen on phones; on laptops shrink to fit short screens (max 844px).
          pinned
            ? "h-full lg:h-[min(844px,100%)]"
            : "min-h-dvh lg:h-[844px] lg:min-h-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
