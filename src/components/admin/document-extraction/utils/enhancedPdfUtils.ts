
import { extractTextFromPdfUrl } from './clientPdfExtraction';

/**
 * Enhanced PDF text extraction with simplified timeout handling
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Starting enhanced PDF extraction for: ${documentTitle}`);
    
    // Create overall timeout - 45 seconds total
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error('Overall extraction timeout after 45 seconds');
        reject(new Error('PDF extraction timed out after 45 seconds'));
      }, 45000);
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
