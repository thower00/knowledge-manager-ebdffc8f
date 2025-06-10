
import React from "react";
import { AlertTriangle } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VectorDatabaseDialogsProps {
  showClearAllDialog: boolean;
  showClearDocDialog: boolean;
  selectedDocumentId: string;
  totalEmbeddings?: number;
  onClearAllDialogChange: (open: boolean) => void;
  onClearDocDialogChange: (open: boolean) => void;
  onClearAllEmbeddings: () => void;
  onClearDocumentEmbeddings: (documentId: string) => void;
  onClearSelectedDocument: () => void;
}

export function VectorDatabaseDialogs({
  showClearAllDialog,
  showClearDocDialog,
  selectedDocumentId,
  totalEmbeddings,
  onClearAllDialogChange,
  onClearDocDialogChange,
  onClearAllEmbeddings,
  onClearDocumentEmbeddings,
  onClearSelectedDocument,
}: VectorDatabaseDialogsProps) {
  return (
    <>
      {/* Clear All Dialog */}
      <AlertDialog open={showClearAllDialog} onOpenChange={onClearAllDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Clear All Embeddings</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all {totalEmbeddings || 0} embeddings from the vector database. 
              This cannot be undone. You will need to reprocess all documents to regenerate the embeddings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onClearAllEmbeddings}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Embeddings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Document Dialog */}
      <AlertDialog open={showClearDocDialog} onOpenChange={onClearDocDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Document Embeddings</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all embeddings for the selected document. This action cannot be undone.
              Document ID: {selectedDocumentId}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClearSelectedDocument}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onClearDocumentEmbeddings(selectedDocumentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Document Embeddings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
