
import * as pdfjsLib from 'pdfjs-dist';

export interface SimplePdfResult {
  success: boolean;
  text: string;
  error?: string;
  totalPages?: number;
}

/**
 * Simplified PDF extraction using PDF.js with correct version matching
 * Ensures worker version matches the installed PDF.js version (5.2.133)
 */
export async function extractPdfTextSimplified(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<SimplePdfResult> {
  try {
    console.log('Starting simplified PDF extraction, buffer size:', arrayBuffer.byteLength);
    
    if (onProgress) onProgress(10);
    
    // Configure PDF.js with the correct worker version that matches our installed version (5.2.133)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Use the exact version that matches our installed pdfjs-dist package
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js`;
    }
    
    // Basic PDF validation
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.length < 4 || 
        uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || 
        uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      throw new Error('Invalid PDF file format');
    }
    
    if (onProgress) onProgress(20);
    
    // Load PDF document with minimal configuration to avoid compatibility issues
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded: ${pdf.numPages} pages`);
    
    if (onProgress) onProgress(40);
    
    // Extract text from all pages
    let fullText = '';
    const totalPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        if (pageText) {
          fullText += pageText + '\n';
        }
        
        // Clean up page resources
        page.cleanup();
        
        // Update progress
        const progress = 40 + Math.floor((pageNum / totalPages) * 50);
        if (onProgress) onProgress(progress);
        
      } catch (pageError) {
        console.warn(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean up PDF resources
    pdf.destroy();
    
    if (onProgress) onProgress(100);
    
    // Clean the text (basic normalization)
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    if (!fullText) {
      return {
        success: false,
        text: '',
        error: 'No text could be extracted from the PDF'
      };
    }
    
    console.log(`Successfully extracted ${fullText.length} characters from ${totalPages} pages`);
    
    return {
      success: true,
      text: fullText,
      totalPages: totalPages
    };
    
  } catch (error) {
    console.error('Simplified PDF extraction error:', error);
    
    // Ensure progress is set to 100 even on error
    if (onProgress) onProgress(100);
    
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}
