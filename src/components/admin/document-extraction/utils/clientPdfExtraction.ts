
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeText, validateExtractedText } from '../services/textCleaningService';

// Set up PDF.js worker with better fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
} catch (error) {
  console.warn('Local worker failed, using CDN:', error);
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  totalPages: number;
  error?: string;
}

/**
 * Extract text from PDF using client-side PDF.js - robust approach
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  console.log('Starting PDF extraction with buffer size:', arrayBuffer.byteLength);
  
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: 'Invalid or empty PDF data'
    };
  }

  // Validate that this looks like PDF data
  const uint8Array = new Uint8Array(arrayBuffer);
  const header = String.fromCharCode(...uint8Array.slice(0, 4));
  if (header !== '%PDF') {
    console.error('Invalid PDF header:', header);
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: 'File does not appear to be a valid PDF'
    };
  }

  try {
    if (onProgress) onProgress(10);
    
    console.log('Creating PDF loading task...');
    
    // Use very simple configuration to avoid worker issues
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Disable worker entirely to avoid initialization issues
      useWorkerFetch: false,
      isEvalSupported: false,
      // Force synchronous loading
      disableAutoFetch: true,
      disableStream: true,
      // Increase verbosity for debugging
      verbosity: 1
    });
    
    console.log('Loading task created, waiting for PDF...');
    
    // Add a race condition with manual timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout')), 8000);
    });
    
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as pdfjsLib.PDFDocumentProxy;
    console.log(`PDF loaded! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(30);
    
    let extractedText = '';
    const totalPages = Math.min(pdf.numPages, 20); // Limit to 20 pages max
    
    // Process pages sequentially to avoid memory issues
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Loading page ${pageNum}...`);
        
        const page = await pdf.getPage(pageNum);
        console.log(`Page ${pageNum} loaded, extracting text...`);
        
        const textContent = await page.getTextContent();
        console.log(`Page ${pageNum} text content items:`, textContent.items.length);
        
        // Extract text from page
        const pageText = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText) {
          extractedText += pageText + '\n\n';
          console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
        }
        
        // Clean up page resources
        page.cleanup();
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / totalPages) * 60);
          onProgress(progress);
        }
        
      } catch (pageError) {
        console.error(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean up PDF resources
    await pdf.destroy();
    
    if (onProgress) onProgress(95);
    
    // Validate extracted text
    if (!extractedText.trim()) {
      return {
        success: false,
        text: '',
        totalPages,
        error: 'No text could be extracted from the PDF'
      };
    }
    
    // Clean the text
    const cleanedText = cleanAndNormalizeText(extractedText);
    
    if (onProgress) onProgress(100);
    
    console.log(`Successfully extracted ${cleanedText.length} characters from ${totalPages} pages`);
    
    return {
      success: true,
      text: cleanedText,
      totalPages
    };
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}

/**
 * Extract text from PDF URL - fetch and process
 */
export async function extractTextFromPdfUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Fetching PDF from URL:', url);
    
    if (onProgress) onProgress(5);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`PDF downloaded, size: ${arrayBuffer.byteLength} bytes`);
    
    if (onProgress) onProgress(15);
    
    // Extract text
    return await extractTextFromPdfBuffer(arrayBuffer, (pdfProgress) => {
      const mappedProgress = 15 + Math.floor((pdfProgress / 100) * 85);
      if (onProgress) onProgress(mappedProgress);
    });
    
  } catch (error) {
    console.error('Error fetching or processing PDF:', error);
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Failed to process PDF from URL'
    };
  }
}
