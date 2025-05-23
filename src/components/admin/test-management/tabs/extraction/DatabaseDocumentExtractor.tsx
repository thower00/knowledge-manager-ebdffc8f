
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "@/components/content/utils/documentDbService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface DatabaseDocumentExtractorProps {
  onExtract: (extractionText: string) => void;
  isExtracting: boolean;
  proxyConnected: boolean | null;
}

export function DatabaseDocumentExtractor({ 
  onExtract, 
  isExtracting,
  proxyConnected 
}: DatabaseDocumentExtractorProps) {
  // Document selection state
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extractAllDocuments, setExtractAllDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDocIndex, setCurrentDocIndex] = useState<number>(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const { toast } = useToast();
  
  // Extract text from the selected document(s)
  const handleExtractText = useCallback(async () => {
    // Reset progress indicators
    setCurrentDocIndex(0);
    setExtractionProgress(0);
    
    // Validate selection
    if (!extractAllDocuments && (!selectedDocumentIds || selectedDocumentIds.length === 0)) {
      setError("Please select at least one document or enable 'Extract All'");
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document or enable 'Extract All'",
        variant: "destructive"
      });
      return;
    }
    
    // Determine which documents to process
    const docsToProcess = extractAllDocuments 
      ? documents 
      : documents.filter(doc => selectedDocumentIds.includes(doc.id));
    
    if (docsToProcess.length === 0) {
      setError("No documents available to extract");
      return;
    }
    
    // Mock extraction process - replace with actual extraction logic
    let combinedText = "";
    
    try {
      // Process each document
      for (let i = 0; i < docsToProcess.length; i++) {
        const doc = docsToProcess[i];
        setCurrentDocIndex(i);
        
        // Calculate progress based on documents processed
        const progress = Math.round(((i + 1) / docsToProcess.length) * 100);
        setExtractionProgress(progress);
        
        // Simulate extraction delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Add document text to combined text
        combinedText += `--- Document: ${doc.title} ---\n\n`;
        combinedText += `Sample extracted text from ${doc.title}.\n\n`;
      }
      
      setExtractionProgress(100);
      
      // Send extracted text to parent component
      onExtract(combinedText);
      
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted text from ${docsToProcess.length} documents`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during extraction");
      toast({
        title: "Extraction Failed",
        description: err instanceof Error ? err.message : "An error occurred during extraction",
        variant: "destructive"
      });
    }
  }, [documents, selectedDocumentIds, extractAllDocuments, toast, onExtract]);
  
  // Fetch documents from the database
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedDocs = await fetchProcessedDocuments();
      // Filter to only include completed documents
      const completedDocs = fetchedDocs.filter(doc => doc.status === "completed");
      setDocuments(completedDocs);
      // Clear selection when refreshing
      setSelectedDocumentIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
      toast({
        title: "Error Loading Documents",
        description: err instanceof Error ? err.message : "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Toggle selection for a document
  const toggleDocumentSelection = useCallback((id: string) => {
    setSelectedDocumentIds(prev => {
      const isAlreadySelected = prev.includes(id);
      return isAlreadySelected
        ? prev.filter(docId => docId !== id)
        : [...prev, id];
    });
  }, []);
  
  // Toggle selection for all documents
  const toggleSelectAll = useCallback(() => {
    if (selectedDocumentIds.length === documents.length) {
      // Deselect all
      setSelectedDocumentIds([]);
    } else {
      // Select all
      setSelectedDocumentIds(documents.map(doc => doc.id));
    }
  }, [selectedDocumentIds.length, documents]);
  
  // Effect to load documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Handle "Extract All" switch changes
  const handleExtractAllChange = (checked: boolean) => {
    setExtractAllDocuments(checked);
    // Clear individual selections if "Extract All" is enabled
    if (checked) {
      setSelectedDocumentIds([]);
    }
  };
  
  // Determine if any documents are selected
  const hasSelection = selectedDocumentIds.length > 0 || extractAllDocuments;
  const allSelected = documents.length > 0 && selectedDocumentIds.length === documents.length;
  
  // Component UI
  return (
    <Card className="mb-6">
      {/* Card Header */}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Extract Database Documents</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDocuments}
            disabled={isLoading || isExtracting}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {/* Card Content */}
      <CardContent>
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Connection Status */}
        <div className="flex items-center mb-4 gap-2">
          <div 
            className={`h-2 w-2 rounded-full ${
              proxyConnected === true ? "bg-green-500" : 
              proxyConnected === false ? "bg-red-500" : 
              "bg-amber-500"
            }`} 
          />
          <span className="text-sm text-muted-foreground">
            {proxyConnected === true ? "PDF Proxy Connected" : 
             proxyConnected === false ? "PDF Proxy Unavailable" : 
             "Checking Proxy Connection..."}
          </span>
        </div>
        
        {/* Document Table */}
        <div className="border rounded-md mb-4">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No documents available</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={allSelected} 
                        onCheckedChange={() => toggleSelectAll()}
                        disabled={extractAllDocuments || isExtracting}
                      />
                    </TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow 
                      key={doc.id} 
                      className={selectedDocumentIds.includes(doc.id) ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedDocumentIds.includes(doc.id)} 
                          onCheckedChange={() => toggleDocumentSelection(doc.id)}
                          disabled={extractAllDocuments || isExtracting}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{doc.title}</div>
                      </TableCell>
                      <TableCell>{doc.mime_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {doc.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        
        {/* Extract All Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="extract-all"
              checked={extractAllDocuments}
              onCheckedChange={handleExtractAllChange}
              disabled={isExtracting}
            />
            <Label htmlFor="extract-all">
              Extract All Documents ({documents.length})
            </Label>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {extractAllDocuments 
              ? `All ${documents.length} documents will be processed` 
              : `${selectedDocumentIds.length} of ${documents.length} documents selected`
            }
          </div>
        </div>
        
        {/* Extraction Progress */}
        {isExtracting && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Extracting document {currentDocIndex + 1} of {extractAllDocuments ? documents.length : selectedDocumentIds.length}</span>
              <span className="text-sm">{extractionProgress}%</span>
            </div>
            <Progress value={extractionProgress} className="h-2" />
          </div>
        )}
        
        {/* Extract Button */}
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleExtractText}
                    disabled={isLoading || isExtracting || (!extractAllDocuments && selectedDocumentIds.length === 0)}
                    className="w-40"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Extract Text
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasSelection && (
                <TooltipContent>
                  <p>Select at least one document or enable Extract All</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
