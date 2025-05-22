
// This file serves as the main export point for all PDF utilities
// to maintain backward compatibility with code that imports from this file

import { extractPdfText, extractPdfFirstPages, extractPdfTextProgressively } from './pdfExtraction';
import { isPdfBuffer } from './pdfValidation';
import { initPdfWorker } from './pdfWorkerInit';
import { 
  PdfExtractionOptions, 
  DEFAULT_EXTRACTION_OPTIONS, 
  PdfMetadata, 
  PageExtractionResult,
  PageProcessingCallback,
  PageProcessingEvent
} from './pdfTypes';

// Re-export all PDF utility functions and types
export {
  extractPdfText,
  extractPdfFirstPages,
  extractPdfTextProgressively,
  isPdfBuffer,
  initPdfWorker,
  DEFAULT_EXTRACTION_OPTIONS
};

export type {
  PdfExtractionOptions,
  PdfMetadata,
  PageExtractionResult,
  PageProcessingCallback,
  PageProcessingEvent
};
