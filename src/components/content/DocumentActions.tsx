
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DocumentActionsProps {
  onRefresh: () => void;
  onProcess: () => void;
  isLoading: boolean;
  isUploading: boolean;
  selectedCount: number;
  disableRefresh: boolean;
}

export function DocumentActions({
  onRefresh,
  onProcess,
  isLoading,
  isUploading,
  selectedCount,
  disableRefresh
}: DocumentActionsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={onRefresh} 
        disabled={isLoading || disableRefresh}
      >
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Refresh Documents
      </Button>
      
      <Button 
        onClick={onProcess} 
        disabled={isUploading || selectedCount === 0}
      >
        {isUploading ? "Processing..." : "Process Selected"}
      </Button>
    </div>
  );
}
