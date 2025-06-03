


import * as pdfjsLib from 'pdfjs-dist';

export interface BrowserPdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple browser-based PDF text extraction with reliable worker configuration
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
    
    // Simple, reliable worker configuration
    // Try local worker first, then CDN, then disable worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        // Try local worker file
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        console.log('Using local PDF worker');
      } catch {
        try {
          // Fallback to CDN
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.js';
          console.log('Using CDN PDF worker');
        } catch {
          // Final fallback: disable worker completely
          pdfjsLib.GlobalWorkerOptions.workerSrc = false;
          console.log('PDF worker disabled, using main thread');
        }
      }
    }
    
    if (onProgress) onProgress(20);
    
    console.log('Loading PDF document...');
    
    // Load PDF with simple configuration and timeout
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0,
      useWorkerFetch: false,
      isEvalSupported: false
    });
    
    // Add a timeout to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('PDF loading timed out after 30 seconds'));
      }, 30000);
    });
    
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
    console.log(`📄 PDF loaded! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(30);
    
    let allText = '';
    const totalPages = pdf.numPages;
    
    // Extract text page by page with timeout for each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`📑 Processing page ${pageNum}...`);
        
        const pagePromise = pdf.getPage(pageNum);
        const pageTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Page ${pageNum} loading timed out`));
          }, 10000);
        });
        
        const page = await Promise.race([pagePromise, pageTimeoutPromise]);
        
        const textContentPromise = page.getTextContent();
        const textTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Page ${pageNum} text extraction timed out`));
          }, 10000);
        });
        
        const textContent = await Promise.race([textContentPromise, textTimeoutPromise]);
        
        // Extract text from this page
        const pageText = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText) {
          console.log(`📑 Page ${pageNum} contains ${pageText.length} characters`);
          allText += pageText + '\n';
        }
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / totalPages) * 60);
          onProgress(progress);
        }
        
      } catch (pageError) {
        console.warn(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (onProgress) onProgress(90);
    
    // Clean up the text
    allText = allText
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!allText) {
      return {
        success: false,
        text: '',
        error: 'No text could be extracted from the PDF',
        pages: totalPages
      };
    }
    
    if (onProgress) onProgress(100);
    
    console.log(`📝 Total extracted text: ${allText.length} characters`);
    console.log(`✅ Successfully processed ${totalPages} pages`);
    
    return {
      success: true,
      text: allText,
      pages: totalPages
    };
    
  } catch (error) {
    console.error('Browser PDF extraction error:', error);
    
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}
