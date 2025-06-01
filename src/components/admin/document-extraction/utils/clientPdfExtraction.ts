
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeText } from '../services/textCleaningService';

// Set up PDF.js worker with simple fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  totalPages: number;
  error?: string;
}

/**
 * Extract text from PDF using client-side PDF.js - simplified approach
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

  try {
    if (onProgress) onProgress(10);
    
    console.log('Creating PDF document...');
    
    // Use the simplest possible PDF.js configuration
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;
    
    console.log(`PDF loaded! Pages: ${pdf.numPages}`);
    
    if (onProgress) onProgress(30);
    
    let extractedText = '';
    const totalPages = Math.min(pdf.numPages, 10); // Limit to 10 pages for speed
    
    // Process pages one by one
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
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
