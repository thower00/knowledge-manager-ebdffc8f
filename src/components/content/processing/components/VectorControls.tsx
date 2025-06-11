
import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";

interface VectorControlsProps {
  onRefresh: () => void;
  onDeleteAll: () => void;
  isLoading: boolean;
  isDeleting: boolean;
  totalEmbeddings?: number;
}

export function VectorControls({ 
  onRefresh, 
  onDeleteAll, 
  isLoading, 
  isDeleting, 
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
        onClick={onDeleteAll}
        disabled={isDeleting || !totalEmbeddings}
        variant="destructive"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear All Embeddings
      </Button>
    </div>
  );
}
