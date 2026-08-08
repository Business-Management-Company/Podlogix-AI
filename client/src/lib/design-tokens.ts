/**
 * Shared design tokens for the authenticated app shell (sidebar, top bar,
 * Activity, and every workspace page). Keep this the single source of
 * truth for color/spacing/motion so pages stay visually consistent —
 * new UI should read from here rather than hardcoding hex values.
 */

export const ink = {
  DEFAULT: "#09090b",
  soft: "#18181b",
} as const;

export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  150: "#f0f0f0",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
} as const;

export const brand = {
  green: "#10b981",
  blue: "#0ea5e9",
  gradient: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
  tint: (alpha: number) => `rgba(16,185,129,${alpha})`,
} as const;

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export const status: Record<
  StatusTone,
  { fg: string; bg: string; border: string; dot: string }
> = {
  success: { fg: "#067647", bg: "#ecfdf5", border: "rgba(16,185,129,0.24)", dot: "#10b981" },
  warning: { fg: "#92400e", bg: "#fffbeb", border: "rgba(245,158,11,0.28)", dot: "#f59e0b" },
  error:   { fg: "#991b1b", bg: "#fef2f2", border: "rgba(239,68,68,0.24)", dot: "#ef4444" },
  info:    { fg: "#1e3a5f", bg: "#eff6ff", border: "rgba(59,130,246,0.24)", dot: "#3b82f6" },
  neutral: { fg: zinc[600], bg: zinc[100], border: zinc[200], dot: zinc[400] },
};

export const radius = {
  sm: 6,
  md: 9,
  lg: 12,
  xl: 16,
} as const;

export const shadow = {
  xs: "0 1px 2px rgba(9,9,11,0.04)",
  sm: "0 1px 2px rgba(9,9,11,0.04), 0 4px 10px -4px rgba(9,9,11,0.06)",
  md: "0 4px 16px -4px rgba(9,9,11,0.10)",
  lift: "0 8px 24px -8px rgba(9,9,11,0.14)",
} as const;

export const easing = {
  spring: [0.16, 1, 0.3, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
};

export const duration = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
};

export const fontFamily =
  "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
