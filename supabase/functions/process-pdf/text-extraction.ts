
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

// Extract text with timeout protection
export async function extractTextWithTimeout(pdfBytes: string, timeoutMs: number = 25000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Text extraction timed out'));
    }, timeoutMs);

    try {
      const text = extractTextFromPdfBytes(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main text extraction function
function extractTextFromPdfBytes(pdfBytes: string): string {
  let text = '';
  
  // Look for text objects in the PDF
  const textMatches = pdfBytes.match(/\((.*?)\)\s*Tj/g);
  if (textMatches) {
    for (const match of textMatches) {
      const content = match.match(/\((.*?)\)/)?.[1];
      if (content) {
        text += content + ' ';
      }
    }
  }
  
  // Look for alternative text patterns
  const altTextMatches = pdfBytes.match(/\[(.*?)\]\s*TJ/g);
  if (altTextMatches) {
    for (const match of altTextMatches) {
      const content = match.match(/\[(.*?)\]/)?.[1];
      if (content) {
        // Remove escape characters and formatting
        const cleanContent = content.replace(/\\[nrt]/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        text += cleanContent + ' ';
      }
    }
  }
  
  return text.trim();
}

// Clean and normalize extracted text
export function cleanAndNormalizeText(text: string): string {
  return text
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF\u2000-\u206F]/g, ' ')
    .replace(/\uFFFD/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract text by looking for line breaks
export function extractTextByLineBreaks(pdfBytes: string): string {
  const lines = pdfBytes.split(/[\r\n]+/);
  let text = '';
  
  for (const line of lines) {
    // Look for text patterns in each line
    const textMatch = line.match(/\((.*?)\)/);
    if (textMatch && textMatch[1]) {
      text += textMatch[1] + '\n';
    }
  }
  
  return cleanAndNormalizeText(text);
}

// Extract text using pattern matching
export function extractTextPatterns(pdfBytes: string): string {
  let text = '';
  
  // Pattern 1: Look for BT...ET blocks (text blocks)
  const textBlocks = pdfBytes.match(/BT\s+(.*?)\s+ET/gs);
  if (textBlocks) {
    for (const block of textBlocks) {
      const textMatches = block.match(/\((.*?)\)\s*Tj/g);
      if (textMatches) {
        for (const match of textMatches) {
          const content = match.match(/\((.*?)\)/)?.[1];
          if (content) {
            text += content + ' ';
          }
        }
      }
    }
  }
  
  return cleanAndNormalizeText(text);
}

// Extract text from parentheses patterns
export function extractTextFromParentheses(pdfBytes: string): string {
  const parenthesesMatches = pdfBytes.match(/\([^)]+\)/g);
  if (!parenthesesMatches) return '';
  
  let text = '';
  for (const match of parenthesesMatches) {
    const content = match.slice(1, -1); // Remove parentheses
    if (content.length > 2 && /[a-zA-Z]/.test(content)) {
      text += content + ' ';
    }
  }
  
  return cleanAndNormalizeText(text);
}

// Check if text contains binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  // Check for high ratio of non-printable characters
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\x9F]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  
  return ratio > 0.1 || text.includes('\uFFFD');
}
