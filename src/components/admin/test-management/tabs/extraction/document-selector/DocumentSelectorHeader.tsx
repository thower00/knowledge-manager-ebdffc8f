
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface DocumentSelectorHeaderProps {
  refreshDocuments: () => Promise<void>;
  isLoading: boolean;
}

export function DocumentSelectorHeader({
  refreshDocuments,
  isLoading
}: DocumentSelectorHeaderProps) {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleRefresh = async () => {
    await refreshDocuments();
    setLastRefresh(new Date());
  };

  return (
    <div className="p-4 border-b bg-muted/50 flex justify-between items-center">
      <div>
        <div className="font-medium">Extract from Database Documents</div>
        <div className="text-sm text-muted-foreground">
          Select documents to extract text for testing
          {lastRefresh && (
            <span className="ml-2 text-xs">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleRefresh}
        disabled={isLoading}
      >
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Refresh Documents
      </Button>
    </div>
  );
}
