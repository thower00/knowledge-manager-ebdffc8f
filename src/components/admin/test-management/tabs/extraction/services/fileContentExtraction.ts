
import { ProcessedDocument } from "@/types/document";

export interface FileExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  metadata?: {
    fileType: string;
    size?: number;
    pages?: number;
  };
}

/**
 * Extract content from a document file (PDF or Word) via Google Drive URL
 */
export async function extractFileContent(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Starting file content extraction for: ${document.title}`);
    
    if (!document.url) {
      throw new Error("Document URL is required for content extraction");
    }

    // Determine file type from MIME type or URL
    const fileType = determineFileType(document);
    
    switch (fileType) {
      case 'pdf':
        return await extractPdfContent(document);
      case 'word':
        return await extractWordContent(document);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error("Error in file content extraction:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown extraction error"
    };
  }
}

/**
 * Determine file type from document metadata
 */
function determineFileType(document: ProcessedDocument): string {
  const mimeType = document.mime_type?.toLowerCase() || "";
  const title = document.title?.toLowerCase() || "";
  
  // Check MIME type first
  if (mimeType.includes('pdf')) {
    return 'pdf';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'word';
  }
  
  // Check file extension
  if (title.endsWith('.pdf')) {
    return 'pdf';
  }
  if (title.endsWith('.docx') || title.endsWith('.doc')) {
    return 'word';
  }
  
  // Default to PDF if uncertain
  return 'pdf';
}

/**
 * Convert Google Drive URL to direct download URL
 */
function convertToDirectDownloadUrl(googleDriveUrl: string): string {
  // Extract file ID from various Google Drive URL formats
  let fileId: string | null = null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const viewMatch = googleDriveUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (viewMatch) {
    fileId = viewMatch[1];
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = googleDriveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (openMatch) {
    fileId = openMatch[1];
  }
  
  if (!fileId) {
    throw new Error("Could not extract file ID from Google Drive URL");
  }
  
  // Return direct download URL
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Safe base64 conversion for large files
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
}

/**
 * Extract content from PDF document
 */
async function extractPdfContent(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Extracting PDF content from: ${document.title}`);
    
    // Convert Google Drive URL to direct download URL
    const directDownloadUrl = convertToDirectDownloadUrl(document.url!);
    console.log(`Using direct download URL: ${directDownloadUrl}`);
    
    // Fetch the PDF file from the direct download URL
    const fileResponse = await fetch(directDownloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch PDF file: ${fileResponse.statusText}`);
    }
    
    const fileBlob = await fileResponse.blob();
    const arrayBuffer = await fileBlob.arrayBuffer();
    
    // Use safe base64 conversion to avoid stack overflow
    const base64Data = arrayBufferToBase64(arrayBuffer);
    
    // Call our PDF processing service
    const response = await fetch(`https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0`
      },
      body: JSON.stringify({
        pdfBase64: base64Data,
        options: {
          maxPages: 0, // Extract all pages
          streamMode: false,
          timeout: 30
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`PDF processing failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "PDF processing failed");
    }
    
    return {
      success: true,
      text: result.text || "",
      metadata: {
        fileType: 'pdf',
        pages: result.totalPages,
        size: fileBlob.size
      }
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "PDF extraction failed"
    };
  }
}

/**
 * Extract content from Word document
 */
async function extractWordContent(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Extracting Word content from: ${document.title}`);
    
    // For now, return a placeholder for Word document extraction
    // This would need to be implemented with a proper Word processing service
    return {
      success: true,
      text: `Word document extraction is not yet implemented for: ${document.title}\n\nThis is where the extracted text from the Word document would appear.`,
      metadata: {
        fileType: 'word'
      }
    };
  } catch (error) {
    console.error("Word extraction error:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Word extraction failed"
    };
  }
}

/**
 * Convert extracted content to clean text format
 */
export function convertToText(extractionResult: FileExtractionResult): string {
  if (!extractionResult.success || !extractionResult.text) {
    return extractionResult.error || "No text could be extracted";
  }
  
  // Clean up the extracted text
  let cleanText = extractionResult.text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\s+|\s+$/g, '') // Trim
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters except newlines/tabs
    .replace(/\s+/g, ' ') // Final whitespace cleanup
    .trim();
  
  // Add metadata header if available
  if (extractionResult.metadata) {
    const metadata = extractionResult.metadata;
    let header = `Document Type: ${metadata.fileType.toUpperCase()}\n`;
    if (metadata.pages) {
      header += `Pages: ${metadata.pages}\n`;
    }
    if (metadata.size) {
      header += `Size: ${(metadata.size / 1024).toFixed(1)} KB\n`;
    }
    header += '\n--- Extracted Text ---\n\n';
    
    cleanText = header + cleanText;
  }
  
  return cleanText;
}
