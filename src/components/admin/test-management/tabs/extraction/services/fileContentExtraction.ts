
import { ProcessedDocument } from "@/types/document";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { extractTextFromPdfBuffer } from "@/components/admin/document-extraction/utils/clientPdfExtraction";
import { cleanAndNormalizeText, validateExtractedText, formatExtractedText } from "@/components/admin/document-extraction/services/textCleaningService";

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
 * Extract content from a document file using client-side PDF.js
 */
export async function extractFileContent(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Starting client-side PDF extraction for: ${document.title}`);
    
    if (!document.url) {
      throw new Error("Document URL is required for content extraction");
    }

    // Determine file type from MIME type or URL
    const fileType = determineFileType(document);
    
    switch (fileType) {
      case 'pdf':
        return await extractPdfContentWithPdfJs(document);
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
 * Extract content from PDF document using client-side PDF.js
 */
async function extractPdfContentWithPdfJs(document: ProcessedDocument): Promise<FileExtractionResult> {
  try {
    console.log(`Extracting PDF content with client-side PDF.js from: ${document.title}`);
    
    // Fetch the document via proxy service
    console.log(`Fetching PDF through proxy service: ${document.url}`);
    const arrayBuffer = await fetchDocumentViaProxy(document.url!, document.title);
    
    // Extract text using client-side PDF.js
    const result = await extractTextFromPdfBuffer(arrayBuffer);
    
    if (!result.success) {
      throw new Error(result.error || "PDF.js extraction failed");
    }
    
    // Validate and clean the extracted text
    let extractedText = result.text || "";
    const validation = validateExtractedText(extractedText);
    
    if (!validation.isValid) {
      console.warn(`Text validation failed: ${validation.message}`);
      extractedText = validation.message || "Could not extract readable text from this PDF.";
    } else {
      // Clean and format the properly extracted text
      extractedText = cleanAndNormalizeText(extractedText);
    }
    
    return {
      success: true,
      text: extractedText,
      metadata: {
        fileType: 'pdf',
        pages: result.totalPages,
        size: arrayBuffer.byteLength
      }
    };
  } catch (error) {
    console.error("PDF.js extraction error:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "PDF.js extraction failed"
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
  
  // Format the extracted text with metadata
  const formattedText = formatExtractedText(extractionResult.text, extractionResult.metadata);
  
  return formattedText;
}
