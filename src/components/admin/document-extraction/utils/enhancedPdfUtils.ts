
import { extractTextFromPdfUrl } from './clientPdfExtraction';

/**
 * Enhanced PDF text extraction using client-side PDF.js
 */
export async function extractPdfText(
  documentUrl: string,
  documentTitle: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Starting client-side PDF extraction for: ${documentTitle}`);
    
    const result = await extractTextFromPdfUrl(documentUrl, onProgress);
    
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
