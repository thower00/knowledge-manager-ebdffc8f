
import * as pdfjsLib from 'pdfjs-dist';

export interface SimplePdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple, reliable PDF text extraction without complex worker setup
 */
export async function extractTextFromPdfSimple(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<SimplePdfResult> {
  console.log('Starting simple PDF extraction, buffer size:', arrayBuffer.byteLength);
  
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      text: '',
      error: 'Invalid or empty PDF data'
    };
  }

  try {
    if (onProgress) onProgress(10);
    
    // Use the simplest possible PDF.js configuration - no worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    console.log('Loading PDF document without worker...');
    
    // Create PDF document with minimal options
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(30);
    
    let extractedText = '';
    const maxPages = Math.min(pdf.numPages, 5); // Limit to 5 pages for reliability
    
    // Extract text page by page
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`Extracting page ${pageNum}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items
        const pageText = textContent.items
          .map((item: any) => {
            if (item && typeof item.str === 'string') {
              return item.str;
            }
            return '';
          })
          .join(' ')
          .trim();
        
        if (pageText) {
          extractedText += pageText + '\n\n';
          console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
        }
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / maxPages) * 60);
          onProgress(progress);
        }
        
      } catch (pageError) {
        console.warn(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (onProgress) onProgress(100);
    
    // Clean up the text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    if (!extractedText) {
      return {
        success: false,
        text: '',
        error: 'No text could be extracted from the PDF',
        pages: pdf.numPages
      };
    }
    
    console.log(`Successfully extracted ${extractedText.length} characters from ${maxPages} pages`);
    
    return {
      success: true,
      text: extractedText,
      pages: pdf.numPages
    };
    
  } catch (error) {
    console.error('Simple PDF extraction error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}
