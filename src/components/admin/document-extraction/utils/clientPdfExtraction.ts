
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
 * Extract text from PDF using client-side PDF.js with aggressive timeout handling
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  console.log('Starting PDF.js extraction with buffer size:', arrayBuffer.byteLength);
  
  try {
    if (onProgress) onProgress(10);
    
    // Create loading task with strict timeout
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableAutoFetch: true,
      disableStream: true
    });
    
    // Load PDF with 15 second timeout
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('PDF loading timeout after 15 seconds');
          reject(new Error('PDF loading timed out after 15 seconds'));
        }, 15000);
      })
    ]);
    
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    if (onProgress) onProgress(30);
    
    let extractedText = '';
    const totalPages = Math.min(pdf.numPages, 50); // Limit to 50 pages max
    
    // Process pages with individual timeouts
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        
        // Get page with 5 second timeout
        const page = await Promise.race([
          pdf.getPage(pageNum),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} loading timeout`)), 5000);
          })
        ]);
        
        // Get text content with 5 second timeout
        const textContent = await Promise.race([
          page.getTextContent(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} text extraction timeout`)), 5000);
          })
        ]);
        
        // Extract text from items
        const pageText = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
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
        
        console.log(`Page ${pageNum} processed, extracted ${pageText.length} characters`);
        
        // Break early if we have enough content
        if (extractedText.length > 50000) {
          console.log('Extracted enough content, stopping early');
          break;
        }
        
      } catch (pageError) {
        console.warn(`Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean up PDF
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
 * Extract text from PDF URL - fetch and process with timeout
 */
export async function extractTextFromPdfUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Fetching PDF from URL:', url);
    
    if (onProgress) onProgress(5);
    
    // Fetch with 10 second timeout
    const response = await Promise.race([
      fetch(url),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF fetch timed out')), 10000);
      })
    ]);
    
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
