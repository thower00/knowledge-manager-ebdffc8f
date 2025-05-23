
import { CardContent } from "@/components/ui/card";
import { Loader2, FileX, AlertTriangle } from "lucide-react";

interface EmptyTableStateProps {
  isLoading: boolean;
  documentsCount?: number;
}

export function EmptyTableState({ isLoading, documentsCount = 0 }: EmptyTableStateProps) {
  // Log the state for debugging
  console.log("EmptyTableState rendered with:", { isLoading, documentsCount });

  if (isLoading) {
    return (
      <CardContent className="p-0">
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </CardContent>
    );
  }

  if (documentsCount === 0) {
    return (
      <CardContent className="p-0">
        <div className="py-8 text-center">
          <FileX className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">No documents available in the database</p>
          <p className="text-sm text-muted-foreground">
            Upload documents in the Content Management tab first
          </p>
        </div>
      </CardContent>
    );
  }

  // This shouldn't normally be shown, but added as a fallback
  return (
    <CardContent className="p-0">
      <div className="py-8 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
        <p className="text-muted-foreground">
          Documents loaded but none are displayed. Please try refreshing.
        </p>
      </div>
    </CardContent>
  );
}
