
import { extractTextFromPdfUrl } from './clientPdfExtraction';

/**
 * Enhanced PDF text extraction with debugging and shorter timeouts
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`=== Enhanced PDF Extraction Start ===`);
    console.log(`Document: ${documentTitle}`);
    console.log(`URL: ${documentUrl}`);
    
    // Create overall timeout - shorter for debugging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error('=== Overall Extraction Timeout ===');
        console.error('Overall extraction timeout after 30 seconds');
        reject(new Error('PDF extraction timed out after 30 seconds'));
      }, 30000);
    });
    
    // Race between extraction and timeout
    const result = await Promise.race([
      extractTextFromPdfUrl(documentUrl, onProgress),
      timeoutPromise
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'PDF extraction failed');
    }
    
    console.log(`=== Enhanced PDF Extraction Success ===`);
    console.log(`Successfully extracted ${result.text.length} characters from ${result.totalPages} pages`);
    return result.text;
    
  } catch (error) {
    console.error('=== Enhanced PDF Extraction Error ===');
    console.error('Enhanced PDF extraction error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(error instanceof Error ? error.message : 'PDF extraction failed');
  }
}
