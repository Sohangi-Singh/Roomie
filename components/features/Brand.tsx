import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
// Alternatives if you'd rather swap: HeartHandshake (warm),
// BedDouble (clever roommate metaphor), Sparkles (minimal premium).

export function Brand({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const badge = size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-8";
  const icon = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-2xl bg-accent-500 text-canvas shadow-soft",
          badge,
        )}
      >
        <UsersRound className={icon} />
      </span>
      <span className={cn("font-display font-semibold tracking-tight", text)}>
        Roomie
      </span>
    </div>
  );
}
