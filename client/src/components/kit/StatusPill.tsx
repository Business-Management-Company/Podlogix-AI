import * as React from "react";
import { status, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  tone?: StatusTone;
  children: React.ReactNode;
  /** Animate the dot with a soft ping — use sparingly, for genuinely "live" state. */
  pulse?: boolean;
  className?: string;
}

export function StatusPill({ tone = "neutral", children, pulse, className }: StatusPillProps) {
  const c = status[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        className
      )}
      style={{ color: c.fg, background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: c.dot }}
          />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
      </span>
      {children}
    </span>
  );
}
