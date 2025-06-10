
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
    return await fetchAndExtractPdfServerSide(
      documentUrl,
      documentTitle,
      options,
      progressCallback
    );
  }

  async extractFromBase64(
    base64Data: string,
    options?: TextExtractionOptions,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    return await extractPdfWithProxy(base64Data, options, progressCallback);
  }
}
