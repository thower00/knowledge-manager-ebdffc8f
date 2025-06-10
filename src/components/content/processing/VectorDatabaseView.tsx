
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useVectorDatabase } from "./hooks/useVectorDatabase";
import { VectorStats } from "./components/VectorStats";
import { VectorControls } from "./components/VectorControls";
import { ProviderModelInfo } from "./components/ProviderModelInfo";
import { DocumentCleanup } from "./components/DocumentCleanup";
import { RecentEmbeddingsTable } from "./components/RecentEmbeddingsTable";
import { VectorDatabaseDialogs } from "./components/VectorDatabaseDialogs";

export function VectorDatabaseView() {
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [showClearDocDialog, setShowClearDocDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

  const {
    stats,
    embeddings,
    isLoading,
    isClearing,
    loadVectorData,
    clearAllEmbeddings,
    clearDocumentEmbeddings,
  } = useVectorDatabase();

  const handleClearAllEmbeddings = async () => {
    await clearAllEmbeddings();
    setShowClearAllDialog(false);
  };

  const handleClearDocumentEmbeddings = async (documentId: string) => {
    await clearDocumentEmbeddings(documentId);
    setShowClearDocDialog(false);
    setSelectedDocumentId("");
  };

  const handleClearDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setShowClearDocDialog(true);
  };

  const handleClearSelectedDocument = () => {
    setSelectedDocumentId("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Vector Database Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <VectorStats stats={stats} />

        {/* Controls */}
        <VectorControls
          onRefresh={loadVectorData}
          onClearAll={() => setShowClearAllDialog(true)}
          isLoading={isLoading}
          isClearing={isClearing}
          totalEmbeddings={stats?.total_embeddings}
        />

        {/* Provider and Model Info */}
        <ProviderModelInfo stats={stats} />

        {/* Document-specific cleanup */}
        <DocumentCleanup
          embeddings={embeddings}
          onClearDocument={handleClearDocument}
          isClearing={isClearing}
        />

        {/* Recent Embeddings Table */}
        <RecentEmbeddingsTable embeddings={embeddings} />

        {/* Dialogs */}
        <VectorDatabaseDialogs
          showClearAllDialog={showClearAllDialog}
          showClearDocDialog={showClearDocDialog}
          selectedDocumentId={selectedDocumentId}
          totalEmbeddings={stats?.total_embeddings}
          onClearAllDialogChange={setShowClearAllDialog}
          onClearDocDialogChange={setShowClearDocDialog}
          onClearAllEmbeddings={handleClearAllEmbeddings}
          onClearDocumentEmbeddings={handleClearDocumentEmbeddings}
          onClearSelectedDocument={handleClearSelectedDocument}
        />
      </CardContent>
    </Card>
  );
}
