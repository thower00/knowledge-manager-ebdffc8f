
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using version-matched CDN sources
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  // Use exact version matching to avoid API/Worker version mismatches
  const pdfJsVersion = pdfjsLib.version || '5.2.133';
  
  // Try CDN URLs that match the exact PDF.js version
  const workerUrls = [
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsVersion}/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.js`,
    // Fallback to known working URLs for version 5.2.133
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js',
    'https://unpkg.com/pdfjs-dist@5.2.133/build/pdf.worker.min.js'
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
    // The correct way to disable worker in PDF.js is to set workerSrc to empty string
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    console.log("PDF.js configured to run on main thread (worker disabled)");
    workerInitialized = true;
    return true;
  } catch (mainThreadError) {
    console.error("Failed to configure PDF.js for main thread mode:", mainThreadError);
    throw new Error("Could not initialize PDF processing. The browser may not support PDF.js in this environment.");
  }
}
