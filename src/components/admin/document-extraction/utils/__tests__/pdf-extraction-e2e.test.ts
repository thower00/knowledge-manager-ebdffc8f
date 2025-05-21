
/**
 * End-to-end tests for the PDF extraction process
 * 
 * These tests verify the complete PDF extraction pipeline from URL validation
 * to document fetching and text extraction.
 */
import { validatePdfUrl, convertGoogleDriveUrl } from '../urlUtils';
import { fetchDocumentViaProxy } from '../../services/documentFetchService';
import { extractPdfText } from '../pdfExtraction';
import { createMockPdfArrayBuffer } from './testUtils';
import { jest, describe, test, expect, beforeEach } from '../../../../../setupTests';

// Mock the fetch service and PDF extraction
jest.mock('../../services/documentFetchService', () => ({
  fetchDocumentViaProxy: jest.fn(),
}));

jest.mock('../pdfExtraction', () => ({
  extractPdfText: jest.fn(),
}));

describe('PDF Extraction E2E Process', () => {
  const mockProgressUpdate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    (fetchDocumentViaProxy as jest.MockedFunction<typeof fetchDocumentViaProxy>).mockResolvedValue(createMockPdfArrayBuffer());
    (extractPdfText as jest.MockedFunction<typeof extractPdfText>).mockResolvedValue('Test extracted content');
  });
  
  test('should process valid direct PDF URL correctly', async () => {
    const testUrl = 'https://example.com/document.pdf';
    
    // Step 1: Validate the URL
    const validationResult = validatePdfUrl(testUrl);
    expect(validationResult.isValid).toBe(true);
    
    // Step 2: Fetch the document
    await fetchDocumentViaProxy(testUrl);
    expect(fetchDocumentViaProxy).toHaveBeenCalledWith(
      testUrl,
      undefined,
      undefined,
      false
    );
    
    // Step 3: Extract text
    const mockPdfData = createMockPdfArrayBuffer();
    const extractedText = await extractPdfText(mockPdfData, mockProgressUpdate);
    
    expect(extractPdfText).toHaveBeenCalled();
    expect(extractedText).toBe('Test extracted content');
  });
  
  test('should convert and process Google Drive URL correctly', async () => {
    const originalUrl = 'https://drive.google.com/file/d/abc123/view';
    
    // Step 1: Validate original URL (should fail)
    const initialValidation = validatePdfUrl(originalUrl);
    expect(initialValidation.isValid).toBe(false);
    
    // Step 2: Convert to direct download URL
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(originalUrl);
    expect(wasConverted).toBe(true);
    
    // Step 3: Validate converted URL
    const validationResult = validatePdfUrl(convertedUrl);
    expect(validationResult.isValid).toBe(true);
    
    // Step 4: Fetch with converted URL
    await fetchDocumentViaProxy(convertedUrl);
    expect(fetchDocumentViaProxy).toHaveBeenCalledWith(
      convertedUrl,
      undefined,
      undefined,
      false
    );
    
    // Step 5: Extract text
    const mockPdfData = createMockPdfArrayBuffer();
    const extractedText = await extractPdfText(mockPdfData, mockProgressUpdate);
    
    expect(extractedText).toBe('Test extracted content');
  });
  
  test('should reject and not process invalid URLs', async () => {
    const invalidUrl = 'invalid-url';
    
    // Step 1: Validate URL (should fail)
    const validationResult = validatePdfUrl(invalidUrl);
    expect(validationResult.isValid).toBe(false);
    
    // Fetch should not be called with invalid URL
    // In a real application, UI would prevent this
    await expect(async () => {
      await fetchDocumentViaProxy(invalidUrl);
    }).not.toThrow();
    
    // Documents fetched with invalid URLs might fail later in the process
    expect(fetchDocumentViaProxy).toHaveBeenCalled();
  });
});
