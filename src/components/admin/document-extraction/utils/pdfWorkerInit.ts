
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using CDN sources directly
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  try {
    // Use CDN directly - no local worker file needed
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.js';
    
    console.log("PDF worker initialized with CDN worker");
    workerInitialized = true;
    return true;
    
  } catch (error) {
    console.warn("Primary CDN failed, trying fallback:", error);
    
    try {
      // Fallback: Use unpkg CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.2.133/build/pdf.worker.min.js';
      
      console.log("PDF worker initialized with fallback CDN");
      workerInitialized = true;
      return true;
      
    } catch (fallbackError) {
      console.error("Both CDN sources failed, disabling worker:", fallbackError);
      
      // Final attempt: disable worker entirely and use main thread
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        console.log("PDF.js will run on main thread (no worker)");
        workerInitialized = true;
        return true;
      } catch (mainThreadError) {
        console.error("Failed to initialize PDF.js:", mainThreadError);
        throw new Error("Could not initialize PDF processing. Please try refreshing the page.");
      }
    }
  }
}
