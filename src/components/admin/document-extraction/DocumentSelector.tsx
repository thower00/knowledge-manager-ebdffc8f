
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { ProcessedDocument } from "@/types/document";
import { validatePdfUrl } from "./utils/urlUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentSelectorProps {
  documents: ProcessedDocument[] | undefined;
  selectedDocumentId: string;
  setSelectedDocumentId: (id: string) => void;
  isLoading: boolean;
  isExtracting: boolean;
  onExtractClick: () => void;
  isProxyAvailable: boolean;
  isCheckingConnection: boolean;
  storeInDatabase?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documents,
  selectedDocumentId,
  setSelectedDocumentId,
  isLoading,
  isExtracting,
  onExtractClick,
  isProxyAvailable,
  isCheckingConnection,
  storeInDatabase = false,
}) => {
  // Track URL validity for the selected document
  const [urlStatus, setUrlStatus] = useState<{
    isValid: boolean;
    message: string | null;
  }>({ isValid: true, message: null });
  
  // Check URL validity whenever the selected document changes
  useEffect(() => {
    if (!selectedDocumentId || !documents) {
      setUrlStatus({ isValid: true, message: null });
      return;
    }
    
    const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
    if (!selectedDoc || !selectedDoc.url) {
      setUrlStatus({ isValid: true, message: null });
      return;
    }
    
    // Validate the document URL
    const result = validatePdfUrl(selectedDoc.url);
    setUrlStatus(result);
  }, [selectedDocumentId, documents]);

  // Determine if the extract button should be enabled
  // Allow extracting if selected document is valid AND either:
  // 1. Proxy is available, OR
  // 2. Store in database is enabled, OR
  // 3. Connection check is in progress
  const canExtract = selectedDocumentId && 
                    !isExtracting && 
                    urlStatus.isValid && 
                    (isProxyAvailable || storeInDatabase || isCheckingConnection);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="document-select">Select Document</Label>
        <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
          <SelectTrigger id="document-select" className="w-full">
            <SelectValue placeholder="Select a document" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                Loading documents...
              </SelectItem>
            ) : documents && documents.length > 0 ? (
              documents.map((doc) => {
                const isValidUrl = doc.url ? validatePdfUrl(doc.url).isValid : true;
                return (
                  <SelectItem 
                    key={doc.id} 
                    value={doc.id}
                    className={!isValidUrl ? "text-amber-600" : ""}
                  >
                    {doc.title}
                    {!isValidUrl && " (URL format issue)"}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-docs" disabled>
                No documents available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {selectedDocumentId && !urlStatus.isValid && (
          <div className="text-sm text-amber-600 flex items-center mt-1">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>{urlStatus.message}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          {isCheckingConnection && (
            <div className="flex items-center text-sm text-amber-600">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              <span>Checking proxy connection...</span>
            </div>
          )}
          
          {!isCheckingConnection && !isProxyAvailable && !storeInDatabase && (
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Proxy service unavailable</span>
            </div>
          )}
          
          {!isCheckingConnection && !isProxyAvailable && storeInDatabase && (
            <div className="flex items-center text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Proxy unavailable, using database storage</span>
            </div>
          )}
          
          {!isCheckingConnection && isProxyAvailable && (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Proxy service connected</span>
            </div>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={onExtractClick}
                  disabled={!canExtract}
                  className="w-full sm:w-auto"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Extract Text
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!canExtract && selectedDocumentId && !urlStatus.isValid && (
              <TooltipContent>
                <p>Cannot extract: {urlStatus.message}</p>
              </TooltipContent>
            )}
            {!canExtract && !selectedDocumentId && (
              <TooltipContent>
                <p>Please select a document first</p>
              </TooltipContent>
            )}
            {!canExtract && !isProxyAvailable && !storeInDatabase && (
              <TooltipContent>
                <p>Proxy service is unavailable. Try enabling database storage.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
