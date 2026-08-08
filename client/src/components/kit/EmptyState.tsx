import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { pageIn } from "./motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  dashed?: boolean;
  className?: string;
}

/** In-context empty state for a card/section that has no data yet (e.g. "No podcasts yet"). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  dashed = true,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      variants={pageIn}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center rounded-xl px-6 py-10 text-center",
        dashed ? "border border-dashed border-zinc-200" : "border border-zinc-200 bg-white",
        className
      )}
    >
      <div
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "rgba(16,185,129,0.08)" }}
      >
        <Icon size={20} className="text-emerald-600" strokeWidth={1.75} />
      </div>
      <p className="mb-1 text-[13px] font-medium text-zinc-950">{title}</p>
      <p className="mb-4 max-w-[320px] text-xs leading-relaxed text-zinc-400">{description}</p>
      {action && (
        <Link href={action.href}>
          <button className="rounded-lg bg-zinc-950 px-3.5 py-[7px] text-xs font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
            {action.label}
          </button>
        </Link>
      )}
    </motion.div>
  );
}
