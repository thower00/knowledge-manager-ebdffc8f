
// Configuration options for PDF extraction
export interface PdfExtractionOptions {
  loadingTimeout?: number;    // Timeout for PDF loading in milliseconds
  pageTimeout?: number;       // Timeout for page text extraction in milliseconds
  maxConcurrentPages?: number; // Maximum pages to process concurrently
}

// Default extraction options
export const DEFAULT_EXTRACTION_OPTIONS: PdfExtractionOptions = {
  loadingTimeout: 45000,    // 45 seconds
  pageTimeout: 20000,       // 20 seconds
  maxConcurrentPages: 3     // Process up to 3 pages concurrently
};
