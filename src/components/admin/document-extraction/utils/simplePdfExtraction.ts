
import * as pdfjsLib from 'pdfjs-dist';

export interface SimplePdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple, reliable PDF text extraction with proper worker configuration
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
    
    // Try multiple worker approaches in order of preference
    let workerConfigured = false;
    
    // Approach 1: Try local worker file first
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('Attempting to use local worker file');
      workerConfigured = true;
    } catch (localError) {
      console.warn('Local worker failed:', localError);
    }
    
    // Approach 2: Try jsDelivr CDN if local failed
    if (!workerConfigured) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.js';
        console.log('Attempting to use jsDelivr CDN worker');
        workerConfigured = true;
      } catch (jsDelivrError) {
        console.warn('jsDelivr CDN worker failed:', jsDelivrError);
      }
    }
    
    // Approach 3: Try unpkg CDN if jsDelivr failed
    if (!workerConfigured) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.2.133/build/pdf.worker.min.js';
        console.log('Attempting to use unpkg CDN worker');
        workerConfigured = true;
      } catch (unpkgError) {
        console.warn('unpkg CDN worker failed:', unpkgError);
      }
    }
    
    // Approach 4: Disable worker entirely and use main thread
    if (!workerConfigured) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
        console.log('All worker sources failed, disabling worker (will use main thread)');
        workerConfigured = true;
      } catch (mainThreadError) {
        console.error('Failed to disable worker:', mainThreadError);
        throw new Error('Could not configure PDF.js worker');
      }
    }
    
    console.log('Loading PDF document...');
    
    // Create PDF document with robust configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0, // Reduce console noise
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/cmaps/',
      cMapPacked: true
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
