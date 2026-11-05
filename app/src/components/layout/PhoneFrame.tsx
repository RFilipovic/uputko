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
  /** Exactly one screen tall on phones: content scrolls inside, the bottom bar stays put (chat). */
  pinned?: boolean;
}) {
  return (
    <div className="flex min-h-dvh justify-center lg:items-center lg:py-8">
      <div
        className={cn(
          "relative flex w-full flex-col",
          pinned ? "h-dvh" : "min-h-dvh",
          "bg-background lg:h-[844px] lg:min-h-0 lg:w-[390px] lg:overflow-hidden lg:rounded-[2.75rem] lg:border-[10px] lg:border-ink lg:shadow-2xl dark:lg:border-[#2a2450]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
