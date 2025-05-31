
import { extractTextFromPdfUrl } from './clientPdfExtraction';

/**
 * Enhanced PDF text extraction using client-side PDF.js with timeout handling
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Starting client-side PDF extraction for: ${documentTitle}`);
    
    // Create a timeout promise that rejects after 60 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('PDF extraction timed out after 60 seconds'));
      }, 60000);
    });
    
    // Race between extraction and timeout
    const result = await Promise.race([
      extractTextFromPdfUrl(documentUrl, onProgress),
      timeoutPromise
    ]);
    
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
