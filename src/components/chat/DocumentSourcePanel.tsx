
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DocumentReference {
  title: string;
  viewUrl: string;
  downloadUrl?: string;
  isGoogleDrive: boolean;
}

interface DocumentSourcePanelProps {
  sources: Array<{
    title: string;
    content: string;
    viewUrl?: string;
    downloadUrl?: string;
    isGoogleDrive?: boolean;
  }>;
}

export const DocumentSourcePanel: React.FC<DocumentSourcePanelProps> = ({ sources }) => {
  const { toast } = useToast();

  if (!sources || sources.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No sources available for this response.</p>
      </div>
    );
  }

  const handleViewDocument = (url: string, title: string, isGoogleDrive: boolean) => {
    if (!url) {
      toast({
        variant: "destructive",
        title: "Cannot view document",
        description: "Document URL is not available.",
      });
      return;
    }

    try {
      console.log('Original URL for viewing:', url);
      console.log('Is Google Drive:', isGoogleDrive);
      
      let viewUrl = url;
      
      // For Google Drive documents, ensure proper view URL format
      if (isGoogleDrive) {
        // Extract file ID from various formats
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                           url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
          console.log('Converted to Google Drive view URL:', viewUrl);
        } else {
          console.warn('Could not extract file ID from Google Drive URL:', url);
        }
      }

      console.log('Final view URL:', viewUrl);
      
      // Use direct navigation instead of window.open to avoid popup blockers
      window.location.href = viewUrl;
      
      toast({
        title: "Opening document",
        description: `Opening "${title}" in current tab.`,
      });
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        variant: "destructive",
        title: "Error opening document",
        description: "Failed to open the document. Please try again.",
      });
    }
  };

  const handleDownloadDocument = (downloadUrl: string, title: string, isGoogleDrive: boolean) => {
    if (!downloadUrl) {
      toast({
        variant: "destructive",
        title: "Cannot download document",
        description: "Download URL is not available.",
      });
      return;
    }

    try {
      console.log('Original download URL:', downloadUrl);
      console.log('Is Google Drive:', isGoogleDrive);
      
      let finalDownloadUrl = downloadUrl;
      
      // For Google Drive documents, convert to direct download URL
      if (isGoogleDrive) {
        const fileIdMatch = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                           downloadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           downloadUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          finalDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          console.log('Converted to Google Drive download URL:', finalDownloadUrl);
        } else {
          console.warn('Could not extract file ID from Google Drive URL:', downloadUrl);
        }
      }

      console.log('Final download URL:', finalDownloadUrl);

      // Use direct navigation for download
      window.location.href = finalDownloadUrl;
      
      toast({
        title: "Download started",
        description: `Downloading "${title}".`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Error downloading document",
        description: "Failed to download the document. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-4 p-1">
      {sources.map((source, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <CardTitle className="text-sm font-medium truncate">{source.title}</CardTitle>
              </div>
              {source.isGoogleDrive && (
                <Badge variant="outline" className="text-xs">
                  Google Drive
                </Badge>
              )}
            </div>
            
            {/* Debug info for development */}
            <div className="text-xs text-muted-foreground space-y-1">
              {source.viewUrl && (
                <div>View URL: {source.viewUrl}</div>
              )}
              {source.downloadUrl && (
                <div>Download URL: {source.downloadUrl}</div>
              )}
            </div>
            
            {(source.viewUrl || source.downloadUrl) && (
              <div className="flex gap-2 mt-2">
                {source.viewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(source.viewUrl!, source.title, source.isGoogleDrive || false)}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
                {source.downloadUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(source.downloadUrl!, source.title, source.isGoogleDrive || false)}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="text-xs py-2 bg-muted/50">
            <p className="line-clamp-5">{source.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
