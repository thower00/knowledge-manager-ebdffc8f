
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

export const initializePdfWorker = (): void => {
  if (workerInitialized) {
    console.log('PDF worker already initialized');
    return;
  }

  try {
    // Set the worker source for PDF.js
    if (typeof window !== 'undefined') {
      // Use the CDN version of the worker for web environments
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
    }
    
    workerInitialized = true;
    console.log('PDF worker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize PDF worker:', error);
    throw new Error(`PDF worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const isPdfWorkerInitialized = (): boolean => {
  return workerInitialized;
};
