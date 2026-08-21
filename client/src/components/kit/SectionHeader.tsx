import * as React from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  action?: { label: string; href: string };
  right?: React.ReactNode;
  className?: string;
}

/** The small uppercase eyebrow label used above every content section, with an optional "view all" link. */
export function SectionHeader({ title, action, right, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-2.5", className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-700">
        {title}
      </h2>
      {action ? (
        <Link href={action.href}>
          <span className="group inline-flex cursor-pointer items-center gap-0.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600">
            {action.label}
            <ChevronRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </span>
        </Link>
      ) : (
        right
      )}
    </div>
  );
}
