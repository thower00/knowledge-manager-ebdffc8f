
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
  
  // Try the most reliable CDN first
  const workerUrls = [
    // Known working CDN with version-agnostic URL
    'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
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
  
  // If all CDNs fail, disable worker entirely and use main thread mode
  console.warn("All CDN sources failed, configuring for main thread mode");
  try {
    // The correct way to disable worker in PDF.js is to set workerSrc to false
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;
    console.log("PDF.js configured to run on main thread (worker disabled)");
    workerInitialized = true;
    return true;
  } catch (mainThreadError) {
    console.error("Failed to configure PDF.js for main thread mode:", mainThreadError);
    
    // Last resort - try setting to empty string
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      console.log("PDF.js fallback: empty worker source");
      workerInitialized = true;
      return true;
    } catch (finalError) {
      console.error("All PDF.js initialization methods failed:", finalError);
      throw new Error("Could not initialize PDF processing. The browser may not support PDF.js in this environment.");
    }
  }
}
