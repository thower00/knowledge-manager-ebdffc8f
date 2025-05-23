
import { ProcessedDocument } from "@/types/document";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ProcessedDocumentStatusBadge } from "@/components/content/processed-documents/ProcessedDocumentStatusBadge";

interface ExtractDocumentsSelectorProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  refreshDocuments: () => Promise<void>;
  isLoading: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  extractAllDocuments: boolean;
  setExtractAllDocuments: (value: boolean) => void;
  proxyConnected: boolean | null;
  currentDocumentIndex: number;
  documentsToProcessCount: number;
}

export function ExtractDocumentsSelector({
  documents,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  refreshDocuments,
  isLoading,
  isExtracting,
  onExtract,
  extractAllDocuments,
  setExtractAllDocuments,
  proxyConnected,
  currentDocumentIndex,
  documentsToProcessCount
}: ExtractDocumentsSelectorProps) {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

  // Sync local state with prop
  useEffect(() => {
    setLocalSelectedIds(selectedDocumentIds);
  }, [selectedDocumentIds]);

  // Log selection state on render for debugging
  useEffect(() => {
    console.log("ExtractDocumentsSelector rendered with:", {
      documentsCount: documents.length,
      selectedIds: selectedDocumentIds,
      localSelectedIds,
      extractAll: extractAllDocuments,
      isLoading,
      isExtracting
    });
    
    // Force re-check document selection when component updates
    if (selectedDocumentIds.length > 0) {
      console.log("Document selection validated:", selectedDocumentIds);
    }
  }, [documents, selectedDocumentIds, localSelectedIds, extractAllDocuments, isLoading, isExtracting]);

  const handleRefresh = async () => {
    await refreshDocuments();
    setLastRefresh(new Date());
  };

  // Calculate if extract button should be enabled
  const canExtract = (!isLoading && !isExtracting && 
    ((selectedDocumentIds.length > 0 && !extractAllDocuments) || 
     (extractAllDocuments && documents.length > 0)));
     
  // Force row class to be very visible when selected
  const getRowClass = (docId: string) => {
    if (selectedDocumentIds.includes(docId)) {
      return "bg-primary-foreground/30 border-l-4 border-l-primary";
    }
    return "";
  };

  // Handle direct row click for selection
  const handleRowClick = (docId: string) => {
    console.log("Row clicked for document:", docId);
    toggleDocumentSelection(docId);
  };

  // Handle extract button click with validation
  const handleExtractClick = () => {
    console.log("Extract button clicked with state:", {
      selectedCount: selectedDocumentIds.length,
      localSelectedIds: localSelectedIds.length,
      extractAll: extractAllDocuments,
      canExtract,
      documents: documents.map(d => ({ id: d.id, title: d.title }))
    });
    
    if (!canExtract) {
      console.error("Extract button clicked but extraction is not allowed");
      return;
    }
    
    onExtract();
  };

  return (
    <Card>
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

      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No documents available in the database</p>
            <p className="text-sm text-muted-foreground">
              Upload documents in the Content Management tab first
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedDocumentIds.length === documents.length && documents.length > 0}
                        onCheckedChange={() => {
                          console.log("Toggle all checkbox clicked");
                          toggleSelectAll();
                        }}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      className={getRowClass(doc.id)}
                      onClick={() => handleRowClick(doc.id)}
                      style={{ cursor: 'pointer' }}
                      data-selected={selectedDocumentIds.includes(doc.id)}
                      data-testid={`document-row-${doc.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedDocumentIds.includes(doc.id)}
                          onCheckedChange={() => {
                            console.log("Checkbox clicked for document:", doc.id);
                            toggleDocumentSelection(doc.id);
                          }}
                          data-testid={`document-checkbox-${doc.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <span className="text-xs whitespace-nowrap">{doc.mime_type}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {doc.source_type}
                      </TableCell>
                      <TableCell>
                        <ProcessedDocumentStatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {doc.processed_at ? new Date(doc.processed_at).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="extract-all" 
                  checked={extractAllDocuments}
                  onCheckedChange={(checked) => {
                    console.log("Extract all checkbox clicked, new value:", checked);
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
                    : `${selectedDocumentIds.length} document(s) selected`}
                </div>
                
                <Button 
                  onClick={handleExtractClick}
                  disabled={!canExtract}
                  data-testid="extract-selected-button"
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
            </div>
          </>
        )}
      </CardContent>
      
      {/* Connection status indicator */}
      <div className="p-3 border-t flex items-center space-x-2">
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
    </Card>
  );
}
