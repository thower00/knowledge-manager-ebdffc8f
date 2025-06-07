
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize PDF.js to run without external workers
 * This avoids network-related worker loading issues
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  try {
    // Configure PDF.js to run in main thread by setting empty workerSrc
    // This prevents PDF.js from trying to load external worker files
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    console.log("PDF.js configured to run in main thread (no external worker)");
    workerInitialized = true;
    return true;
    
  } catch (error) {
    console.error("Failed to initialize PDF.js:", error);
    throw new Error("Could not initialize PDF processing. Please try refreshing the page.");
  }
}
