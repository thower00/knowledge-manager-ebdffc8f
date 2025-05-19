
import * as pdfjsLib from "pdfjs-dist";

// Instead of using external CDN, we'll create a local worker
const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
    { type: "module" }
  );
} else {
  // Fallback for environments where Workers are not available
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Checks if the provided data is a valid PDF by checking signature bytes
 * @param pdfData ArrayBuffer containing PDF data
 * @returns Error message if invalid or null if valid
 */
const validatePdfSignature = (pdfData: ArrayBuffer): Error | null => {
  const firstBytes = new Uint8Array(pdfData.slice(0, 5));
  const isPdfSignature = firstBytes[0] === 0x25 && // %
                         firstBytes[1] === 0x50 && // P
                         firstBytes[2] === 0x44 && // D
                         firstBytes[3] === 0x46 && // F
                         firstBytes[4] === 0x2D;   // -
  
  if (!isPdfSignature) {
    // First few bytes of the response as text for debugging
    const decoder = new TextDecoder();
    const textStart = decoder.decode(pdfData.slice(0, 100));
    return new Error(`Response is not a valid PDF. Content starts with: ${textStart.substring(0, 30)}...`);
  }
  
  return null;
};

/**
 * Loads a PDF document using pdf.js
 * @param pdfData ArrayBuffer containing PDF data
 * @param onProgressUpdate Progress callback function
 * @returns Loaded PDF document
 */
const loadPdfDocument = async (
  pdfData: ArrayBuffer, 
  onProgressUpdate: (progress: number) => void
): Promise<pdfjsLib.PDFDocumentProxy> => {
  onProgressUpdate(40);
  return await pdfjsLib.getDocument({ data: pdfData }).promise;
};

/**
 * Extracts text from a single PDF page
 * @param page PDF page to extract text from
 * @param pageNumber Page number for labeling
 * @returns Extracted text with page header
 */
const extractTextFromPage = async (
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number
): Promise<string> => {
  const textContent = await page.getTextContent();
  const pageText = textContent.items
    .map((item: any) => item.str)
    .join(' ');
  
  return `--- Page ${pageNumber} ---\n${pageText}\n`;
};

/**
 * Extract text from all pages of a PDF document
 * @param pdf PDF document to extract text from
 * @param onProgressUpdate Progress callback function
 * @returns Array of page texts
 */
const extractAllPageTexts = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgressUpdate: (progress: number) => void
): Promise<string[]> => {
  const totalPages = pdf.numPages;
  let pageTexts: string[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    onProgressUpdate(40 + Math.floor((i / totalPages) * 50));
    
    const page = await pdf.getPage(i);
    const pageText = await extractTextFromPage(page, i);
    pageTexts.push(pageText);
  }
  
  return pageTexts;
};

/**
 * Main function to extract text from a PDF document
 * @param pdfData ArrayBuffer containing PDF data
 * @param onProgressUpdate Progress callback function
 * @returns Extracted text content
 */
export const extractPdfText = async (
  pdfData: ArrayBuffer, 
  onProgressUpdate: (progress: number) => void
): Promise<string> => {
  // Validate PDF signature
  const validationError = validatePdfSignature(pdfData);
  if (validationError) {
    throw validationError;
  }
  
  // Load the PDF using pdf.js
  const pdf = await loadPdfDocument(pdfData, onProgressUpdate);
  
  let extractedContent = `PDF document loaded. Total pages: ${pdf.numPages}\n\n`;
  
  // Extract text from each page
  const pageTexts = await extractAllPageTexts(pdf, onProgressUpdate);
  extractedContent += pageTexts.join('\n');
  
  onProgressUpdate(95);
  
  return extractedContent;
};
