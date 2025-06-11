
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

export const initializePdfWorker = (): void => {
  if (workerInitialized) {
    console.log('PDF worker already initialized');
    return;
  }

  try {
    // Set the worker source for PDF.js - use version 5.2.133 to match the installed package
    if (typeof window !== 'undefined') {
      // Use the CDN version that matches our installed PDF.js version
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.mjs';
    }
    
    workerInitialized = true;
    console.log('PDF worker initialized successfully with version 5.2.133');
  } catch (error) {
    console.error('Failed to initialize PDF worker:', error);
    throw new Error(`PDF worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const isPdfWorkerInitialized = (): boolean => {
  return workerInitialized;
};
