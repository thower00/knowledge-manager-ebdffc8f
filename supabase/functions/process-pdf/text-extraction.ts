
// Legacy text extraction functions - kept for backward compatibility
// The main extraction is now handled by PDF.js in index.ts

// Helper function to check if data looks like a PDF
export function isPdfData(data: string): boolean {
  return data.startsWith('%PDF-');
}

// Extract basic PDF metadata
export function extractPdfMetadata(pdfBytes: string) {
  const pageCount = (pdfBytes.match(/\/Type\s*\/Page\b/g) || []).length;
  return {
    pageCount: Math.max(pageCount, 1)
  };
}

// Legacy function - now redirects to PDF.js extraction
export async function extractTextWithTimeout(pdfBytes: string, timeoutMs: number = 25000): Promise<string> {
  return "This function is deprecated. PDF extraction is now handled by PDF.js in the main index.ts file.";
}

// Backward compatibility exports
export function cleanAndNormalizeText(text: string): string {
  if (!text) return '';
  
  // Basic cleanup for already extracted text
  let cleaned = text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  return cleaned;
}

export function extractTextByLineBreaks(text: string): string {
  return text;
}

export function extractTextPatterns(text: string): string {
  return text;
}

export function extractTextFromParentheses(text: string): string {
  return text;
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
