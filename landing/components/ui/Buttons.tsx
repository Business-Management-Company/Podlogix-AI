import Image from "next/image";

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/** Black pill with the cream arrow tab: "Start free", "Get started free". */
export function ArrowPill({ href, children, className = "" }: LinkProps) {
  return (
    <a
      href={href}
      className={`group pill-cta transition-[scale] duration-200 ease-soft active:scale-[0.97] ${className}`}
    >
      <span className="display flex items-center justify-center px-2 text-[16px] leading-[1.4] text-cream">
        {children}
      </span>
      <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-[20px]">
        <Image src="/l/icons/arrow-pill.svg" alt="" width={48} height={40} unoptimized className="block h-full w-full transition-transform duration-300 ease-soft group-hover:translate-x-[3px]" />
      </span>
    </a>
  );
}

/** Text-only pill that sits beside an ArrowPill. */
export function GhostPill({ href, children, className = "" }: LinkProps) {
  return (
    <a
      href={href}
      className={`display flex h-12 items-center justify-center rounded-[40px] px-4 text-[16px] leading-[1.4] text-cream transition-colors duration-200 hover:bg-white/5 active:bg-white/10 ${className}`}
    >
      {children}
    </a>
  );
}

/** Small white pill used inside cards: "Listen now", "Get started now". */
export function WhitePill({ href, children, className = "" }: LinkProps) {
  return (
    <a
      href={href}
      className={`display flex h-9 items-center gap-2 rounded-[57.6px] bg-white py-1 pl-2 pr-1 text-[14px] leading-4 text-ink transition-[scale] duration-200 ease-soft active:scale-[0.97] ${className}`}
    >
      {children}
    </a>
  );
}
