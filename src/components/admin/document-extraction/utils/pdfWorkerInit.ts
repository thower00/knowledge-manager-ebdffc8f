
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

/**
 * Initialize the PDF.js worker with multiple fallback mechanisms
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker() {
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
