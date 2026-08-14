import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { pageIn } from "./motion";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
}

/**
 * Full-page placeholder for routes that exist in the information architecture
 * but aren't built yet. Used instead of a bare "not found" or blank page so
 * unfinished areas still feel intentional and on-brand.
 */
export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  eyebrow = "In development",
}: PlaceholderPageProps) {
  return (
    <motion.div
      variants={pageIn}
      initial="hidden"
      animate="show"
      className="mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-6xl flex-col items-start justify-center px-6 py-16 text-left"
    >
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(14,165,233,0.06) 100%)",
          border: "1px solid rgba(16,185,129,0.14)",
        }}
      >
        <Icon size={24} className="text-emerald-600" strokeWidth={1.75} />
      </div>
      <span className="mb-3 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-zinc-400">
        {eyebrow}
      </span>
      <h2 className="mb-1.5 text-[19px] font-semibold tracking-[-0.02em] text-zinc-950">
        {title}
      </h2>
      <p className="max-w-[420px] text-[13px] leading-relaxed text-zinc-400">{description}</p>
      <Link href="/today">
        <span className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950">
          <ArrowLeft size={12} />
          Back to Today
        </span>
      </Link>
    </motion.div>
  );
}
