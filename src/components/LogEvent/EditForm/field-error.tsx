import { MdError } from "react-icons/md";
import { cn } from "@/lib/utils";

export function FieldError({
  error,
  className,
}: {
  error?: string;
  className?: string;
}) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "absolute top-1/2 left-full z-50 ml-2 flex -translate-y-1/2 items-center gap-1",
        "rounded-md border border-red-200 bg-red-50 px-2 py-1",
        "text-xs whitespace-nowrap text-red-700 shadow-sm",
        className,
      )}
    >
      <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-red-200 bg-red-50" />
      <MdError className="h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
}
