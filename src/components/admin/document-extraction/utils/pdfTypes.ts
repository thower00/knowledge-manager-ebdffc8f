
// Configuration options for PDF extraction
export interface PdfExtractionOptions {
  loadingTimeout?: number;      // Timeout for PDF loading in milliseconds
  pageTimeout?: number;         // Timeout for page text extraction in milliseconds
  maxConcurrentPages?: number;  // Maximum pages to process concurrently
  maxPages?: number;            // Maximum pages to process (0 = all pages)
  streamPages?: boolean;        // Whether to stream pages as they complete
  abortSignal?: AbortSignal;    // Signal to abort extraction
}

// Default extraction options
export const DEFAULT_EXTRACTION_OPTIONS: PdfExtractionOptions = {
  loadingTimeout: 45000,    // 45 seconds
  pageTimeout: 20000,       // 20 seconds
  maxConcurrentPages: 3,    // Process up to 3 pages concurrently
  maxPages: 0,              // No limit by default
  streamPages: false        // Don't stream by default
};

// Page extraction result
export interface PageExtractionResult {
  pageNumber: number;
  text: string;
  error?: string;
}

// PDF metadata
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}
