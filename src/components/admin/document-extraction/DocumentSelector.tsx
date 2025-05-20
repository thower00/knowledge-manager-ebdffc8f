
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
}) => {
  // Track URL validity for the selected document
  const [urlStatus, setUrlStatus] = useState<{
    isValid: boolean;
    message: string | null;
    canAutoFix: boolean;
  }>({ isValid: true, message: null, canAutoFix: false });
  
  // Check URL validity whenever the selected document changes
  useEffect(() => {
    if (!selectedDocumentId || !documents) {
      setUrlStatus({ isValid: true, message: null, canAutoFix: false });
      return;
    }
    
    const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
    if (!selectedDoc || !selectedDoc.url) {
      setUrlStatus({ isValid: true, message: null, canAutoFix: false });
      return;
    }
    
    // Validate the document URL
    const result = validatePdfUrl(selectedDoc.url);
    
    // Check if this is a Google Drive URL that could be auto-fixed
    const canAutoFix = selectedDoc.url.includes('drive.google.com') && !result.isValid;
    
    setUrlStatus({
      ...result,
      canAutoFix
    });
  }, [selectedDocumentId, documents]);

  // Determine if the extract button should be enabled
  const canExtract = selectedDocumentId && 
                    !isExtracting && 
                    (urlStatus.isValid || urlStatus.canAutoFix) && 
                    (isProxyAvailable || isCheckingConnection);

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
                const urlValidation = doc.url ? validatePdfUrl(doc.url) : { isValid: true };
                const canAutoFix = doc.url?.includes('drive.google.com') && !urlValidation.isValid;
                
                return (
                  <SelectItem 
                    key={doc.id} 
                    value={doc.id}
                    className={!urlValidation.isValid ? (canAutoFix ? "text-amber-600" : "text-red-600") : ""}
                  >
                    {doc.title}
                    {!urlValidation.isValid && canAutoFix && " (needs URL format fix)"}
                    {!urlValidation.isValid && !canAutoFix && " (invalid URL)"}
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
          <div className={`text-sm flex items-center mt-1 ${urlStatus.canAutoFix ? 'text-amber-600' : 'text-red-600'}`}>
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>
              {urlStatus.message} 
              {urlStatus.canAutoFix && ' (Will be auto-fixed during extraction)'}
            </span>
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
          
          {!isCheckingConnection && !isProxyAvailable && (
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Proxy service unavailable</span>
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
            {!canExtract && !isProxyAvailable && (
              <TooltipContent>
                <p>Proxy service is unavailable.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
