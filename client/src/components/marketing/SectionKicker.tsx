import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionKickerProps {
  children: React.ReactNode;
  className?: string;
}

/** The small uppercase eyebrow label used above a section headline. */
export function SectionKicker({ children, className }: SectionKickerProps) {
  return (
    <p className={cn("mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary", className)}>
      {children}
    </p>
  );
}
