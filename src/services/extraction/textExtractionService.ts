
import { fetchAndExtractPdfServerSide } from "./serverPdfService";
import { extractPdfWithProxy } from "./pdfExtractionService";

export interface TextExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
  forceTextMode?: boolean;
  disableBinaryOutput?: boolean;
  strictTextCleaning?: boolean;
  useAdvancedExtraction?: boolean;
  useTextPatternExtraction?: boolean;
}

export class TextExtractionService {
  async extractFromUrl(
    documentUrl: string,
    documentTitle: string,
    options?: TextExtractionOptions,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    const extractedText = await fetchAndExtractPdfServerSide(
      documentUrl,
      documentTitle,
      options,
      progressCallback
    );

    // Validate that we got actual content and not error messages
    this.validateExtractedContent(extractedText, documentTitle);
    
    return extractedText;
  }

  async extractFromBase64(
    base64Data: string,
    options?: TextExtractionOptions,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    const extractedText = await extractPdfWithProxy(base64Data, options, progressCallback);
    
    // Validate that we got actual content and not error messages
    this.validateExtractedContent(extractedText, 'base64 document');
    
    return extractedText;
  }

  private validateExtractedContent(content: string, documentTitle: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error(`No content extracted from ${documentTitle}`);
    }

    // Check for error messages in the content
    const errorIndicators = [
      'Unable to extract text',
      'Server-side error',
      'Cannot connect to PDF processing',
      'PDF processing failed',
      'Service temporarily unavailable',
      'Network connectivity issues'
    ];

    for (const indicator of errorIndicators) {
      if (content.includes(indicator)) {
        throw new Error(`PDF extraction failed for ${documentTitle}: Content contains error message - ${indicator}`);
      }
    }

    // Check if content is suspiciously short (likely an error message)
    if (content.trim().length < 50) {
      console.warn(`Extracted content from ${documentTitle} is very short (${content.length} chars), might be an error`);
    }

    console.log(`Content validation passed for ${documentTitle}: ${content.length} characters extracted`);
  }
}
