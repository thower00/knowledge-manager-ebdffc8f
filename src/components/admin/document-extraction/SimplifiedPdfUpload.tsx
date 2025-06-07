
import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, Loader2, CheckCircle, XCircle } from "lucide-react";
import { extractPdfTextSimplified, chunkText } from "./utils/simplifiedPdfExtraction";

interface SimplifiedPdfUploadProps {
  onExtract?: (extractedText: string, chunks: any[], fileName: string) => void;
}

export function SimplifiedPdfUpload({ onExtract }: SimplifiedPdfUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>("");
  const [chunks, setChunks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setExtractedText("");
    setChunks([]);
    setError(null);
    setProgress(0);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting simplified extraction for:', selectedFile.name);
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Extract text using simplified approach
      const result = await extractPdfTextSimplified(arrayBuffer, (progress) => {
        setProgress(progress);
      });

      if (!result.success) {
        throw new Error(result.error || 'PDF extraction failed');
      }

      // Create chunks (mirroring Python logic)
      const textChunks = chunkText(result.text);
      
      setExtractedText(result.text);
      setChunks(textChunks);
      
      // Call callback if provided
      if (onExtract) {
        onExtract(result.text, textChunks, selectedFile.name);
      }

      toast({
        title: "Extraction completed",
        description: `Successfully extracted text and created ${textChunks.length} chunks from "${selectedFile.name}"`,
      });

    } catch (error) {
      console.error('Simplified extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'PDF extraction failed';
      setError(errorMessage);
      toast({
        title: "Extraction failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [selectedFile, onExtract, toast]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setExtractedText("");
    setChunks([]);
    setError(null);
    setProgress(0);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const triggerFileSelect = useCallback(() => {
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    fileInput?.click();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Simplified PDF Extraction
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={triggerFileSelect}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <File className="h-6 w-6" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your PDF file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
              </div>
            )}
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
              id="pdf-upload"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleExtract}
              disabled={!selectedFile || isExtracting}
              className="flex-1"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <File className="h-4 w-4 mr-2" />
                  Extract Text
                </>
              )}
            </Button>
            
            {selectedFile && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>

          {/* Progress */}
          {isExtracting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting text...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {extractedText && !error && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully extracted {extractedText.length} characters and created {chunks.length} chunks
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Preview */}
      {extractedText && (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Text Preview (first 1000 characters)</h4>
              <div className="bg-muted p-4 rounded-md max-h-64 overflow-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {extractedText.substring(0, 1000)}
                  {extractedText.length > 1000 && '...'}
                </pre>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Chunks ({chunks.length} total)</h4>
              <div className="space-y-2 max-h-32 overflow-auto">
                {chunks.slice(0, 3).map((chunk, index) => (
                  <div key={chunk.id} className="bg-muted p-2 rounded text-sm">
                    <span className="font-medium">Chunk {index + 1}:</span> {chunk.text.substring(0, 100)}...
                  </div>
                ))}
                {chunks.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    And {chunks.length - 3} more chunks...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
