
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker sources - using multiple fallback options
// PDF.js 5.2.133 needs worker version 5.2.131
const CDN_WORKER_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', // Try latest stable version first
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.131/pdf.worker.min.js', // Try exact match version
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.131/build/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js', // Additional CDNs
];
const LOCAL_WORKER_SRC = '/pdf.worker.min.js'; // Local fallback path

let workerInitialized = false;

// Initialize the worker with multiple fallback mechanisms
async function initPdfWorker() {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  // Try local worker first for faster loading in most cases
  try {
    console.log("Trying local PDF worker first");
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_SRC;
    // Test if we can fetch it
    const response = await fetch(LOCAL_WORKER_SRC, { method: 'HEAD', cache: 'no-cache' });
    if (response.ok) {
      console.log(`Local PDF worker loaded successfully`);
      workerInitialized = true;
      return true;
    }
  } catch (error) {
    console.warn(`Local worker not available, will try CDN sources`, error);
  }
  
  // Try each CDN source in order
  for (const workerSrc of CDN_WORKER_SOURCES) {
    try {
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      console.log(`Attempting to load PDF worker from: ${workerSrc}`);
      
      // Test if the worker can be loaded
      const response = await fetch(workerSrc, { method: 'HEAD', cache: 'no-cache' });
      if (response.ok) {
        console.log(`PDF worker loaded successfully from: ${workerSrc}`);
        workerInitialized = true;
        return true;
      }
    } catch (error) {
      console.warn(`Failed to load PDF worker from: ${workerSrc}`, error);
      // Continue to next source
    }
  }
  
  // All sources failed, try once more with the local worker as absolute last resort
  try {
    console.warn("All CDN worker sources failed, using local worker as final attempt");
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_SRC;
    console.log("Using local PDF worker (final attempt)");
    workerInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize PDF worker from any source", error);
    throw new Error("Could not initialize PDF worker from any source");
  }
}

/**
 * Check if the buffer is likely a PDF based on its initial bytes
 * @param buffer ArrayBuffer to check
 * @returns boolean indicating if the file is likely a PDF
 */
function isPdfBuffer(buffer: ArrayBuffer): boolean {
  // PDF files start with "%PDF-"
  const header = new Uint8Array(buffer, 0, 5);
  const headerString = String.fromCharCode(...header);
  return headerString === '%PDF-';
}

/**
 * Extract text from a PDF document
 * @param pdfData ArrayBuffer containing the PDF data
 * @param progressCallback Optional callback to report progress
 * @returns Extracted text from the PDF
 */
export const extractPdfText = async (
  pdfData: ArrayBuffer,
  progressCallback?: (progress: number) => void
): Promise<string> => {
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
    
    // Fix for TypeScript error: Use the correct DocumentInitParameters
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      // Remove the unsupported nativeImageDecoderSupport property
      disableFontFace: true,
      ignoreErrors: true
    });
    
    // Set a timeout for the loading task
    const loadingPromise = Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          // Abort the loading task if possible
          loadingTask.destroy().catch(() => {});
          reject(new Error("PDF loading timed out after 30 seconds. The document might be too large or corrupted."));
        }, 30000); // 30 second timeout
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
    const maxConcurrentPages = 3; // Process up to 3 pages concurrently
    
    for (let i = 1; i <= totalPages; i++) {
      // Process pages in batches to avoid memory issues
      if (pagePromises.length >= maxConcurrentPages) {
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
                reject(new Error(`Page ${pageNum} text extraction timed out`));
              }, 15000); // 15 second timeout per page
            })
          ]);
          
          // Fix for TypeScript error: Use a more generic type for textContent
          const textContent = await textContentPromise as any; // Using 'any' to bypass strict type checking
          
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
