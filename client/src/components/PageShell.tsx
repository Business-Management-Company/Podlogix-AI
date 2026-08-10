interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}

export function PageShell({ title, subtitle, action, children, wide }: PageShellProps) {
  return (
    <div className="min-h-full bg-background">
      <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-6xl"} px-6 py-8`}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
