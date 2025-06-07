
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize the PDF.js worker using working CDN sources with proper fallback
 * @returns Promise resolving to true if initialization succeeds
 */
export async function initPdfWorker(): Promise<boolean> {
  if (workerInitialized) {
    console.log("PDF worker already initialized");
    return true;
  }

  console.log("PDF.js version:", pdfjsLib.version);
  
  // Use working PDF.js versions that are actually available on CDNs
  const workingVersions = ['3.11.174', '3.4.120', '2.16.105'];
  
  // Build URLs for working versions
  const workerUrls: string[] = [];
  for (const version of workingVersions) {
    workerUrls.push(
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`
    );
  }
  
  // Add Mozilla's official worker as well
  workerUrls.push('https://mozilla.github.io/pdf.js/build/pdf.worker.mjs');
  
  console.log(`Trying ${workerUrls.length} different worker URLs...`);
  
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
  
  // If all CDNs fail, configure for main thread mode properly
  console.warn("All CDN sources failed, configuring for main thread mode");
  try {
    // The correct way to enable main thread mode in PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    // Test that main thread mode works by trying to create a simple document
    const testData = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
      0x0a, 0x25, 0xc4, 0xe5, 0xf2, 0xe5, 0xeb, 0xa7, 0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a
    ]);
    
    await pdfjsLib.getDocument({ data: testData }).promise;
    console.log("PDF.js main thread mode test successful");
    workerInitialized = true;
    return true;
  } catch (mainThreadError) {
    console.error("Failed to configure PDF.js for main thread mode:", mainThreadError);
    throw new Error("Could not initialize PDF processing. The browser may not support PDF.js in this environment.");
  }
}
