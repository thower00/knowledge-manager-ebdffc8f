
import * as pdfjsLib from 'pdfjs-dist';
import { initializePdfWorker } from './pdfWorkerInit';

// Initialize the PDF worker when this module is loaded
initializePdfWorker();

export async function extractPdfText(
  pdfData: ArrayBuffer,
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {
    // Ensure worker is initialized
    initializePdfWorker();
    
    if (progressCallback) progressCallback(10);
    
    console.log('Loading PDF document with pdfjs-dist');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfData),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    if (progressCallback) progressCallback(20);
    
    let fullText = '';
    const totalPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text from the page
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
        
        // Update progress
        if (progressCallback) {
          const progress = 20 + Math.floor((pageNum / totalPages) * 70);
          progressCallback(progress);
        }
        
        console.log(`Page ${pageNum} processed: ${pageText.length} characters`);
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    if (progressCallback) progressCallback(100);
    
    if (!fullText.trim()) {
      throw new Error('No text content found in PDF - the document may be image-based or encrypted');
    }
    
    console.log(`Successfully extracted ${fullText.length} characters from PDF`);
    return fullText.trim();
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    let errorMessage = 'Failed to extract text from PDF';
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The file is not a valid PDF document';
      } else if (error.message.includes('No "GlobalWorkerOptions.workerSrc"')) {
        errorMessage = 'PDF worker not properly configured';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(`PDF worker error: ${errorMessage}`);
  }
}
