
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, FileText } from "lucide-react";

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
  if (!sources || sources.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No sources available for this response.</p>
      </div>
    );
  }

  const handleViewDocument = (url: string, title: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadDocument = (url: string, title: string) => {
    if (url) {
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              <div className="flex gap-2 mt-2">
                {source.viewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(source.viewUrl!, source.title)}
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
                    onClick={() => handleDownloadDocument(source.downloadUrl!, source.title)}
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
