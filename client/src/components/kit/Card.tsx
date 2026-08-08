import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-xl border bg-white transition-colors duration-150", {
  variants: {
    tone: {
      default: "border-zinc-200",
      subtle: "border-zinc-100 bg-zinc-50/60",
      dashed: "border-dashed border-zinc-200",
    },
    interactive: {
      true: "cursor-pointer hover:border-zinc-300 hover:bg-zinc-50/50",
      false: "",
    },
    padding: {
      none: "p-0",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: { tone: "default", interactive: false, padding: "none" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, interactive, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ tone, interactive, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * A single row inside a Card that groups list-style content (podcasts, feed
 * items, upcoming). Wrap a set of rows in a container with `divide-y
 * divide-zinc-100` to get hairline separators between them.
 */
export function CardRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 px-4 py-3", className)} {...props} />;
}
