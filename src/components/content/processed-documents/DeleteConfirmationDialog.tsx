import { RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent,
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  count: number;
  isDeleting: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  isDeleting
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isDeleting) return; // Prevent multiple clicks
    
    try {
      await onConfirm();
      // The onConfirm function will handle closing the dialog on success
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      // Keep dialog open on error so user can try again
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if not in the middle of deleting
      if (!isDeleting || !isOpen) {
        onOpenChange(isOpen);
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {count} document{count !== 1 ? 's' : ''} from the database.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
