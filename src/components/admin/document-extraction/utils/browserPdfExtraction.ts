

import * as pdfjsLib from 'pdfjs-dist';

export interface BrowserPdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple browser-based PDF text extraction inspired by PyPDF2 approach
 * This mirrors the straightforward pattern: read PDF -> extract text page by page -> concatenate
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
    
    // Properly disable worker by setting empty string - PDF.js will use main thread
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    console.log('Using main thread for PDF processing (no worker)');
    
    if (onProgress) onProgress(20);
    
    console.log('Loading PDF document...');
    
    // Minimal PDF.js configuration - keep it simple like PyPDF2
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Reduce console noise
      useWorkerFetch: false,
      isEvalSupported: false
    });
    
    const pdf = await loadingTask.promise;
    console.log(`📄 PDF loaded! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(30);
    
    let allText = '';
    const totalPages = pdf.numPages;
    
    // Extract text page by page (like your PyPDF2 approach)
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`📑 Processing page ${pageNum}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text from this page
        const pageText = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText) {
          console.log(`📑 Page ${pageNum} contains ${pageText.length} characters`);
          allText += pageText + '\n'; // Add newline between pages
        }
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / totalPages) * 60);
          onProgress(progress);
        }
        
      } catch (pageError) {
        console.warn(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages (graceful degradation)
      }
    }
    
    if (onProgress) onProgress(90);
    
    // Clean up the text (basic normalization)
    allText = allText
      .replace(/\s+/g, ' ') // Normalize whitespace
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
