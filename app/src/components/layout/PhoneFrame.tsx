import { cn } from "@/lib/utils";

/**
 * Full screen on phones. On large screens the patient app sits in a
 * 390×844 phone-sized frame (good for judges on laptops and the demo video).
 */
export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh justify-center lg:items-center lg:py-8">
      <div
        className={cn(
          "relative flex min-h-dvh w-full flex-col bg-background lg:h-[844px] lg:min-h-0 lg:w-[390px] lg:overflow-hidden lg:rounded-[2.75rem] lg:border-[10px] lg:border-ink lg:shadow-2xl dark:lg:border-[#2a2450]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
