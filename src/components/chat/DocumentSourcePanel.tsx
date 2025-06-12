
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      let viewUrl = url;
      
      // For Google Drive documents, use preview format for public access
      if (isGoogleDrive) {
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                           url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          // Use preview instead of view for better public access
          viewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }

      // Try to open in new tab
      const opened = window.open(viewUrl, '_blank', 'noopener,noreferrer');
      
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        // Popup was blocked, show fallback options
        toast({
          variant: "destructive",
          title: "Popup blocked",
          description: "Please allow popups or use the copy link button below.",
        });
        return;
      }
      
      toast({
        title: "Opening document",
        description: `Opening "${title}" in a new tab.`,
      });
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        variant: "destructive",
        title: "Error opening document",
        description: "Failed to open the document. Please try the copy link option.",
      });
    }
  };

  const handleCopyLink = async (url: string, title: string, isGoogleDrive: boolean) => {
    try {
      let finalUrl = url;
      
      // For Google Drive, use preview format
      if (isGoogleDrive) {
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                           url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          finalUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }

      await navigator.clipboard.writeText(finalUrl);
      toast({
        title: "Link copied",
        description: `Link to "${title}" copied to clipboard.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy link",
        description: "Please copy the link manually from the browser.",
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
      let finalDownloadUrl = downloadUrl;
      
      // For Google Drive documents, convert to direct download URL
      if (isGoogleDrive) {
        const fileIdMatch = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                           downloadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           downloadUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          finalDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

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
            
            {(source.viewUrl || source.downloadUrl) && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {source.viewUrl && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(source.viewUrl!, source.title, source.isGoogleDrive || false)}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(source.viewUrl!, source.title, source.isGoogleDrive || false)}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                  </>
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
