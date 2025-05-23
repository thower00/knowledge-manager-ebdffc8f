
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Info } from "lucide-react";
import { ProcessedDocument } from "@/types/document";

interface ExtractControlsProps {
  dbDocuments: ProcessedDocument[];
  documentsToProcess: ProcessedDocument[];
  selectedDocumentIds: string[];
  extractAllDocuments: boolean;
  setExtractAllDocuments: (checked: boolean) => void;
  isExtracting: boolean;
  currentDocumentIndex: number;
  handleExtractFromDatabase: () => void;
  disabled?: boolean;
}

export function ExtractControls({
  dbDocuments,
  documentsToProcess,
  selectedDocumentIds,
  extractAllDocuments,
  setExtractAllDocuments,
  isExtracting,
  currentDocumentIndex,
  handleExtractFromDatabase,
  disabled
}: ExtractControlsProps) {
  // Calculate whether the extract button should be enabled
  const canExtract = ((selectedDocumentIds.length > 0 || extractAllDocuments) && 
                     dbDocuments.length > 0 && !isExtracting);
  
  // Debug the extraction conditions
  console.log("Extract button state:", {
    selectedCount: selectedDocumentIds.length,
    extractAll: extractAllDocuments,
    dbDocumentsLength: dbDocuments.length,
    isExtracting,
    canExtract
  });
  
  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="extract-all" 
          checked={extractAllDocuments}
          onCheckedChange={(checked) => {
            console.log("Extract all changed to:", checked);
            setExtractAllDocuments(checked === true);
          }}
          className="cursor-pointer"
          disabled={disabled}
        />
        <Label htmlFor="extract-all" className="cursor-pointer">Extract from all documents (ignores selection)</Label>
      </div>
      
      {selectedDocumentIds.length === 0 && !extractAllDocuments && dbDocuments.length > 0 && (
        <div className="flex items-center space-x-2 text-amber-600 text-sm mt-2">
          <Info className="h-4 w-4" />
          <span>Please select at least one document or enable "Extract All"</span>
        </div>
      )}
      
      <Button 
        className="w-full mt-2" 
        onClick={() => {
          console.log("Extract button clicked", {
            selectedCount: selectedDocumentIds.length,
            extractAll: extractAllDocuments,
          });
          handleExtractFromDatabase();
        }} 
        disabled={disabled || (!canExtract)}
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {documentsToProcess && documentsToProcess.length > 1 
              ? `Extracting Document ${currentDocumentIndex + 1}/${documentsToProcess.length}...` 
              : "Extracting..."}
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            {extractAllDocuments 
              ? `Extract from All Documents (${dbDocuments.length})` 
              : `Extract from Selected Documents (${selectedDocumentIds.length})`}
          </>
        )}
      </Button>
    </div>
  );
}
