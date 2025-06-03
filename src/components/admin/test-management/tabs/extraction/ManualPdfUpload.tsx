
import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, Loader2, CheckCircle, XCircle } from "lucide-react";
import { extractTextFromPdfBrowser } from "@/components/admin/document-extraction/utils/browserPdfExtraction";

interface ManualPdfUploadProps {
  onExtract?: (extractedText: string, fileName: string) => void;
}

export function ManualPdfUpload({ onExtract }: ManualPdfUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setExtractedText("");
    setError(null);
    setExtractionProgress(0);
  }, [toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Extract text from selected PDF using the simple browser approach
  const handleExtractText = useCallback(async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setExtractedText("");
    setError(null);
    setExtractionProgress(0);

    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Extract text using our simplified browser-based extraction
      const result = await extractTextFromPdfBrowser(arrayBuffer, (progress) => {
        setExtractionProgress(progress);
      });

      if (!result.success) {
        throw new Error(result.error || 'PDF extraction failed');
      }

      setExtractedText(result.text);
      setExtractionProgress(100);
      
      // Call the callback if provided
      if (onExtract) {
        onExtract(result.text, selectedFile.name);
      }

      toast({
        title: "Extraction completed",
        description: `Successfully extracted text from "${selectedFile.name}" (${result.pages} pages)`,
      });

    } catch (error) {
      console.error('Manual PDF extraction error:', error);
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

  // Reset the component
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setExtractedText("");
    setError(null);
    setExtractionProgress(0);
    setIsExtracting(false);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manual PDF Upload & Extraction
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('pdf-file-input')?.click()}
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
            
            {/* Hidden file input */}
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleExtractText}
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

          {/* Progress Bar */}
          {isExtracting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting text...</span>
                <span>{extractionProgress}%</span>
              </div>
              <Progress value={extractionProgress} className="h-2" />
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
                Successfully extracted {extractedText.length} characters from the PDF
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Text Preview */}
      {extractedText && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Text Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {extractedText.substring(0, 1000)}
                {extractedText.length > 1000 && '...'}
              </pre>
            </div>
            {extractedText.length > 1000 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 1000 characters of {extractedText.length} total characters
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
