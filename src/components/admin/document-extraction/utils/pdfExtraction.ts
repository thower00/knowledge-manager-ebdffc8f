
import * as pdfjsLib from 'pdfjs-dist';
import { initPdfWorker } from './pdfWorkerInit';
import { isPdfBuffer } from './pdfValidation';
import { 
  PdfExtractionOptions, 
  DEFAULT_EXTRACTION_OPTIONS, 
  PageExtractionResult,
  PdfMetadata 
} from './pdfTypes';

/**
 * Get metadata from PDF document
 * @param pdfDoc PDF document instance
 * @returns Object containing metadata
 */
async function getPdfMetadata(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata> {
  try {
    const metadata = await pdfDoc.getMetadata();
    const info = metadata.info as Record<string, any> || {};
    
    return {
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      keywords: info?.Keywords as string | undefined,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate: info?.CreationDate ? new Date(info.CreationDate as string) : undefined,
      modificationDate: info?.ModDate ? new Date(info.ModDate as string) : undefined,
      pageCount: pdfDoc.numPages
    };
  } catch (error) {
    console.error("Error getting PDF metadata:", error);
    return { pageCount: pdfDoc.numPages };
  }
}

/**
 * Extract text from a single PDF page
 * @param page Page object from PDF.js
 * @param pageNum Page number (1-based)
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to page text or error
 */
async function extractPageText(
  page: pdfjsLib.PDFPageProxy, 
  pageNum: number,
  timeoutMs: number = 20000
): Promise<PageExtractionResult> {
  try {
    // Extract the text content with timeout
    const textContentPromise = Promise.race([
      page.getTextContent(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Page ${pageNum} text extraction timed out after ${Math.round(timeoutMs / 1000)} seconds`));
        }, timeoutMs);
      })
    ]);
    
    // Use any type to bypass strict type checking issues
    const textContent = await textContentPromise as any;
    
    // Join text items to form page text
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    return { 
      pageNumber: pageNum, 
      text: `--- Page ${pageNum} ---\n${pageText}` 
    };
  } catch (error) {
    console.error(`Error extracting text from page ${pageNum}:`, error);
    return { 
      pageNumber: pageNum, 
      text: `--- Page ${pageNum} - Error ---\n`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract text from a PDF document with improved reliability
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
    if (progressCallback) progressCallback(15);
  } catch (error) {
    console.error("Failed to initialize PDF worker:", error);
    throw new Error("Failed to load PDF processing worker. This may be due to network issues or content filtering. Try again later or on a different network.");
  }
  
  // Track completion status for early termination
  let extractionCompleted = false;
  let extractionAborted = false;
  
  // Set up abort handling if signal provided
  if (extractionOptions.abortSignal) {
    extractionOptions.abortSignal.addEventListener('abort', () => {
      console.log("PDF extraction aborted by signal");
      extractionAborted = true;
    });
  }
  
  try {
    // Load the PDF document with additional parameters to handle corrupted files
    if (progressCallback) progressCallback(20);
    
    // Create object for PDF loading
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      disableFontFace: true, // Improve performance
    });
    
    // Shorter timeout for initial loading to fail fast if document is problematic
    const initialLoadingTimeout = extractionOptions.loadingTimeout! / 2;
    console.log(`Initial PDF loading with timeout: ${initialLoadingTimeout}ms`);
    
    // Set a timeout for the loading task with shorter initial timeout
    // This detects problematic PDFs faster
    const loadingPromise = Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Initial PDF loading timed out after ${Math.round(initialLoadingTimeout / 1000)} seconds. The document might be problematic.`));
        }, initialLoadingTimeout);
      })
    ]);
    
    let pdf: pdfjsLib.PDFDocumentProxy;
    
    try {
      pdf = await loadingPromise as pdfjsLib.PDFDocumentProxy;
    } catch (error) {
      // If initial quick load fails, try one more time with full timeout
      console.warn("Initial quick PDF load failed, trying with full timeout:", error);
      
      // Create a new loading task for the retry
      const retryLoadingTask = pdfjsLib.getDocument({
        data: pdfData,
        disableFontFace: true,
      });
      
      // Try again with the full timeout
      console.log(`Retrying PDF loading with full timeout: ${extractionOptions.loadingTimeout}ms`);
      
      const retryPromise = Promise.race([
        retryLoadingTask.promise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`PDF loading timed out after ${Math.round(extractionOptions.loadingTimeout! / 1000)} seconds. The document might be too large or corrupted.`));
          }, extractionOptions.loadingTimeout);
        })
      ]);
      
      pdf = await retryPromise as pdfjsLib.PDFDocumentProxy;
    }
    
    // Get metadata and log information about the document
    const metadata = await getPdfMetadata(pdf);
    console.log(`PDF document loaded with ${metadata.pageCount} pages`);
    console.log("PDF metadata:", metadata);
    
    // Set progress after loading document
    if (progressCallback) progressCallback(30);
    
    // Determine how many pages to process
    const totalPages = metadata.pageCount;
    const pagesToProcess = extractionOptions.maxPages && extractionOptions.maxPages > 0 
      ? Math.min(extractionOptions.maxPages, totalPages) 
      : totalPages;
    
    if (extractionOptions.maxPages && extractionOptions.maxPages > 0 && extractionOptions.maxPages < totalPages) {
      console.log(`Processing only the first ${pagesToProcess} pages out of ${totalPages} total`);
    }
    
    // Initialize tracking variables
    let processedPages = 0;
    const pageTexts: PageExtractionResult[] = [];
    const maxConcurrent = extractionOptions.maxConcurrentPages || 3;
    
    // Process pages in batches to limit memory usage
    for (let startIdx = 1; startIdx <= pagesToProcess; startIdx += maxConcurrent) {
      // Check if aborted
      if (extractionAborted) {
        throw new Error("PDF extraction was aborted");
      }
      
      const endIdx = Math.min(startIdx + maxConcurrent - 1, pagesToProcess);
      console.log(`Processing pages ${startIdx}-${endIdx} of ${pagesToProcess}`);
      
      // Initialize batch of promises for concurrent processing
      const batchPromises: Promise<PageExtractionResult>[] = [];
      
      // Add pages to the current batch
      for (let pageNum = startIdx; pageNum <= endIdx; pageNum++) {
        batchPromises.push((async () => {
          try {
            // Get the page
            const page = await pdf.getPage(pageNum);
            
            // Extract text with timeout
            const result = await extractPageText(
              page, pageNum, extractionOptions.pageTimeout
            );
            
            // Release page resources
            page.cleanup();
            
            return result;
          } catch (error) {
            console.error(`Error processing page ${pageNum}:`, error);
            return {
              pageNumber: pageNum,
              text: `--- Page ${pageNum} - Error ---\n`,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })());
      }
      
      // Wait for all pages in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to our collection in page order
      for (const result of batchResults) {
        pageTexts[result.pageNumber - 1] = result;
        processedPages++;
        
        // Update progress
        if (progressCallback) {
          const progress = 30 + Math.floor((processedPages / pagesToProcess) * 65);
          progressCallback(Math.min(progress, 95));
        }
      }
    }
    
    // Mark extraction as completed
    extractionCompleted = true;
    
    // Clean up PDF resources
    pdf.destroy().catch(e => console.error("Error destroying PDF:", e));
    
    // Combine results in page order
    let fullText = '';
    for (let i = 0; i < pageTexts.length; i++) {
      if (pageTexts[i]) {
        fullText += pageTexts[i].text + '\n\n';
      } else {
        fullText += `--- Page ${i + 1} - Missing ---\n\n`;
      }
    }
    
    // Add a note if we limited the pages
    if (extractionOptions.maxPages && extractionOptions.maxPages > 0 && totalPages > extractionOptions.maxPages) {
      fullText += `\n--- Only first ${extractionOptions.maxPages} pages of ${totalPages} were processed ---\n`;
    }
    
    // Set completion progress
    if (progressCallback) progressCallback(100);
    
    // Return the extracted text
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    
    // Handle errors with more specific messages
    let errorMessage = "Error processing PDF document";
    
    if (error instanceof Error) {
      if (extractionAborted) {
        errorMessage = "PDF processing was cancelled";
      } else if (error.message.includes("worker")) {
        errorMessage = "PDF worker error: " + error.message;
      } else if (error.message.includes("Invalid PDF")) {
        errorMessage = "The file is not a valid PDF document.";
      } else if (error.message.includes("timed out")) {
        errorMessage = error.message;
        
        // Add hint for large documents
        if (!extractionCompleted && error.message.includes("loading timed out")) {
          errorMessage += " Try using the 'Extract First Pages' option for large documents.";
        }
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Extract only the first N pages of a PDF
 * Useful for very large documents that might timeout
 */
export const extractPdfFirstPages = async (
  pdfData: ArrayBuffer,
  pageCount: number = 10,
  progressCallback?: (progress: number) => void
): Promise<string> => {
  console.log(`Extracting first ${pageCount} pages of PDF`);
  return extractPdfText(
    pdfData,
    progressCallback,
    {
      ...DEFAULT_EXTRACTION_OPTIONS,
      maxPages: pageCount,
      loadingTimeout: 90000, // Extended timeout for loading phase
    }
  );
};
