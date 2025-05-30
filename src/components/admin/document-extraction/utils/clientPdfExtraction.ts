
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeText, validateExtractedText } from '../services/textCleaningService';
import { initPdfWorker } from './pdfWorkerInit';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  totalPages: number;
  error?: string;
}

/**
 * Extract text from PDF using client-side PDF.js with enhanced error handling
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Starting client-side PDF.js extraction...');
    
    // Initialize PDF worker first
    const workerReady = await initPdfWorker();
    if (!workerReady) {
      throw new Error("PDF worker initialization failed");
    }
    
    // Set progress to 10% after worker init
    if (onProgress) onProgress(10);
    
    // Load the PDF document with enhanced configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(20);
    
    let extractedText = '';
    const totalPages = pdf.numPages;
    
    // Extract text from each page with better error handling
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({
          disableCombineTextItems: false
        });
        
        // Combine text items from the page with better spacing
        const pageText = textContent.items
          .map((item: any) => {
            if (item.str) {
              return item.str;
            }
            return '';
          })
          .filter(str => str.trim().length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          extractedText += pageText + '\n\n';
        }
        
        // Update progress
        if (onProgress) {
          const progress = 20 + Math.round((pageNum / totalPages) * 70);
          onProgress(progress);
        }
        
        console.log(`Extracted ${pageText.length} characters from page ${pageNum}`);
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        // Continue with other pages instead of failing entirely
        if (extractedText.length === 0) {
          extractedText += `[Error reading page ${pageNum}]\n\n`;
        }
      }
    }
    
    // Clean up the PDF document
    await pdf.destroy();
    
    if (onProgress) onProgress(95);
    
    // Clean and validate the extracted text
    const cleanedText = cleanAndNormalizeText(extractedText);
    const validation = validateExtractedText(cleanedText);
    
    if (!validation.isValid) {
      console.warn('Text validation failed:', validation.message);
      // Return partial text instead of failing completely
      if (cleanedText.length > 0) {
        console.log('Returning partial text despite validation failure');
        return {
          success: true,
          text: cleanedText,
          totalPages,
          error: `Warning: ${validation.message}`
        };
      }
      
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
    
    // Provide more specific error messages
    let errorMessage = 'Failed to extract text from PDF';
    if (error instanceof Error) {
      if (error.message.includes('worker')) {
        errorMessage = 'PDF worker initialization failed. Please try refreshing the page.';
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The file does not appear to be a valid PDF document.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error while processing PDF. Please check your connection.';
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
 * Extract text from PDF URL using client-side PDF.js
 */
export async function extractTextFromPdfUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Fetching PDF from URL:', url);
    
    // Initialize PDF worker first
    const workerReady = await initPdfWorker();
    if (!workerReady) {
      throw new Error("PDF worker initialization failed");
    }
    
    if (onProgress) onProgress(5);
    
    // Fetch the PDF as array buffer
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`PDF downloaded, size: ${arrayBuffer.byteLength} bytes`);
    
    if (onProgress) onProgress(15);
    
    // Extract text using PDF.js
    return await extractTextFromPdfBuffer(arrayBuffer, (pdfProgress) => {
      // Map PDF extraction progress to our 15-100% range
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
