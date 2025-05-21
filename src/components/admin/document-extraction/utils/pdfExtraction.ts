
import * as pdfjsLib from 'pdfjs-dist';
import { initPdfWorker } from './pdfWorkerInit';
import { isPdfBuffer } from './pdfValidation';
import { PdfExtractionOptions, DEFAULT_EXTRACTION_OPTIONS } from './pdfTypes';

/**
 * Extract text from a PDF document
 * @param pdfData ArrayBuffer containing the PDF data
 * @param progressCallback Optional callback to report progress
 * @param options Configuration options for the extraction process
 * @returns Extracted text from the PDF
 */
export const extractPdfText = async (
  pdfData: ArrayBuffer,
  progressCallback?: (progress: number) => void,
  options?: PdfExtractionOptions
): Promise<string> => {
  // Merge provided options with defaults
  const extractionOptions = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  
  // Initialize progress reporting
  if (progressCallback) progressCallback(5);
  
  // Validate that the input is actually a PDF
  if (!isPdfBuffer(pdfData)) {
    console.error("The provided data does not appear to be a PDF (missing PDF header)");
    throw new Error("The file does not appear to be a valid PDF document. It may be corrupted or in an unsupported format.");
  }
  
  // Initialize the worker before processing
  try {
    await initPdfWorker();
    if (progressCallback) progressCallback(20);
  } catch (error) {
    console.error("Failed to initialize PDF worker:", error);
    throw new Error("Failed to load PDF processing worker. This may be due to network issues or content filtering. Try again later or on a different network.");
  }
  
  try {
    // Load the PDF document with additional parameters to handle corrupted files
    if (progressCallback) progressCallback(30);
    
    // Create object for PDF loading
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      disableFontFace: true,
    });
    
    // Log the timeout value we're using
    console.log(`PDF loading with timeout: ${extractionOptions.loadingTimeout}ms`);
    
    // Set a timeout for the loading task
    const loadingPromise = Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          // Abort the loading task if possible
          loadingTask.destroy().catch(() => {});
          reject(new Error(`PDF loading timed out after ${Math.round(extractionOptions.loadingTimeout! / 1000)} seconds. The document might be too large or corrupted.`));
        }, extractionOptions.loadingTimeout);
      })
    ]);
    
    const pdf = await loadingPromise as pdfjsLib.PDFDocumentProxy;
    console.log("PDF document loaded with", pdf.numPages, "pages");
    
    // Set progress after loading document
    if (progressCallback) progressCallback(40);
    
    // Extract text from each page
    let fullText = '';
    const totalPages = pdf.numPages;
    let processedPages = 0;
    
    // Create an array of promises for processing pages concurrently (but limited)
    const pagePromises = [];
    const maxConcurrentPages = extractionOptions.maxConcurrentPages;
    
    for (let i = 1; i <= totalPages; i++) {
      // Process pages in batches to avoid memory issues
      if (pagePromises.length >= maxConcurrentPages!) {
        // Wait for at least one page to finish before starting another
        await Promise.race(pagePromises);
        // Remove completed promises
        for (let j = 0; j < pagePromises.length; j++) {
          if (pagePromises[j].status === 'fulfilled') {
            pagePromises.splice(j, 1);
            j--;
          }
        }
      }
      
      // Create a promise for processing this page
      const pagePromise = (async (pageNum) => {
        try {
          // Get the page
          const page = await pdf.getPage(pageNum);
          
          // Extract the text content with timeout
          const textContentPromise = Promise.race([
            page.getTextContent(),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(`Page ${pageNum} text extraction timed out after ${Math.round(extractionOptions.pageTimeout! / 1000)} seconds`));
              }, extractionOptions.pageTimeout);
            })
          ]);
          
          // Use any type to bypass strict type checking issues
          const textContent = await textContentPromise as any; 
          
          // Join text items to form page text
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          // Append to the full text with page number
          return `--- Page ${pageNum} ---\n${pageText}`;
        } catch (error) {
          console.error(`Error extracting text from page ${pageNum}:`, error);
          return `--- Page ${pageNum} - Error ---\nFailed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`;
        } finally {
          // Update progress regardless of success/failure
          processedPages++;
          if (progressCallback) {
            const progress = 40 + Math.floor((processedPages / totalPages) * 55);
            progressCallback(progress);
          }
        }
      })(i);
      
      pagePromises.push(pagePromise);
    }
    
    // Wait for all remaining pages to finish
    const pageTexts = await Promise.all(pagePromises);
    fullText = pageTexts.join('\n\n');
    
    // Clean up PDF resources
    pdf.destroy().catch(e => console.error("Error destroying PDF:", e));
    
    // Set completion progress
    if (progressCallback) progressCallback(95);
    
    // Return the extracted text
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    
    // More specific error handling
    let errorMessage = "Error processing PDF document";
    if (error instanceof Error) {
      if (error.message.includes("worker")) {
        errorMessage = "PDF worker error: " + error.message;
      } else if (error.message.includes("Invalid PDF")) {
        errorMessage = "The file is not a valid PDF document.";
      } else if (error.message.includes("timed out")) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
};
