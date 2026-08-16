import type { CSSProperties } from "react";
import type { ProfileDesignSettings } from "@shared/schema";

/** Unified swatch set used across every color-picking Design sub-tab. */
export const SWATCH_COLORS = [
  "#FFFFFF", "#D1D5DB", "#9CA3AF", "#6B7280", "#000000", "#991B1B", "#DC2626",
  "#EA580C", "#CA8A04", "#DB2777", "#7C3AED", "#1E3A8A", "#0D9488", "#16A34A",
];

export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "IBM Plex Mono", label: "IBM Plex Mono" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
];

export const LINK_SHAPES: { value: ProfileDesignSettings["linkShape"]; label: string; radius: string }[] = [
  { value: "pill", label: "Pill", radius: "9999px" },
  { value: "rounded", label: "Rounded", radius: "12px" },
  { value: "square", label: "Square", radius: "2px" },
  { value: "squircle", label: "Squircle", radius: "18px" },
];

export const LINK_STYLES: { value: ProfileDesignSettings["linkStyle"]; label: string }[] = [
  { value: "fill", label: "Fill" },
  { value: "outline", label: "Outline" },
  { value: "soft-shadow", label: "Soft Shadow" },
  { value: "hard-shadow", label: "Hard Shadow" },
];

export const SHADE_OPTIONS: { value: ProfileDesignSettings["shade"]; label: string; preview: string }[] = [
  { value: "none", label: "None", preview: "#ffffff" },
  { value: "minimal", label: "Minimal", preview: "#f9fafb" },
  { value: "light", label: "Light", preview: "#f3f4f6" },
  { value: "color", label: "Color Tint", preview: "" }, // resolved from themeColor at render time
  { value: "dark", label: "Dark", preview: "#0f1117" },
];

export type TemplateId = "classic" | "bold" | "minimal" | "vibrant" | "portrait";

export interface TemplateConfig {
  id: TemplateId;
  label: string;
  overrides: Partial<ProfileDesignSettings>;
}

export const PROFILE_TEMPLATES: TemplateConfig[] = [
  {
    id: "classic",
    label: "Classic",
    overrides: { bgMode: "solid", bgColor: "#FFFFFF", shade: "none", darkMode: false, cardStyle: "shadow", linkStyle: "soft-shadow", linkShape: "rounded", fontFamily: "Inter" },
  },
  {
    id: "bold",
    label: "Bold",
    overrides: { bgMode: "solid", bgColor: "#0f1117", shade: "dark", darkMode: true, cardStyle: "square", linkStyle: "fill", linkShape: "rounded", fontFamily: "Inter" },
  },
  {
    id: "minimal",
    label: "Minimal",
    overrides: { bgMode: "solid", bgColor: "#FAFAFA", shade: "minimal", darkMode: false, cardStyle: "square", linkStyle: "outline", linkShape: "square", fontFamily: "Merriweather" },
  },
  {
    id: "vibrant",
    label: "Vibrant",
    overrides: { bgMode: "solid", shade: "color", darkMode: false, cardStyle: "round", linkStyle: "fill", linkShape: "pill", fontFamily: "Poppins" },
  },
  {
    id: "portrait",
    label: "Portrait",
    overrides: { bgMode: "solid", bgColor: "#000000", shade: "dark", darkMode: true, cardStyle: "glass", linkStyle: "soft-shadow", linkShape: "pill", fontFamily: "Inter" },
  },
];

/** Resolves a hex color with alpha suffix, e.g. withAlpha("#E75427", "15") -> "#E7542715". */
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

/** Page background (color or gradient) driven by bgMode + shade. */
export function getPageBackground(design: ProfileDesignSettings): string {
  if (design.bgMode === "gradient") {
    return `linear-gradient(180deg, ${withAlpha(design.themeColor, "33")} 0%, ${design.bgColor} 100%)`;
  }
  if (design.shade === "color") {
    return withAlpha(design.themeColor, "15");
  }
  return design.bgColor;
}

/** Inline style for a link/CTA button given the current link shape/style/color. */
export function getLinkButtonStyle(design: ProfileDesignSettings): CSSProperties {
  const radius = LINK_SHAPES.find((s) => s.value === design.linkShape)?.radius ?? "9999px";
  const base: CSSProperties = { borderRadius: radius };
  switch (design.linkStyle) {
    case "outline":
      return { ...base, background: "transparent", border: `1.5px solid ${design.linkColor}`, color: design.linkColor };
    case "soft-shadow":
      return { ...base, background: "#fff", color: design.linkColor, boxShadow: `0 2px 10px ${withAlpha(design.linkColor, "26")}`, border: "1px solid transparent" };
    case "hard-shadow":
      return { ...base, background: "#fff", color: design.linkColor, border: `1.5px solid ${design.linkColor}`, boxShadow: `3px 3px 0 ${design.linkColor}` };
    case "fill":
    default:
      return { ...base, background: design.linkColor, color: "#fff", border: "1px solid transparent" };
  }
}

/** Inline style for a content card (video/podcast/booking/etc.) given the current card style. */
export function getCardStyle(design: ProfileDesignSettings): CSSProperties {
  switch (design.cardStyle) {
    case "square":
      return { borderRadius: "4px", border: "1px solid #e5e7eb" };
    case "glass":
      return { borderRadius: "18px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" };
    case "shadow":
      return { borderRadius: "14px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", border: "1px solid transparent" };
    case "round":
    default:
      return { borderRadius: "20px", border: "1px solid #e5e7eb" };
  }
}
