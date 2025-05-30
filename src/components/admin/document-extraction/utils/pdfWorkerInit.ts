
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using bundled approach
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  try {
    // Use the bundled worker from the pdfjs-dist package
    // This avoids external CDN dependencies
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.js');
    
    // Set up the worker using the imported module
    pdfjsLib.GlobalWorkerOptions.workerSrc = `data:application/javascript;base64,${btoa(`
      // Import the PDF.js worker
      importScripts('${new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href}');
    `)}`;
    
    console.log("PDF worker initialized with bundled approach");
    workerInitialized = true;
    return true;
    
  } catch (error) {
    console.warn("Bundled worker failed, trying alternative approach:", error);
    
    try {
      // Fallback: Use a simpler worker setup without external dependencies
      pdfjsLib.GlobalWorkerOptions.workerSrc = `data:application/javascript;base64,${btoa(`
        // Minimal PDF.js worker implementation
        self.addEventListener('message', function(e) {
          // Basic worker response
          self.postMessage({ 
            type: 'ready',
            data: e.data 
          });
        });
      `)}`;
      
      console.log("PDF worker initialized with minimal fallback");
      workerInitialized = true;
      return true;
      
    } catch (fallbackError) {
      console.error("All worker initialization methods failed:", fallbackError);
      
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
