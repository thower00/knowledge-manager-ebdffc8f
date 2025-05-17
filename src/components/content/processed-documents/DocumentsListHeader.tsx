
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";

interface DocumentsListHeaderProps {
  selectedCount: number;
  onRefresh: () => void;
  onDelete: () => void;
  isLoading: boolean;
  isDeleting: boolean;
}

export function DocumentsListHeader({
  selectedCount,
  onRefresh,
  onDelete,
  isLoading,
  isDeleting
}: DocumentsListHeaderProps) {
  return (
    <div className="p-4 border-b bg-muted/50 flex justify-between items-center">
      <div>
        <div className="font-medium">Processed Documents</div>
        <div className="text-sm text-muted-foreground">
          Documents that have been processed and stored in the database
        </div>
      </div>
      <div className="flex gap-2">
        {selectedCount > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="whitespace-nowrap"
          >
            {isDeleting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Selected ({selectedCount})
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRefresh} 
          className="whitespace-nowrap"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
}
