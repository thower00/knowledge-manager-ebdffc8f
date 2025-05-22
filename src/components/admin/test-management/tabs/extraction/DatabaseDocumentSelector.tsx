
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, AlertTriangle, Info } from "lucide-react";
import { ProcessedDocument } from "@/types/document";

interface DatabaseDocumentSelectorProps {
  dbDocuments: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  isLoadingDocuments: boolean;
  refreshDocuments: () => void;
  extractAllDocuments: boolean;
  setExtractAllDocuments: (checked: boolean) => void;
  handleExtractFromDatabase: () => void;
  isExtracting: boolean;
  currentDocumentIndex: number;
  documentsToProcess: ProcessedDocument[];
  proxyConnected: boolean | null;
}

export const DatabaseDocumentSelector = ({
  dbDocuments,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  isLoadingDocuments,
  refreshDocuments,
  extractAllDocuments,
  setExtractAllDocuments,
  handleExtractFromDatabase,
  isExtracting,
  currentDocumentIndex,
  documentsToProcess,
  proxyConnected,
}: DatabaseDocumentSelectorProps) => {
  // Debug: Log selection state when component renders
  console.log("DatabaseDocumentSelector rendering with:", {
    dbDocumentsCount: dbDocuments?.length || 0,
    selectedDocumentIds,
    extractAllDocuments,
    documentsToProcessCount: Array.isArray(documentsToProcess) ? documentsToProcess.length : 0
  });

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
    <div className="space-y-2 p-4 border rounded-md bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-md font-medium">Extract from Database Documents</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDocuments}
          disabled={isLoadingDocuments}
        >
          {isLoadingDocuments ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            "Refresh Documents"
          )}
        </Button>
      </div>
      
      {/* Document List with checkboxes */}
      <div className="space-y-2">
        {isLoadingDocuments ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dbDocuments.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedDocumentIds.length === dbDocuments.length && dbDocuments.length > 0}
                  onCheckedChange={() => toggleSelectAll()}
                />
                <Label htmlFor="select-all" className="cursor-pointer">Select All Documents</Label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedDocumentIds.length} of {dbDocuments.length} selected
              </span>
            </div>
            
            <div className="max-h-60 overflow-auto border rounded-md">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {dbDocuments.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`flex items-center space-x-2 p-2 rounded-md ${
                        selectedDocumentIds.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => toggleDocumentSelection(doc.id)}
                    >
                      <Checkbox 
                        id={`doc-${doc.id}`} 
                        checked={selectedDocumentIds.includes(doc.id)}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                        className="cursor-pointer"
                      />
                      <div className="flex-grow cursor-pointer">
                        <Label htmlFor={`doc-${doc.id}`} className="cursor-pointer">{doc.title}</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {doc.mime_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center border rounded-md bg-gray-100">
            <p className="text-muted-foreground">No documents available in the database</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents in the Documents tab first
            </p>
          </div>
        )}
        
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox 
            id="extract-all" 
            checked={extractAllDocuments}
            onCheckedChange={(checked) => {
              console.log("Extract all changed to:", checked);
              setExtractAllDocuments(checked === true);
            }}
            className="cursor-pointer"
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
          className="w-full" 
          onClick={() => {
            console.log("Extract button clicked", {
              selectedCount: selectedDocumentIds.length,
              extractAll: extractAllDocuments,
              disabled: !canExtract
            });
            handleExtractFromDatabase();
          }} 
          disabled={!canExtract}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {Array.isArray(documentsToProcess) && documentsToProcess.length > 1 
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
      
      {/* Connection status indicator */}
      <div className="mt-4 flex items-center space-x-2">
        <span className={`h-2 w-2 rounded-full ${
          proxyConnected === true ? 'bg-green-500' : 
          proxyConnected === false ? 'bg-red-500' : 
          'bg-yellow-500 animate-pulse'
        }`}></span>
        <span className="text-sm text-muted-foreground">
          Proxy Service: {
            proxyConnected === true ? 'Available' : 
            proxyConnected === false ? 'Unavailable' : 
            'Checking...'
          }
        </span>
      </div>
    </div>
  );
};
