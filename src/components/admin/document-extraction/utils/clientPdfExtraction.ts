import * as pdfjsLib from 'pdfjs-dist';
import { initializePdfWorker } from './pdfWorkerInit';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  totalPages?: number;
}

/**
 * Extract text from PDF buffer using PDF.js with robust error handling
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  progressCallback?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Starting PDF extraction with buffer size:', arrayBuffer.byteLength);
    
    // Initialize progress
    if (progressCallback) progressCallback(10);
    
    // Initialize the PDF worker
    console.log('Initializing PDF worker...');
    await initializePdfWorker();
    if (progressCallback) progressCallback(20);
    
    // Validate PDF data
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.length < 4 || 
        uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || 
        uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      throw new Error('Invalid PDF file format');
    }
    
    console.log('Creating PDF document...');
    if (progressCallback) progressCallback(30);
    
    // Load the PDF document with timeout
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      disableFontFace: true,
      useSystemFonts: true,
    });
    
    // Add timeout for document loading
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout')), 30000);
      })
    ]);
    
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    if (progressCallback) progressCallback(40);
    
    let fullText = '';
    const totalPages = pdf.numPages;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Join text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
        }
        
        // Clean up page resources
        page.cleanup();
        
        // Update progress
        const progress = 40 + Math.floor((pageNum / totalPages) * 55);
        if (progressCallback) progressCallback(progress);
        
      } catch (pageError) {
        console.warn(`Error processing page ${pageNum}:`, pageError);
        fullText += `--- Page ${pageNum} - Error extracting text ---\n\n`;
      }
    }
    
    // Clean up PDF resources
    pdf.destroy();
    
    if (progressCallback) progressCallback(100);
    
    if (!fullText.trim()) {
      return {
        success: false,
        text: '',
        error: 'No text could be extracted from the PDF. It may be a scanned document or image-based PDF.'
      };
    }
    
    return {
      success: true,
      text: fullText.trim(),
      totalPages: totalPages
    };
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    
    let errorMessage = 'PDF extraction failed';
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The file is not a valid PDF document';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'PDF processing timed out - the file may be too large or complex';
      } else if (error.message.includes('worker')) {
        errorMessage = 'PDF worker initialization failed - please check your internet connection';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      text: '',
      error: errorMessage
    };
  }
}
