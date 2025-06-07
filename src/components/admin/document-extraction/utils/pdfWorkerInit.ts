
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using the correct version that matches our installed package
 * Uses version 5.2.133 to match the installed pdfjs-dist package
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  // Use the exact version that matches our installed pdfjs-dist package (5.2.133)
  const matchingVersion = '5.2.133';
  
  const workerUrls = [
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${matchingVersion}/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${matchingVersion}/build/pdf.worker.min.js`,
    // Fallback to Mozilla's CDN
    'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs'
  ];
  
  console.log(`Trying ${workerUrls.length} different worker URLs for version ${matchingVersion}...`);
  
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
  
  // If all CDNs fail, this indicates a network issue
  console.error("All CDN sources failed - network connectivity issue");
  throw new Error("Could not initialize PDF processing. Please check your internet connection and try again.");
}
