import { EqGlyph } from "@/components/icons";

type EyebrowProps = {
  children: React.ReactNode;
  /** Figma sets the hero-adjacent sections at 90% and the rest at 80%. */
  tone?: "80" | "90";
  className?: string;
};

export function Eyebrow({ children, tone = "80", className = "" }: EyebrowProps) {
  const color = tone === "90" ? "text-white/90" : "text-white/80";
  return (
    <div className={`flex items-start gap-2 ${color} ${className}`}>
      <EqGlyph />
      <span className="eyebrow-label">{children}</span>
    </div>
  );
}

type TitleProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

export function SectionTitle({ children, className = "", as: Tag = "h2" }: TitleProps) {
  return <Tag className={`h-section ${className}`}>{children}</Tag>;
}
