import { Check, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      onClick={onAdd}
      disabled={isContact || isPending}
      className={cn(className)}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isContact ? (
        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
      ) : (
        <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
      )}
      {isContact ? "In Master Contacts" : "Add to Contacts"}
    </Button>
  );
}
