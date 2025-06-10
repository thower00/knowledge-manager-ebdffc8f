
import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";

interface VectorControlsProps {
  onRefresh: () => void;
  onClearAll: () => void;
  isLoading: boolean;
  isClearing: boolean;
  totalEmbeddings?: number;
}

export function VectorControls({ 
  onRefresh, 
  onClearAll, 
  isLoading, 
  isClearing, 
  totalEmbeddings 
}: VectorControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={onRefresh}
        disabled={isLoading}
        variant="outline"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      
      <Button
        onClick={onClearAll}
        disabled={isClearing || !totalEmbeddings}
        variant="destructive"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear All Embeddings
      </Button>
    </div>
  );
}
