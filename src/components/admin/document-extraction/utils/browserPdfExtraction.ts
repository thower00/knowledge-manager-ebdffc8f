
import * as pdfjsLib from 'pdfjs-dist';

export interface BrowserPdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple, reliable browser-based PDF text extraction
 */
export async function extractTextFromPdfBrowser(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<BrowserPdfResult> {
  console.log('Starting browser PDF extraction, buffer size:', arrayBuffer.byteLength);
  
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      text: '',
      error: 'Invalid or empty PDF data'
    };
  }

  try {
    if (onProgress) onProgress(10);
    
    // Simple worker setup - use local worker if available, otherwise disable worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('PDF worker configured');
    }
    
    if (onProgress) onProgress(20);
    
    console.log('Loading PDF document...');
    
    // Simple PDF loading configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(40);
    
    let allText = '';
    const totalPages = pdf.numPages;
    
    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`Processing page ${pageNum}...`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text from page
      const pageText = textContent.items
        .map((item: any) => {
          // Safely extract text, handling different item types
          if (item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .filter(text => text.length > 0) // Remove empty strings
        .join(' ');
      
      if (pageText.trim()) {
        allText += pageText + '\n\n';
        console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
      }
      
      // Update progress
      if (onProgress) {
        const progress = 40 + Math.round((pageNum / totalPages) * 50);
        onProgress(progress);
      }
    }
    
    if (onProgress) onProgress(90);
    
    // Clean up text
    allText = allText.trim();
    
    if (!allText) {
      return {
        success: false,
        text: '',
        error: 'No text found in PDF - document may be image-based or empty',
        pages: totalPages
      };
    }
    
    if (onProgress) onProgress(100);
    
    console.log(`Successfully extracted ${allText.length} characters from ${totalPages} pages`);
    
    return {
      success: true,
      text: allText,
      pages: totalPages
    };
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    let errorMessage = 'PDF extraction failed';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more specific error messages
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'Invalid PDF file - the file may be corrupted';
      } else if (error.message.includes('worker')) {
        errorMessage = 'PDF worker error - try refreshing the page';
      }
    }
    
    return {
      success: false,
      text: '',
      error: errorMessage
    };
  }
}
