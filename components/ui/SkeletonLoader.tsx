import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl", className)} aria-hidden />;
}

/** Convenience card-shaped skeleton used in match/explore lists. */
export function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-surface p-5 shadow-card">
      <Skeleton className="size-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="size-14 rounded-full" />
    </div>
  );
}
