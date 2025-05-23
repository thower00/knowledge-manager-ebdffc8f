
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardContent } from "@/components/ui/card";
import { FileText, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";

interface DocumentSelectorFooterProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  extractAllDocuments: boolean;
  setExtractAllDocuments: (value: boolean) => void;
  isLoading: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  currentDocumentIndex: number;
  documentsToProcessCount: number;
}

export function DocumentSelectorFooter({
  documents,
  selectedDocumentIds,
  extractAllDocuments,
  setExtractAllDocuments,
  isLoading,
  isExtracting,
  onExtract,
  currentDocumentIndex,
  documentsToProcessCount
}: DocumentSelectorFooterProps) {
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [hasTriedExtraction, setHasTriedExtraction] = useState(false);
  const [canExtract, setCanExtract] = useState(false);
  const [showError, setShowError] = useState(false);

  // Log selection state for debugging
  useEffect(() => {
    console.log("DocumentSelectorFooter selection state:", {
      selectedIds: selectedDocumentIds,
      extractAll: extractAllDocuments,
      documentsCount: documents.length
    });
  }, [selectedDocumentIds, extractAllDocuments, documents]);

  // Calculate if extract button should be enabled - updated for better debugging
  useEffect(() => {
    const hasSelection = selectedDocumentIds && selectedDocumentIds.length > 0;
    const shouldEnableExtract = (!isLoading && !isExtracting && 
      ((hasSelection && !extractAllDocuments) || 
      (extractAllDocuments && documents.length > 0)));
    
    console.log("Extract button state calculation:", {
      shouldEnable: shouldEnableExtract,
      hasSelection,
      selectedDocIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds ? selectedDocumentIds.length : 0,
      extractAll: extractAllDocuments,
      docsCount: documents.length,
      isLoading,
      isExtracting
    });
    
    setCanExtract(shouldEnableExtract);
    
    // Hide error if we have a valid selection
    if (shouldEnableExtract) {
      setShowError(false);
    }
  }, [selectedDocumentIds, extractAllDocuments, documents, isLoading, isExtracting]);

  // Handle extract button click with visual feedback and debugging
  const handleExtractClick = () => {
    console.log("Extract button clicked with state:", {
      selectedCount: selectedDocumentIds ? selectedDocumentIds.length : 0,
      extractAll: extractAllDocuments,
      canExtract,
      documents: documents.map(d => ({ id: d.id, title: d.title })),
      selectedIds: selectedDocumentIds
    });
    
    setHasTriedExtraction(true);
    
    // Validation check - show error if needed
    if (!extractAllDocuments && (!selectedDocumentIds || selectedDocumentIds.length === 0)) {
      console.error("No documents selected for extraction and extract all not enabled");
      setShowError(true);
      return;
    }
    
    if (!canExtract) {
      console.error("Extract button clicked but extraction is not allowed");
      return;
    }
    
    // Add visual feedback for button click
    setIsButtonClicked(true);
    setTimeout(() => setIsButtonClicked(false), 300);
    
    // Call the extraction handler after a slight delay to ensure state updates have propagated
    setTimeout(() => {
      // Call the extraction handler
      onExtract();
      
      // Additional logging to confirm handler was called
      console.log("Extract handler called! Extraction should now be starting...");
    }, 50);
  };

  return (
    <CardContent className="p-4 border-t">
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox 
          id="extract-all" 
          checked={extractAllDocuments}
          onCheckedChange={(checked) => {
            console.log("Extract all changed to:", checked);
            setExtractAllDocuments(checked === true);
          }}
        />
        <label htmlFor="extract-all" className="text-sm cursor-pointer">
          Extract from all documents (ignores selection)
        </label>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {extractAllDocuments 
            ? `All ${documents.length} documents will be processed` 
            : `${selectedDocumentIds ? selectedDocumentIds.length : 0} document(s) selected`}
        </div>
        
        <Button 
          onClick={handleExtractClick}
          disabled={isExtracting} // Allow clicking even if validation might fail
          data-testid="extract-selected-button"
          className={isButtonClicked ? "bg-primary/80" : ""}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {documentsToProcessCount > 1 
                ? `Extracting Document ${currentDocumentIndex + 1}/${documentsToProcessCount}...` 
                : "Extracting..."}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              {extractAllDocuments ? "Extract All" : "Extract Selected"}
            </>
          )}
        </Button>
      </div>
      
      {/* Error feedback - shown when validation fails */}
      {(showError || (hasTriedExtraction && !isExtracting && (!selectedDocumentIds || selectedDocumentIds.length === 0) && !extractAllDocuments)) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 flex items-center text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span>Please select at least one document or enable "Extract All"</span>
        </div>
      )}
    </CardContent>
  );
}
