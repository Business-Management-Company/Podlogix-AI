import * as React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A card that tracks the cursor and renders a soft radial highlight under it
 * on hover — the Linear/Arc "the surface reacts to you" touch. Mutates a CSS
 * custom property directly on the node (no React state) so it stays smooth
 * at 60fps instead of re-rendering per mousemove.
 */
export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ children, className, onMouseMove, ...props }, forwardedRef) => {
    const localRef = React.useRef<HTMLDivElement | null>(null);

    function setRefs(node: HTMLDivElement | null) {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
      const el = localRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
      }
      onMouseMove?.(e);
    }

    return (
      <div
        ref={setRefs}
        onMouseMove={handleMouseMove}
        className={cn("group relative isolate overflow-hidden", className)}
        {...props}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(280px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.07), transparent 70%)",
          }}
        />
        {children}
      </div>
    );
  }
);
SpotlightCard.displayName = "SpotlightCard";
