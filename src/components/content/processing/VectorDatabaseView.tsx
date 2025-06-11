
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { VectorStats } from "./components/VectorStats";
import { VectorControls } from "./components/VectorControls";
import { RecentEmbeddingsTable } from "./components/RecentEmbeddingsTable";
import { DocumentCleanup } from "./components/DocumentCleanup";
import { VectorDatabaseDialogs } from "./components/VectorDatabaseDialogs";
import { useVectorDatabase } from "./hooks/useVectorDatabase";
import { DocumentResetService } from "./services/documentResetService";

export function VectorDatabaseView() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const {
    stats,
    embeddings,
    isLoading,
    isDeleting,
    isDeleteDialogOpen,
    isDeleteAllDialogOpen,
    isDeleteDocumentDialogOpen,
    selectedDocumentId,
    loadStats,
    loadEmbeddings,
    handleDeleteAll,
    handleDeleteDocument,
    setIsDeleteDialogOpen,
    setIsDeleteAllDialogOpen,
    setIsDeleteDocumentDialogOpen,
    confirmDeleteAll,
    confirmDeleteDocument,
  } = useVectorDatabase();

  const handleResetFailedDocuments = async () => {
    setIsResetting(true);
    try {
      const result = await DocumentResetService.resetFailedDocuments();
      
      if (result.success) {
        toast({
          title: "Reset Complete",
          description: result.message,
        });
        // Refresh the stats and embeddings after reset
        loadStats();
        loadEmbeddings();
      } else {
        toast({
          variant: "destructive",
          title: "Reset Failed",
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Error resetting failed documents:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "An unexpected error occurred while resetting documents",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vector Database</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFailedDocuments}
              disabled={isResetting || isLoading}
            >
              {isResetting ? (
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset Failed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadStats();
                loadEmbeddings();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <VectorStats stats={stats} isLoading={isLoading} />
        
        <VectorControls 
          onDeleteAll={handleDeleteAll}
          isDeleting={isDeleting}
        />
        
        <RecentEmbeddingsTable 
          embeddings={embeddings}
          isLoading={isLoading}
          onDeleteDocument={handleDeleteDocument}
        />
        
        <DocumentCleanup />
        
        <VectorDatabaseDialogs
          isDeleteDialogOpen={isDeleteDialogOpen}
          isDeleteAllDialogOpen={isDeleteAllDialogOpen}
          isDeleteDocumentDialogOpen={isDeleteDocumentDialogOpen}
          selectedDocumentId={selectedDocumentId}
          isDeleting={isDeleting}
          onDeleteDialogChange={setIsDeleteDialogOpen}
          onDeleteAllDialogChange={setIsDeleteAllDialogOpen}
          onDeleteDocumentDialogChange={setIsDeleteDocumentDialogOpen}
          onConfirmDeleteAll={confirmDeleteAll}
          onConfirmDeleteDocument={confirmDeleteDocument}
        />
      </CardContent>
    </Card>
  );
}
