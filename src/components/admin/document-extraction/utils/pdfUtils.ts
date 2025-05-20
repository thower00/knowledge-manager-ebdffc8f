
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker source - using a local fallback if CDN fails
const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js';
const LOCAL_WORKER_SRC = '/pdf.worker.min.js'; // Local fallback path

// Initialize the worker with fallback mechanism
async function initPdfWorker() {
  try {
    // First attempt: try setting to CDN worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    
    // Test if the worker can be loaded - if not, will throw an error
    await fetch(PDF_WORKER_SRC, { method: 'HEAD' });
    console.log("PDF worker loaded from CDN successfully");
  } catch (error) {
    console.warn("Failed to load PDF worker from CDN, falling back to local worker");
    
    // Fallback: use local worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_SRC;
    
    // Optional: notify that we're using the local worker
    console.log("Using local PDF worker");
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
  // Initialize the worker before processing
  await initPdfWorker();
  
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    console.log("PDF document loaded with", pdf.numPages, "pages");
    
    // Set initial progress
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
    throw error;
  }
};
