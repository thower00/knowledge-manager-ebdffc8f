
import { extractPdfTextSimplified } from './simplifiedPdfExtraction';
import { fetchDocumentViaProxy } from '../services/documentFetchService';

/**
 * Enhanced PDF text extraction - now using simplified approach for reliability
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Starting simplified PDF extraction for: ${documentTitle}`);
    console.log(`URL: ${documentUrl}`);
    
    if (onProgress) onProgress(5);
    
    // Fetch the document first
    const arrayBuffer = await fetchDocumentViaProxy(documentUrl, documentTitle);
    
    if (onProgress) onProgress(20);
    
    // Use the simplified extraction method
    const result = await extractPdfTextSimplified(arrayBuffer, (progress) => {
      // Map progress to 20-100% range
      const mappedProgress = 20 + Math.floor((progress / 100) * 80);
      if (onProgress) onProgress(mappedProgress);
    });
    
    if (!result.success) {
      throw new Error(result.error || 'PDF extraction failed');
    }
    
    console.log(`Successfully extracted ${result.text.length} characters from ${result.totalPages} pages`);
    return result.text;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(error instanceof Error ? error.message : 'PDF extraction failed');
  }
}
