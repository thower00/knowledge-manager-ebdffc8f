
import { ProcessedDocument } from "@/types/document";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { extractPdfTextSimplified } from "@/components/admin/document-extraction/utils/simplifiedPdfExtraction";
import { cleanAndNormalizeText } from "@/components/admin/document-extraction/services/textCleaningService";

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
 * Extract content from a document file using simplified PDF.js approach
 */
export async function extractFileContent(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Starting simplified PDF extraction for: ${document.title}`);
    
    if (!document.url) {
      throw new Error("Document URL is required for content extraction");
    }

    // For now, assume all documents are PDFs
    return await extractPdfContentSimple(document);
    
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
 * Extract content from PDF document using simplified PDF.js approach
 */
async function extractPdfContentSimple(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Extracting PDF content with simplified approach from: ${document.title}`);
    
    // Fetch the document via proxy service
    console.log(`Fetching PDF through proxy service: ${document.url}`);
    const arrayBuffer = await fetchDocumentViaProxy(document.url!, document.title);
    
    // Extract text using simplified PDF.js
    const result = await extractPdfTextSimplified(arrayBuffer);
    
    if (!result.success) {
      throw new Error(result.error || "PDF extraction failed");
    }
    
    // Clean the extracted text
    const cleanedText = cleanAndNormalizeText(result.text);
    
    return {
      success: true,
      text: cleanedText,
      metadata: {
        fileType: 'pdf',
        pages: result.totalPages,
        size: arrayBuffer.byteLength
      }
    };
  } catch (error) {
    console.error("Simplified PDF extraction error:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "PDF extraction failed"
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
  
  return extractionResult.text;
}
