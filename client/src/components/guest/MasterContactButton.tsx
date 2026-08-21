import { Check, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasterContactButtonProps {
  masterContactId?: string | null;
  isPending?: boolean;
  onAdd: () => void;
  className?: string;
}

export function MasterContactButton({
  masterContactId,
  isPending = false,
  onAdd,
  className,
}: MasterContactButtonProps) {
  const isContact = Boolean(masterContactId);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isContact || isPending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        isContact
          ? "bg-emerald-50 text-emerald-700 cursor-default"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : isContact ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <UserPlus className="h-3 w-3" aria-hidden="true" />
      )}
      {isContact ? "In Contacts" : "Add to Contacts"}
    </button>
  );
}
