import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** N skeleton rows inside a bordered card — the loading state for any CardRow list. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-lg" />
          <Skeleton className="h-3 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}
