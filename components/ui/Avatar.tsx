import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

const SIZES = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-base",
  xl: "size-24 text-2xl",
} as const;

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}

export function Avatar({ name, src, size = "md", ring, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200 font-semibold text-accent-800",
        SIZES[size],
        ring && "shadow-soft ring-2 ring-canvas",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes="96px" className="object-cover" />
      ) : (
        <span aria-hidden>{initials(name) || "🙂"}</span>
      )}
    </div>
  );
}
