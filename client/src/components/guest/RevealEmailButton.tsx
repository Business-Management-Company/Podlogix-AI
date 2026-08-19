import { Loader2, Mail, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RevealEmailButtonProps {
  email?: string | null;
  canReveal: boolean;
  isPending: boolean;
  onConfirm: () => void;
  className?: string;
}

export function RevealEmailButton({
  email,
  canReveal,
  isPending,
  onConfirm,
  className,
}: RevealEmailButtonProps) {
  if (email) {
    return (
      <Button asChild variant="outline" className={className}>
        <a href={`mailto:${email}`}>
          <Mail className="mr-1.5 h-4 w-4" />
          {email}
        </a>
      </Button>
    );
  }

  if (!canReveal) {
    return (
      <Button variant="outline" disabled className={className} title="A supported social profile is needed before contact enrichment can run.">
        <Mail className="mr-1.5 h-4 w-4" />
        Email unavailable
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending} className={className}>
          {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
          Reveal email · 1 credit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use one contact credit?</AlertDialogTitle>
          <AlertDialogDescription>
            Podlogix will request a verified email from Influencers Club. The result is saved and future views will not spend another credit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reveal email · 1 credit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
