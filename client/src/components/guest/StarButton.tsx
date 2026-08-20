import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarButtonProps {
  starred?: boolean | null;
  isPending?: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function StarButton({ starred = false, isPending = false, onToggle, size = "md", className }: StarButtonProps) {
  const dimension = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-4.5 w-4.5";

  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onToggle(); }}
      disabled={isPending}
      aria-pressed={Boolean(starred)}
      aria-label={starred ? "Remove star" : "Star this guest"}
      title={starred ? "Starred — click to remove" : "Star this guest"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border transition-colors",
        dimension,
        starred
          ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100"
          : "border-zinc-200 text-zinc-300 hover:border-zinc-300 hover:text-zinc-400",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className={cn(iconSize, "animate-spin")} aria-hidden="true" />
      ) : (
        <Star className={iconSize} fill={starred ? "currentColor" : "none"} aria-hidden="true" />
      )}
    </button>
  );
}
