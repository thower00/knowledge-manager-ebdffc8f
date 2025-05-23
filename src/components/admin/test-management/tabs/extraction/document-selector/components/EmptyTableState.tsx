
import { CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EmptyTableStateProps {
  isLoading: boolean;
}

export function EmptyTableState({ isLoading }: EmptyTableStateProps) {
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

  return (
    <CardContent className="p-0">
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-2">No documents available in the database</p>
        <p className="text-sm text-muted-foreground">
          Upload documents in the Content Management tab first
        </p>
      </div>
    </CardContent>
  );
}
