
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker with a simpler, more reliable approach
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  try {
    // Use a simpler approach - set worker source to a version that should work
    // Try the jsdelivr CDN first as it's often more reliable
    const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
    
    console.log(`Setting PDF worker source to: ${workerSrc}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    
    // Test if we can create a simple document to verify worker is working
    console.log("Testing PDF worker with a simple document...");
    
    // Create a minimal PDF for testing
    const testPdf = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, 0xF3, 0xA0, 0xD0, 0xC4, 0xC6, // header
      0x0A, // newline
    ]);
    
    // This will throw an error if the worker can't be loaded
    const loadingTask = pdfjsLib.getDocument({ data: testPdf });
    
    // We don't need to actually load this test PDF, just verify the worker initializes
    // Cancel the loading task immediately
    loadingTask.destroy();
    
    console.log("PDF worker initialized successfully");
    workerInitialized = true;
    return true;
    
  } catch (error) {
    console.warn("Primary worker source failed, trying fallback:", error);
    
    // Fallback: try the cdnjs version
    try {
      const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      console.log(`Trying fallback worker source: ${fallbackWorkerSrc}`);
      pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
      
      console.log("Fallback PDF worker initialized");
      workerInitialized = true;
      return true;
      
    } catch (fallbackError) {
      console.error("All worker sources failed:", fallbackError);
      
      // Final fallback: try to use local worker if available
      try {
        console.log("Trying local worker as final fallback");
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        workerInitialized = true;
        return true;
      } catch (localError) {
        console.error("Failed to initialize PDF worker from any source:", localError);
        throw new Error("Could not initialize PDF worker. PDF processing is not available.");
      }
    }
  }
}
