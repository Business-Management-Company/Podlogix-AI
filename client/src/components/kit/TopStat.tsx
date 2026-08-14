import * as React from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

interface TopStatProps {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
}

/**
 * A large, linkable stat cell for a stat-strip row (Today, Show Overview).
 * Deliberately not the colored-icon-in-a-tinted-square pattern — the icon is
 * a faint watermark, not a badge, and the number carries the weight.
 */
export function TopStat({ label, value, icon: Icon, href }: TopStatProps) {
  return (
    <Link href={href}>
      <div className="group relative flex flex-col gap-1.5 overflow-hidden px-5 py-5 transition-colors hover:bg-zinc-50/70">
        <Icon
          size={72}
          strokeWidth={1}
          className="pointer-events-none absolute -right-3 -top-3 text-zinc-100 transition-colors group-hover:text-zinc-200"
        />
        <p className="relative text-[11px] font-medium uppercase tracking-[0.07em] text-zinc-400">{label}</p>
        <p className="relative text-[30px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 [font-variant-numeric:tabular-nums]">
          {value}
        </p>
      </div>
    </Link>
  );
}
