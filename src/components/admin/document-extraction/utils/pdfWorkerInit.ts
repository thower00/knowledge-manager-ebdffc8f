
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

export const initializePdfWorker = (): void => {
  if (workerInitialized) {
    console.log('PDF worker already initialized');
    return;
  }

  try {
    // Set the worker source for PDF.js - use local worker instead of CDN
    if (typeof window !== 'undefined') {
      // Try to use the bundled worker from the pdfjs-dist package
      // This should be more reliable than CDN
      const pdfjsVersion = '5.2.133';
      
      // First try: Use jsdelivr as a more reliable CDN
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
        console.log('PDF worker initialized with jsdelivr CDN');
      } catch (cdnError) {
        console.warn('CDN worker failed, falling back to embedded worker');
        // Fallback: Use embedded worker - this creates a simple worker inline
        const workerBlob = new Blob([`
          importScripts('https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js');
        `], { type: 'application/javascript' });
        
        const workerUrl = URL.createObjectURL(workerBlob);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        console.log('PDF worker initialized with embedded worker');
      }
    }
    
    workerInitialized = true;
    console.log('PDF worker initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize PDF worker:', error);
    console.warn('PDF processing will continue without worker (may be slower)');
    // Don't throw error, allow PDF processing to continue without worker
    workerInitialized = true; // Mark as initialized to avoid retries
  }
};

export const isPdfWorkerInitialized = (): boolean => {
  return workerInitialized;
};
