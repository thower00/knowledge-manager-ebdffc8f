
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
import { useRef, useState } from "react";

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
  const deleteRequestedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    // Prevent double-clicks or multiple submissions
    if (isDeleting || deleteRequestedRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      deleteRequestedRef.current = true;
      await onConfirm();
      // Dialog will be closed in the onConfirm function
    } catch (error) {
      console.error("Error in delete confirmation:", error);
    } finally {
      setIsProcessing(false);
      // Reset flag even if there's an error
      setTimeout(() => {
        deleteRequestedRef.current = false;
      }, 500);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if not in the middle of deleting
      if (!isDeleting && !isProcessing || !isOpen) {
        onOpenChange(isOpen);
        // Reset the request flag when dialog closes
        if (!isOpen) {
          deleteRequestedRef.current = false;
          setIsProcessing(false);
        }
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
          <AlertDialogCancel disabled={isDeleting || isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isDeleting || isProcessing || deleteRequestedRef.current}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {(isDeleting || isProcessing) ? (
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
