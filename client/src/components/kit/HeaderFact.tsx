import { Pencil, type LucideIcon } from "lucide-react";

/**
 * Read-only fact card used in drawer headers (Contacts, Guest Pipeline,
 * Discover) — icon + label + value, with an optional edit pencil that only
 * shows on hover. Extracted out of EmailHub.tsx so Guests.tsx can share the
 * exact same header instead of duplicating the markup (which is how it lost
 * edit support last time around).
 */
export function HeaderFact({
  icon: Icon,
  label,
  value,
  onEdit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="group relative flex items-center gap-2.5 rounded-lg border p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="absolute right-2 top-2 rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-700 group-hover:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
