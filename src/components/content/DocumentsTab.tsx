
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DocumentList } from "./DocumentList";
import { DocumentSourceConfig } from "@/types/document";

export function DocumentsTab() {
  const [documentSource, setDocumentSource] = useState<string>("google-drive");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sourceConfig, setSourceConfig] = useState<DocumentSourceConfig | null>(null);
  const { toast } = useToast();

  // Make configuration fetching more robust
  useEffect(() => {
    const fetchSourceConfig = async () => {
      try {
        if (documentSource) {
          const { data, error } = await supabase
            .from("configurations")
            .select("value")
            .eq("key", `${documentSource.replace('-', '_')}_integration`)
            .maybeSingle();

          if (error) {
            console.error("Error fetching source config:", error);
            toast({
              variant: "destructive",
              title: "Configuration Error",
              description: `Could not load ${documentSource} configuration. Please set it up in Configuration Management.`,
            });
            setSourceConfig(null);
            return;
          }

          if (!data) {
            toast({
              variant: "destructive",
              title: "Missing Configuration",
              description: `No configuration found for ${documentSource}. Please set it up in Configuration Management.`,
            });
            setSourceConfig(null);
            return;
          }

          console.log("Retrieved source config:", data);
          setSourceConfig(data.value as DocumentSourceConfig);
        }
      } catch (err) {
        console.error("Error in fetchSourceConfig:", err);
        setSourceConfig(null);
      }
    };

    fetchSourceConfig();
  }, [documentSource, toast]);

  // Function to fetch documents from the selected source
  const fetchDocuments = async () => {
    if (!sourceConfig) {
      toast({
        variant: "destructive",
        title: "Configuration Missing",
        description: `Please configure ${documentSource} integration first in the Configuration Management page.`,
      });
      return;
    }

    setIsLoading(true);
    setDocuments([]);

    try {
      // For Google Drive, call the appropriate edge function
      if (documentSource === "google-drive") {
        console.log("Fetching Google Drive documents with config:", {
          client_email: sourceConfig.client_email ? "✓ Present" : "✗ Missing",
          private_key: sourceConfig.private_key ? "✓ Present" : "✗ Missing",
          folder_id: sourceConfig.folder_id || "Not specified",
        });
        
        const { data, error } = await supabase.functions.invoke("list-google-drive-files", {
          body: { 
            client_email: sourceConfig.client_email,
            private_key: sourceConfig.private_key,
            folder_id: sourceConfig.folder_id || "",
          },
        });

        if (error) {
          throw new Error(error.message || "Failed to fetch documents");
        }

        console.log("Google Drive API response:", data);
        
        if (data?.files) {
          setDocuments(data.files);
        } else {
          setDocuments([]);
        }
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      toast({
        variant: "destructive",
        title: "Error Fetching Documents",
        description: err.message || "Failed to load documents from source",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document selection
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Toggle select all documents
  const toggleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedDocuments(documents.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  // Upload selected documents
  const uploadDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to upload.",
      });
      return;
    }

    setIsUploading(true);

    try {
      // For Google Drive, call the appropriate edge function
      if (documentSource === "google-drive") {
        console.log("Processing selected documents:", selectedDocuments);
        
        const { data, error } = await supabase.functions.invoke("process-google-drive-documents", {
          body: { 
            client_email: sourceConfig?.client_email,
            private_key: sourceConfig?.private_key,
            documentIds: selectedDocuments,
          },
        });

        if (error) {
          throw new Error(error.message || "Failed to process documents");
        }

        toast({
          title: "Documents Processing Started",
          description: `Processing ${selectedDocuments.length} document(s). This may take some time.`,
        });

        // Reset selection
        setSelectedDocuments([]);
      }
    } catch (err: any) {
      console.error("Error processing documents:", err);
      toast({
        variant: "destructive",
        title: "Document Processing Failed",
        description: err.message || "Failed to process selected documents",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-64">
              <Select 
                value={documentSource} 
                onValueChange={setDocumentSource}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Document Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google-drive">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchDocuments} 
                disabled={isLoading || !sourceConfig}
              >
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Documents
              </Button>
              
              <Button 
                onClick={uploadDocuments} 
                disabled={isUploading || selectedDocuments.length === 0}
              >
                {isUploading ? "Processing..." : "Process Selected"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <DocumentList 
        documents={documents}
        selectedDocuments={selectedDocuments}
        isLoading={isLoading}
        toggleSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
      />
    </div>
  );
}

// Types for document files
export interface DocumentFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  webViewLink?: string;
}
