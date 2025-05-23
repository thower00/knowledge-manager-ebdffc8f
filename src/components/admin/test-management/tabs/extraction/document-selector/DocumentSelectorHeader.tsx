
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DocumentSelectorHeaderProps {
  refreshDocuments: () => Promise<void>;
  isLoading: boolean;
}

export function DocumentSelectorHeader({
  refreshDocuments,
  isLoading
}: DocumentSelectorHeaderProps) {
  // Handle refresh with proper Promise handling
  const handleRefresh = async () => {
    try {
      await refreshDocuments();
    } catch (error) {
      console.error("Error refreshing documents:", error);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="text-lg font-medium">Database Documents</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {isLoading ? "Loading..." : "Refresh"}
      </Button>
    </div>
  );
}
