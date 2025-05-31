
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeText, validateExtractedText } from '../services/textCleaningService';

// Set up PDF.js worker with fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  totalPages: number;
  error?: string;
}

/**
 * Extract text from PDF using client-side PDF.js with comprehensive debugging
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  console.log('=== PDF.js Extraction Debug Start ===');
  console.log('PDF.js version:', pdfjsLib.version);
  console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  console.log('Buffer size:', arrayBuffer.byteLength, 'bytes');
  
  // Validate buffer
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    console.error('Invalid or empty ArrayBuffer');
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: 'Invalid or empty PDF data'
    };
  }

  // Check if it looks like a PDF
  const uint8Array = new Uint8Array(arrayBuffer.slice(0, 10));
  const header = String.fromCharCode.apply(null, Array.from(uint8Array));
  console.log('File header:', header);
  
  if (!header.startsWith('%PDF-')) {
    console.error('File does not appear to be a PDF. Header:', header);
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: 'File does not appear to be a valid PDF document'
    };
  }
  
  try {
    if (onProgress) onProgress(10);
    
    console.log('Creating PDF loading task...');
    
    // Create loading task with minimal configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableAutoFetch: true,
      disableStream: true,
      verbosity: 0 // Reduce verbosity
    });
    
    console.log('Loading task created, waiting for PDF...');
    
    // Load PDF with shorter timeout for debugging
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('PDF loading timeout after 10 seconds');
          loadingTask.destroy(); // Clean up the loading task
          reject(new Error('PDF loading timed out after 10 seconds'));
        }, 10000);
      })
    ]);
    
    console.log(`PDF loaded successfully! Pages: ${pdf.numPages}`);
    if (onProgress) onProgress(30);
    
    let extractedText = '';
    const totalPages = Math.min(pdf.numPages, 10); // Limit to 10 pages for debugging
    
    console.log(`Processing ${totalPages} pages...`);
    
    // Process pages with individual timeouts
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Getting page ${pageNum}...`);
        
        // Get page with shorter timeout
        const page = await Promise.race([
          pdf.getPage(pageNum),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} loading timeout`)), 3000);
          })
        ]);
        
        console.log(`Page ${pageNum} loaded, getting text content...`);
        
        // Get text content with shorter timeout
        const textContent = await Promise.race([
          page.getTextContent(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} text extraction timeout`)), 3000);
          })
        ]);
        
        console.log(`Page ${pageNum} text content retrieved, items:`, textContent.items.length);
        
        // Extract text from items
        const pageText = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
        
        if (pageText) {
          extractedText += pageText + '\n\n';
        }
        
        // Clean up page
        page.cleanup();
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / totalPages) * 60);
          onProgress(progress);
        }
        
        // Early exit if we have some content for debugging
        if (extractedText.length > 1000) {
          console.log('Got enough content for debugging, stopping early');
          break;
        }
        
      } catch (pageError) {
        console.error(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log('Cleaning up PDF...');
    
    // Clean up PDF
    try {
      await pdf.destroy();
      console.log('PDF cleanup completed');
    } catch (cleanupError) {
      console.warn('PDF cleanup error:', cleanupError);
    }
    
    if (onProgress) onProgress(95);
    
    console.log(`Total extracted text length: ${extractedText.length}`);
    
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
    
    console.log('=== PDF.js Extraction Debug Success ===');
    console.log(`Successfully extracted ${cleanedText.length} characters from ${totalPages} pages`);
    
    return {
      success: true,
      text: cleanedText,
      totalPages
    };
    
  } catch (error) {
    console.error('=== PDF.js Extraction Debug Error ===');
    console.error('PDF.js extraction error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}

/**
 * Extract text from PDF URL - fetch and process with timeout
 */
export async function extractTextFromPdfUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('=== URL Fetch Debug Start ===');
    console.log('Fetching PDF from URL:', url);
    
    if (onProgress) onProgress(5);
    
    // Fetch with shorter timeout for debugging
    const response = await Promise.race([
      fetch(url),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF fetch timed out after 8 seconds')), 8000);
      })
    ]);
    
    console.log('Fetch response status:', response.status);
    console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    console.log('Converting to ArrayBuffer...');
    const arrayBuffer = await response.arrayBuffer();
    console.log(`PDF downloaded, size: ${arrayBuffer.byteLength} bytes`);
    console.log('=== URL Fetch Debug Success ===');
    
    if (onProgress) onProgress(15);
    
    // Extract text
    return await extractTextFromPdfBuffer(arrayBuffer, (pdfProgress) => {
      const mappedProgress = 15 + Math.floor((pdfProgress / 100) * 85);
      if (onProgress) onProgress(mappedProgress);
    });
    
  } catch (error) {
    console.error('=== URL Fetch Debug Error ===');
    console.error('Error fetching or processing PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Failed to process PDF from URL'
    };
  }
}
