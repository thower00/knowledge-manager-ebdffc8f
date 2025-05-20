
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker sources - using multiple fallback options
// The correct version for PDF.js 5.2.133 should be 5.2.131
const CDN_WORKER_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.131/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.131/build/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@5.2.131/build/pdf.worker.min.js'
];
const LOCAL_WORKER_SRC = '/pdf.worker.min.js'; // Local fallback path

// Initialize the worker with multiple fallback mechanisms
async function initPdfWorker() {
  // Try each CDN source in order
  for (const workerSrc of CDN_WORKER_SOURCES) {
    try {
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      console.log(`Attempting to load PDF worker from: ${workerSrc}`);
      
      // Test if the worker can be loaded - if not, will throw an error
      const response = await fetch(workerSrc, { method: 'HEAD', cache: 'no-cache' });
      if (response.ok) {
        console.log(`PDF worker loaded successfully from: ${workerSrc}`);
        return true; // Worker loaded successfully
      }
    } catch (error) {
      console.warn(`Failed to load PDF worker from: ${workerSrc}`, error);
      // Continue to next source
    }
  }
  
  // All CDN sources failed, use local worker
  try {
    console.warn("All CDN worker sources failed, falling back to local worker");
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_SRC;
    console.log("Using local PDF worker");
    return true;
  } catch (error) {
    console.error("Failed to initialize PDF worker from any source", error);
    throw new Error("Could not initialize PDF worker from any source");
  }
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
  
  // Initialize the worker before processing
  try {
    await initPdfWorker();
    if (progressCallback) progressCallback(20);
  } catch (error) {
    console.error("Failed to initialize PDF worker:", error);
    throw new Error("Failed to load PDF processing worker. This may be due to network issues or content filtering. Try again later or on a different network.");
  }
  
  try {
    // Load the PDF document
    if (progressCallback) progressCallback(30);
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    console.log("PDF document loaded with", pdf.numPages, "pages");
    
    // Set progress after loading document
    if (progressCallback) progressCallback(40);
    
    // Extract text from each page
    let fullText = '';
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      // Get the page
      const page = await pdf.getPage(i);
      
      // Extract the text content
      const textContent = await page.getTextContent();
      
      // Join text items to form page text
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      // Append to the full text
      fullText += pageText + '\n\n';
      
      // Update progress if callback is provided
      if (progressCallback) {
        const progress = 40 + Math.floor((i / totalPages) * 55);
        progressCallback(progress);
      }
      
      // Clean up page resources
      page.cleanup();
    }
    
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
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
};
