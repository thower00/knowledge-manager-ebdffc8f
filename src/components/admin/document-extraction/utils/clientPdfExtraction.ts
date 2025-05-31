
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeText, validateExtractedText } from '../services/textCleaningService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  totalPages: number;
  error?: string;
}

/**
 * Extract text from PDF using client-side PDF.js - simplified and reliable approach
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Starting PDF.js extraction...');
    
    if (onProgress) onProgress(10);
    
    // Load the PDF document with a timeout
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    
    // Add timeout to PDF loading
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timed out')), 30000);
      })
    ]);
    
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    if (onProgress) onProgress(20);
    
    let extractedText = '';
    const totalPages = pdf.numPages;
    
    // Process pages with individual timeouts
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        
        // Get page with timeout
        const page = await Promise.race([
          pdf.getPage(pageNum),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} loading timed out`)), 10000);
          })
        ]);
        
        // Get text content with timeout
        const textContent = await Promise.race([
          page.getTextContent(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Page ${pageNum} text extraction timed out`)), 10000);
          })
        ]);
        
        // Process text items safely
        let pageText = '';
        if (textContent && textContent.items) {
          pageText = textContent.items
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object' && item.str) return item.str;
              return '';
            })
            .filter(text => text && text.trim().length > 0)
            .join(' ');
        }
        
        if (pageText.trim()) {
          extractedText += pageText + '\n\n';
        }
        
        // Clean up page resources
        page.cleanup();
        
        // Update progress
        if (onProgress) {
          const progress = 20 + Math.round((pageNum / totalPages) * 70);
          onProgress(progress);
        }
        
        console.log(`Extracted ${pageText.length} characters from page ${pageNum}`);
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        extractedText += `[Error reading page ${pageNum}]\n\n`;
      }
    }
    
    // Clean up PDF resources
    await pdf.destroy();
    
    if (onProgress) onProgress(95);
    
    // Clean and validate the extracted text
    const cleanedText = cleanAndNormalizeText(extractedText);
    const validation = validateExtractedText(cleanedText);
    
    if (!validation.isValid && cleanedText.length === 0) {
      return {
        success: false,
        text: '',
        totalPages,
        error: validation.message || 'Could not extract readable text from PDF'
      };
    }
    
    if (onProgress) onProgress(100);
    
    console.log(`Successfully extracted ${cleanedText.length} characters from ${totalPages} pages`);
    
    return {
      success: true,
      text: cleanedText,
      totalPages
    };
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    
    let errorMessage = 'Failed to extract text from PDF';
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        errorMessage = 'PDF processing timed out. The file may be too complex or corrupted.';
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The file does not appear to be a valid PDF document.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      text: '',
      totalPages: 0,
      error: errorMessage
    };
  }
}

/**
 * Extract text from PDF URL - fetch and process client-side
 */
export async function extractTextFromPdfUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Fetching PDF from URL:', url);
    
    if (onProgress) onProgress(5);
    
    // Fetch the PDF with timeout
    const response = await Promise.race([
      fetch(url),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF fetch timed out')), 30000);
      })
    ]);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`PDF downloaded, size: ${arrayBuffer.byteLength} bytes`);
    
    if (onProgress) onProgress(15);
    
    // Extract text using PDF.js
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
