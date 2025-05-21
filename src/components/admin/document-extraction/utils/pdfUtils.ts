
// This file now serves as the main export point for all PDF utilities
// to maintain backward compatibility with code that imports from this file

import { extractPdfText } from './pdfExtraction';
import { isPdfBuffer } from './pdfValidation';
import { initPdfWorker } from './pdfWorkerInit';
import { PdfExtractionOptions, DEFAULT_EXTRACTION_OPTIONS } from './pdfTypes';

// Re-export all PDF utility functions and types
export {
  extractPdfText,
  isPdfBuffer,
  initPdfWorker,
  DEFAULT_EXTRACTION_OPTIONS
};

export type {
  PdfExtractionOptions
};
