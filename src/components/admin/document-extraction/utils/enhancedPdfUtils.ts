
import { fetchDocumentViaProxy } from '../services/documentFetchService';
import { extractTextFromPdfBuffer } from './clientPdfExtraction';

/**
 * Enhanced PDF text extraction using client-side PDF.js with proxy support
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Starting enhanced PDF extraction for: ${documentTitle}`);
    
    // Set initial progress
    if (onProgress) onProgress(5);
    
    // Fetch document via proxy service
    console.log('Fetching document via proxy...');
    const arrayBuffer = await fetchDocumentViaProxy(documentUrl, documentTitle);
    
    if (onProgress) onProgress(30);
    
    // Extract text using client-side PDF.js
    console.log('Extracting text with PDF.js...');
    const result = await extractTextFromPdfBuffer(arrayBuffer, (pdfProgress) => {
      // Map PDF extraction progress to our 30-95% range
      const mappedProgress = 30 + Math.floor((pdfProgress / 100) * 65);
      if (onProgress) onProgress(mappedProgress);
    });
    
    if (onProgress) onProgress(100);
    
    if (!result.success) {
      throw new Error(result.error || 'PDF extraction failed');
    }
    
    console.log(`Successfully extracted ${result.text.length} characters from ${result.totalPages} pages`);
    return result.text;
    
  } catch (error) {
    console.error('Enhanced PDF extraction error:', error);
    throw new Error(error instanceof Error ? error.message : 'PDF extraction failed');
  }
}
