
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using reliable CDN sources
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  // List of CDN URLs to try in order of preference
  const workerUrls = [
    // Use the same version as the installed pdfjs-dist package
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
    // Fallback to a known working version
    'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js'
  ];
  
  // Try each CDN URL
  for (let i = 0; i < workerUrls.length; i++) {
    const workerUrl = workerUrls[i];
    console.log(`Trying PDF worker URL ${i + 1}/${workerUrls.length}: ${workerUrl}`);
    
    try {
      // Test if the URL is accessible before setting it
      const response = await fetch(workerUrl, { method: 'HEAD' });
      if (response.ok) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        console.log(`PDF worker initialized successfully with: ${workerUrl}`);
        workerInitialized = true;
        return true;
      } else {
        console.warn(`CDN URL ${workerUrl} returned status: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Failed to access CDN URL ${workerUrl}:`, error);
      continue;
    }
  }
  
  // If all CDNs fail, try disabling worker entirely (main thread mode)
  console.warn("All CDN sources failed, attempting main thread mode");
  try {
    // Setting workerSrc to null/undefined forces main thread mode
    pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
    console.log("PDF.js configured to run on main thread (no worker)");
    workerInitialized = true;
    return true;
  } catch (mainThreadError) {
    console.error("Failed to configure PDF.js for main thread mode:", mainThreadError);
    throw new Error("Could not initialize PDF processing. Please check your internet connection and try again.");
  }
}
