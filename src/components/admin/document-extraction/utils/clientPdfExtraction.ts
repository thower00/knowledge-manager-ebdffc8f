
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
 * Extract text from PDF using client-side PDF.js
 */
export async function extractTextFromPdfBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PdfExtractionResult> {
  try {
    console.log('Starting client-side PDF.js extraction...');
    
    // Initialize PDF worker first
    await initPdfWorker();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    let extractedText = '';
    const totalPages = pdf.numPages;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          extractedText += pageText + '\n\n';
        }
        
        // Update progress
        if (onProgress) {
          const progress = Math.round((pageNum / totalPages) * 100);
          onProgress(progress);
        }
        
        console.log(`Extracted ${pageText.length} characters from page ${pageNum}`);
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean and validate the extracted text
    const cleanedText = cleanAndNormalizeText(extractedText);
    const validation = validateExtractedText(cleanedText);
    
    if (!validation.isValid) {
      console.warn('Text validation failed:', validation.message);
      return {
        success: false,
        text: '',
        totalPages,
        error: validation.message || 'Could not extract readable text from PDF'
      };
    }
    
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
      error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
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
    await initPdfWorker();
    
    // Fetch the PDF as array buffer
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`PDF downloaded, size: ${arrayBuffer.byteLength} bytes`);
    
    // Extract text using PDF.js
    return await extractTextFromPdfBuffer(arrayBuffer, onProgress);
    
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
